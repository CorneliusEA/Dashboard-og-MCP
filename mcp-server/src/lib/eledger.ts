/**
 * ES Field App / E-Ledger client — READ-ONLY access to the field-data
 * Supabase project (EU, Frankfurt). Supabase is the only source of truth
 * for field data; this server never writes to it, never uses the
 * service_role key, and never reads `profiles` (no emails/names —
 * `recorded_by` initials are the only person identifier returned).
 *
 * Auth: password login with the app's integration account (role
 * `integracion`: can read everything, write nothing). The access token
 * (~1h) is cached per process and renewed via refresh_token shortly
 * before expiry; a 401 from the REST API forces one re-auth + retry.
 *
 * Data model gotchas (from the E-Ledger migrations):
 *   - `farm_id` / `parcel_id` are only unique PER USER. Every farm is
 *     therefore identified by (user_id, farm_id). We expose that as an
 *     opaque `farm_key` = "<8 hex of sha256(user_id)>:<farm_id>" so the
 *     raw user_id never leaves the server.
 *   - Corrected records keep the old version with data.superseded_by set;
 *     every query on `records` filters `data->>superseded_by=is.null`.
 *     The v_* views already only count current versions.
 *   - The v_* views have no user_id column, so rows are tied back to a
 *     user via `records.id` (view.id = records.id) before filtering or
 *     grouping per farm.
 *   - Parcel geometry is stored as [lat, lon] pairs; GeoJSON wants
 *     [lon, lat] and a closed ring.
 */
import { createHash } from 'node:crypto'

export const PAGE_SIZE = 1000 // Supabase/PostgREST max rows per request
const ID_CHUNK = 100 // ids per `id=in.(...)` lookup, keeps URLs well under limits
const REFRESH_MARGIN_MS = 60_000

export class EledgerError extends Error {}

interface Config {
  url: string
  anonKey: string
  email: string
  password: string
}

function config(): Config {
  const env = {
    url: process.env.ELEDGER_SUPABASE_URL,
    anonKey: process.env.ELEDGER_SUPABASE_ANON_KEY,
    email: process.env.ELEDGER_SUPABASE_EMAIL,
    password: process.env.ELEDGER_SUPABASE_PASSWORD,
  }
  const missing = Object.entries({
    ELEDGER_SUPABASE_URL: env.url,
    ELEDGER_SUPABASE_ANON_KEY: env.anonKey,
    ELEDGER_SUPABASE_EMAIL: env.email,
    ELEDGER_SUPABASE_PASSWORD: env.password,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k)
  if (missing.length) throw new EledgerError(`E-Ledger not configured: missing ${missing.join(', ')}`)
  return { ...(env as Config), url: env.url!.replace(/\/+$/, '') }
}

// ---------------------------------------------------------------- auth

interface Session {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

let session: Session | null = null
let pending: Promise<Session> | null = null

/** Test hook: forget the cached session. */
export function resetEledgerSession() {
  session = null
  pending = null
}

async function tokenRequest(cfg: Config, grant: 'password' | 'refresh_token', body: object): Promise<Session> {
  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST',
    headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const j = (await res.json()) as { error_description?: string; msg?: string; error?: string }
      detail = j.error_description ?? j.msg ?? j.error ?? ''
    } catch {
      /* ignore */
    }
    throw new EledgerError(`E-Ledger login failed (${grant}, HTTP ${res.status})${detail ? `: ${detail}` : ''}`)
  }
  const j = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number }
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000,
  }
}

async function getToken(cfg: Config, force = false): Promise<string> {
  if (!force && session && session.expiresAt - REFRESH_MARGIN_MS > Date.now()) return session.accessToken
  if (!pending) {
    const previous = session
    pending = (async () => {
      if (previous?.refreshToken) {
        try {
          return await tokenRequest(cfg, 'refresh_token', { refresh_token: previous.refreshToken })
        } catch {
          // refresh token expired/revoked — fall through to a fresh password login
        }
      }
      return tokenRequest(cfg, 'password', { email: cfg.email, password: cfg.password })
    })()
      .then((s) => (session = s))
      .finally(() => (pending = null))
  }
  return (await pending).accessToken
}

async function authedFetch(cfg: Config, url: string, init: RequestInit = {}): Promise<Response> {
  const send = async (token: string) =>
    fetch(url, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string>),
        apikey: cfg.anonKey,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })
  let res = await send(await getToken(cfg))
  if (res.status === 401) res = await send(await getToken(cfg, true))
  if (!res.ok) {
    let detail = ''
    try {
      const j = (await res.json()) as { message?: string; error?: string }
      detail = j.message ?? j.error ?? ''
    } catch {
      /* ignore */
    }
    throw new EledgerError(`E-Ledger request failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}`)
  }
  return res
}

// ---------------------------------------------------------------- REST

/** Query params; an array value repeats the param (PostgREST ANDs repeated column filters). */
export type Params = Record<string, string | string[] | undefined>

export interface SelectResult<T> {
  rows: T[]
  truncated: boolean
}

/**
 * Paginated GET on a table/view. Fetches at most `maxRows` rows (pages of
 * ≤1000) and reports `truncated` when more rows exist.
 */
export async function select<T>(table: string, params: Params, maxRows: number): Promise<SelectResult<T>> {
  const cfg = config()
  const rows: T[] = []
  const target = maxRows + 1 // one extra row tells us whether we truncated
  let offset = 0
  while (rows.length < target) {
    const pageSize = Math.min(PAGE_SIZE, target - rows.length)
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue
      for (const item of Array.isArray(v) ? v : [v]) qs.append(k, item)
    }
    qs.set('limit', String(pageSize))
    qs.set('offset', String(offset))
    const res = await authedFetch(cfg, `${cfg.url}/rest/v1/${table}?${qs}`)
    const page = (await res.json()) as T[]
    rows.push(...page)
    offset += page.length
    if (page.length < pageSize) break
  }
  return { rows: rows.slice(0, maxRows), truncated: rows.length > maxRows }
}

/** Filter that keeps only current (non-corrected) versions in `records`. */
export const CURRENT: Params = { 'data->>superseded_by': 'is.null' }

export function dateRange(from?: string, to?: string): string[] | undefined {
  const f: string[] = []
  if (from) f.push(`gte.${from}`)
  if (to) f.push(`lte.${to}`)
  return f.length ? f : undefined
}

/** PostgREST `in.(...)` list with each value double-quoted (safe for ids containing commas). */
function inList(values: string[]): string {
  return `in.(${values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`
}

/** Map record id → user_id for the given ids (via `records`, which has user_id). */
export async function userIdsForRecords(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const unique = [...new Set(ids)]
  for (let i = 0; i < unique.length; i += ID_CHUNK) {
    const chunk = unique.slice(i, i + ID_CHUNK)
    const { rows } = await select<{ id: string; user_id: string }>(
      'records',
      { select: 'id,user_id', id: inList(chunk) },
      chunk.length,
    )
    for (const r of rows) out.set(r.id, r.user_id)
  }
  return out
}

// ---------------------------------------------------------------- farms

export function userHash(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').slice(0, 8)
}

export function farmKey(userId: string, farmId: string): string {
  return `${userHash(userId)}:${farmId}`
}

export interface ResolvedFarm {
  userId: string
  farmId: string
  farmKey: string
}

/**
 * Resolve a farm reference — either a `farm_key` ("ab12cd34:F008") or a
 * bare farm_id ("F008") — to the owning (user_id, farm_id). A bare
 * farm_id that exists for several users is rejected with the candidate
 * farm_keys, never silently merged.
 */
export async function resolveFarm(ref: string): Promise<ResolvedFarm> {
  const sep = ref.indexOf(':')
  const hash = sep === 8 && /^[0-9a-f]{8}$/.test(ref.slice(0, 8)) ? ref.slice(0, 8) : null
  const farmId = hash ? ref.slice(9) : ref
  if (!farmId) throw new EledgerError(`Invalid farm reference "${ref}"`)

  // Prefer finca master records; fall back to any record carrying the farm_id.
  let { rows } = await select<{ user_id: string; name: string | null }>(
    'records',
    { select: 'user_id,name:data->>name', farm_id: `eq.${farmId}`, modulo: 'eq.finca', ...CURRENT },
    PAGE_SIZE,
  )
  if (!rows.length) {
    ;({ rows } = await select<{ user_id: string; name: string | null }>(
      'records',
      { select: 'user_id', farm_id: `eq.${farmId}`, ...CURRENT },
      PAGE_SIZE,
    ))
  }
  const owners = new Map<string, string | null>()
  for (const r of rows) if (!owners.has(r.user_id) || !owners.get(r.user_id)) owners.set(r.user_id, r.name ?? null)

  const candidates = [...owners.keys()].filter((u) => !hash || userHash(u) === hash)
  if (!candidates.length) throw new EledgerError(`No farm found for "${ref}"`)
  if (candidates.length > 1) {
    const list = candidates.map((u) => `${farmKey(u, farmId)}${owners.get(u) ? ` (${owners.get(u)})` : ''}`)
    throw new EledgerError(
      `farm_id "${farmId}" exists for ${candidates.length} different users — pass one of these farm_keys instead: ${list.join(', ')}`,
    )
  }
  const userId = candidates[0]
  return { userId, farmId, farmKey: farmKey(userId, farmId) }
}

// ---------------------------------------------------------------- geometry

export type LatLon = [number, number]

export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: [number, number][][]
}

/** E-Ledger stores parcels as [lat, lon]; GeoJSON needs a closed ring of [lon, lat]. */
export function parcelGeometryToGeoJSON(geometry: unknown): GeoJSONPolygon | null {
  if (!Array.isArray(geometry)) return null
  const ring: [number, number][] = []
  for (const p of geometry) {
    if (!Array.isArray(p) || p.length < 2) return null
    const lat = Number(p[0])
    const lon = Number(p[1])
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
    ring.push([lon, lat])
  }
  if (ring.length < 3) return null
  const [first, last] = [ring[0], ring[ring.length - 1]]
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]])
  if (ring.length < 4) return null
  return { type: 'Polygon', coordinates: [ring] }
}

// ---------------------------------------------------------------- photos

const PHOTO_BUCKET = 'photos'

export async function signPhotoUrl(photoPath: string, expiresIn = 3600): Promise<string> {
  const cfg = config()
  const encoded = photoPath
    .split('/')
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join('/')
  const res = await authedFetch(cfg, `${cfg.url}/storage/v1/object/sign/${PHOTO_BUCKET}/${encoded}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn }),
  })
  const j = (await res.json()) as { signedURL?: string; signedUrl?: string }
  const signed = j.signedURL ?? j.signedUrl
  if (!signed) throw new EledgerError('E-Ledger storage did not return a signed URL')
  return signed.startsWith('http') ? signed : `${cfg.url}/storage/v1${signed.startsWith('/') ? '' : '/'}${signed}`
}

// ---------------------------------------------------------------- helpers

/** Drop null/undefined/empty-array fields to keep tool output compact. */
export function compact<T extends Record<string, unknown>>(row: T): Partial<T> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue
    out[k] = v
  }
  return out as Partial<T>
}

export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function round(n: number, digits = 3): number {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

const SUMMARY_SKIP = new Set([
  'geometry',
  'superseded_by',
  'supersedes',
  'photo',
  'photos',
  'media',
  'signature',
  'icon',
  // already returned as top-level record columns
  'id',
  'gps',
  'lat',
  'lon',
  'date',
  'modulo',
  'farm_id',
  'farmId',
  'parcel_id',
  'parcelId',
  'sector',
  'earth_bric_id',
  'kg_co2e',
  'recorded_by',
])
// Never surface personal data that may sit inside a record's jsonb.
const PERSONAL_KEY =
  /e-?mail|phone|tel[eé]fono|movil|m[oó]vil|user|author|owner|propietari|responsable|t[eé]cnico|firma|dni|c[eé]dula|passport|pasaporte/i
const EMAIL_VALUE = /[^\s@]+@[^\s@]+\.[^\s@]+/

/** Short human-readable digest of a record's `data` jsonb: scalar fields only, truncated. */
export function summarizeData(data: unknown, maxFields = 8): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  if (!data || typeof data !== 'object' || Array.isArray(data)) return out
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (Object.keys(out).length >= maxFields) break
    if (SUMMARY_SKIP.has(k) || PERSONAL_KEY.test(k) || /photo|image|base64|sha256|_path$|_at$/i.test(k)) continue
    if (typeof v === 'number' || typeof v === 'boolean') out[k] = v
    else if (typeof v === 'string' && v.trim()) {
      if (v.startsWith('data:') || EMAIL_VALUE.test(v)) continue
      out[k] = v.length > 80 ? `${v.slice(0, 77)}...` : v
    }
  }
  return out
}

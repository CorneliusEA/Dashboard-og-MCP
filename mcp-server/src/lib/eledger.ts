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
 *   - Farms and plots are shared rows in `farms` / `parcels` (uuid ids, one
 *     per real farm/plot since app v9.6 dedupe); records point to them via
 *     `records.farm_uuid` / `parcel_uuid`. The phone's own `farm_id` /
 *     `parcel_id` are only unique PER USER and are only used to attribute
 *     old records without farm_uuid (via legacy_map). See FarmIndex.
 *   - Corrected records keep the old version with data.superseded_by set;
 *     every query on `records` filters `data->>superseded_by=is.null`.
 *     The v_* views already only count current versions.
 *   - The v_* views have no user_id / farm_uuid, so rows are tied back to a
 *     farm via `records.id` (view.id = records.id).
 *   - Parcel geometry is stored as [lat, lon]; `v_parcels_geojson` returns
 *     GeoJSON [lon, lat] with a closed ring.
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

/** A value quoted for PostgREST `in.(...)` lists and `or=(...)` logic trees (safe for commas, dots, parens). */
function q(v: string): string {
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function inList(values: string[]): string {
  return `in.(${values.map(q).join(',')})`
}

export interface RecordRef {
  id: string
  user_id: string | null
  farm_id: string | null
  farm_uuid: string | null
  parcel_id: string | null
  parcel_uuid: string | null
}

/** Farm/parcel references for the given record ids (the v_* views have neither user_id nor farm_uuid). */
export async function recordRefs(ids: string[]): Promise<Map<string, RecordRef>> {
  const out = new Map<string, RecordRef>()
  const unique = [...new Set(ids)]
  for (let i = 0; i < unique.length; i += ID_CHUNK) {
    const chunk = unique.slice(i, i + ID_CHUNK)
    const { rows } = await select<RecordRef>(
      'records',
      { select: 'id,user_id,farm_id,farm_uuid,parcel_id,parcel_uuid', id: inList(chunk) },
      chunk.length,
    )
    for (const r of rows) out.set(r.id, r)
  }
  return out
}

// ---------------------------------------------------------------- shared farms (app v9.5+/v9.6)
//
// Since app v9.5 the server keeps ONE row per real farm/plot in `farms` / `parcels` (uuid ids), and every record
// points to it via records.farm_uuid / parcel_uuid. Duplicates (one copy per phone) are merged by the app team's
// dedupe_96(): the copy gets merged_into + deleted_at, and its records/plots move to the kept row.
// Older records may still lack farm_uuid; they are attributed through legacy_map ((user, phone farm number) →
// farm uuid). Raw user_ids are never returned by any tool.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (s: string) => UUID_RE.test(s)

/** Only used to accept the old `farm_key` ("ab12cd34:F008") references from before v9.6. */
export function userHash(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').slice(0, 8)
}

export interface FarmRow {
  id: string
  org_id: string | null
  name: string | null
  country: string | null
  region: string | null
  sector: string | null
  type: string | null
  merged_into: string | null
  deleted_at: string | null
}

export class FarmIndex {
  constructor(
    readonly farms: Map<string, FarmRow>,
    /** `${user_id}|${phone farm_id}` → farm uuid */
    readonly pairs: Map<string, string>,
  ) {}

  static pairKey(userId: string, farmId: string) {
    return `${userId}|${farmId}`
  }

  /** Follow merged_into to the farm a (possibly merged) id became. */
  final(id: string | null | undefined): string | null {
    if (!id) return null
    let cur = id
    for (let i = 0; i < 10; i++) {
      const next = this.farms.get(cur)?.merged_into
      if (!next) return cur
      cur = next
    }
    return cur
  }

  /** The shared farm a record belongs to, or null when it can't be attributed. */
  farmOf(r: { farm_uuid?: string | null; user_id?: string | null; farm_id?: string | null }): string | null {
    if (r.farm_uuid) return this.final(r.farm_uuid)
    if (r.user_id && r.farm_id) {
      const t = this.pairs.get(FarmIndex.pairKey(r.user_id, r.farm_id))
      if (t) return this.final(t)
    }
    if (r.farm_id && this.farms.has(r.farm_id)) return this.final(r.farm_id)
    return null
  }

  name(id: string | null): string | null {
    return id ? (this.farms.get(id)?.name ?? null) : null
  }

  active(): FarmRow[] {
    return [...this.farms.values()].filter((f) => !f.deleted_at && !f.merged_into)
  }

  /** Every farm id (the farm itself + merged copies) that resolves to `target`. */
  members(target: string): string[] {
    const ids = [...this.farms.keys()].filter((id) => this.final(id) === target)
    return ids.includes(target) ? ids : [...ids, target]
  }

  /** PostgREST `or` filter value matching every record of one farm, incl. old records without farm_uuid. */
  recordFilter(target: string): string {
    const ids = this.members(target)
    const parts = [`farm_uuid.${inList(ids)}`, `and(farm_uuid.is.null,farm_id.${inList(ids)})`]
    const pairs = [...this.pairs.entries()].filter(([, t]) => this.final(t) === target).slice(0, 50)
    for (const [k] of pairs) {
      const i = k.indexOf('|')
      parts.push(`and(farm_uuid.is.null,user_id.eq.${q(k.slice(0, i))},farm_id.eq.${q(k.slice(i + 1))})`)
    }
    return `(${parts.join(',')})`
  }
}

const MAX_INDEX_ROWS = 20_000

export async function loadFarmIndex(): Promise<FarmIndex> {
  const farms = await select<FarmRow>(
    'farms',
    { select: 'id,org_id,name,country,region,sector,type:data->>type,merged_into,deleted_at' },
    MAX_INDEX_ROWS,
  )
  const pairs = new Map<string, string>()
  // legacy_map is the app's own (user, phone farm number) → farm uuid table; trust it first.
  try {
    const legacy = await select<{ user_id: string; legacy_id: string; target: string }>(
      'legacy_map',
      { select: 'user_id,legacy_id,target', kind: 'eq.finca' },
      MAX_INDEX_ROWS,
    )
    for (const l of legacy.rows) if (l.user_id && l.legacy_id && l.target) pairs.set(FarmIndex.pairKey(l.user_id, l.legacy_id), l.target)
  } catch {
    // older schema without legacy_map: fall back to what the records themselves say
  }
  // Records that already carry farm_uuid teach the remaining (user, farm_id) pairs; majority wins.
  const recs = await select<{ user_id: string; farm_id: string; farm_uuid: string }>(
    'records',
    { select: 'user_id,farm_id,farm_uuid', farm_uuid: 'not.is.null', farm_id: 'not.is.null', ...CURRENT },
    MAX_INDEX_ROWS,
  )
  const votes = new Map<string, Map<string, number>>()
  for (const r of recs.rows) {
    const k = FarmIndex.pairKey(r.user_id, r.farm_id)
    if (pairs.has(k)) continue
    const v = votes.get(k) ?? new Map<string, number>()
    v.set(r.farm_uuid, (v.get(r.farm_uuid) ?? 0) + 1)
    votes.set(k, v)
  }
  for (const [k, v] of votes) pairs.set(k, [...v.entries()].sort((a, b) => b[1] - a[1])[0][0])
  return new FarmIndex(new Map(farms.rows.map((f) => [f.id, f])), pairs)
}

/**
 * Resolve what a user/model passes as `farm`: a farm id (uuid, merged copies follow merged_into), an exact farm
 * name, or — for references from before v9.6 — a phone farm number ("F008") or old farm_key ("ab12cd34:F008").
 * Anything matching more than one farm is rejected with the candidates, never merged silently.
 */
export function resolveFarmRef(ref: string, index: FarmIndex): { id: string; name: string | null } {
  const r = ref.trim()
  const describe = (id: string) => {
    const f = index.farms.get(id)
    return `${id} (${[f?.name, f?.country, f?.region].filter(Boolean).join(', ') || '?'})`
  }
  if (isUuid(r)) {
    if (!index.farms.has(r)) throw new EledgerError(`No farm with id "${r}"`)
    const id = index.final(r)!
    return { id, name: index.name(id) }
  }
  const byName = index.active().filter((f) => (f.name ?? '').trim().toLowerCase() === r.toLowerCase())
  if (byName.length === 1) return { id: byName[0].id, name: byName[0].name }
  if (byName.length > 1)
    throw new EledgerError(
      `${byName.length} farms are named "${r}" (duplicates not merged yet?) — pass one farm id: ${byName.map((f) => describe(f.id)).join('; ')}`,
    )
  const m = r.match(/^([0-9a-f]{8}):(.+)$/)
  const farmId = m ? m[2] : r
  const targets = new Set<string>()
  for (const [k, t] of index.pairs) {
    const i = k.indexOf('|')
    if (k.slice(i + 1) === farmId && (!m || userHash(k.slice(0, i)) === m[1])) targets.add(index.final(t)!)
  }
  if (targets.size === 1) {
    const id = [...targets][0]
    return { id, name: index.name(id) }
  }
  if (targets.size > 1)
    throw new EledgerError(
      `"${r}" is a phone farm number used by several users — pass one farm id: ${[...targets].map(describe).join('; ')}`,
    )
  throw new EledgerError(`No farm found for "${r}" — use a farm id from eledger_farms`)
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

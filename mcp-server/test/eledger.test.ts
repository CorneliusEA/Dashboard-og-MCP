/**
 * Tests for the E-Ledger tools against an in-memory fake of Supabase
 * (auth + a small PostgREST subset incl. or/and logic trees + storage signing).
 * Data model: app v9.6 shared farms/parcels (farms, parcels, records.farm_uuid,
 * legacy_map). Run: npm test
 */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { registerEledgerTools } from '../src/tools/eledger.js'
import { resetEledgerSession, select, summarizeData, userHash } from '../src/lib/eledger.js'

const URL_ = 'https://fake.supabase.co'
const ANON = 'sb_publishable_test'
const U1 = '11111111-1111-1111-1111-111111111111'
const U2 = '22222222-2222-2222-2222-222222222222'
const U3 = '33333333-3333-3333-3333-333333333333'
// shared farms (uuid ids)
const FA = 'aaaaaaaa-0000-0000-0000-00000000000a' // "Finca Uno" (U1's F008)
const FA_COPY = 'aaaaaaaa-0000-0000-0000-0000000000c0' // merged duplicate of FA
const FB = 'bbbbbbbb-0000-0000-0000-00000000000b' // "Finca Dos" (U2's F008 — same phone number!)
const FC = 'cccccccc-0000-0000-0000-00000000000c' // "Finca Tres" — not merged yet
const FC2 = 'cccccccc-0000-0000-0000-0000000000c2' // "Finca Tres" — its unmerged duplicate
const PA1 = 'aaaaaaaa-1111-0000-0000-000000000001'
const PA_OLD = 'aaaaaaaa-1111-0000-0000-0000000000f0'
const PB1 = 'bbbbbbbb-1111-0000-0000-000000000001'

type Row = Record<string, any>

// ------------------------------------------------------------------ fixtures

function fixtures(): Record<string, Row[]> {
  const rec = (r: Row): Row => ({
    org_id: 'org1',
    recorded_by: 'XX',
    farm_id: null,
    farm_uuid: null,
    parcel_id: null,
    parcel_uuid: null,
    sector: 'cacao',
    date: null,
    lat: null,
    lon: null,
    earth_bric_id: null,
    kg_co2e: null,
    photo_path: null,
    updated_at: '2026-01-01T00:00:00Z',
    data: {},
    ...r,
  })
  const farm = (r: Row): Row => ({ org_id: null, country: 'Guatemala', region: null, sector: 'cacao', data: {}, merged_into: null, deleted_at: null, ...r })
  const ring = [[-82.1, 9.1], [-82.2, 9.1], [-82.2, 9.2], [-82.1, 9.1]]
  return {
    organizations: [{ id: 'org1', name: 'Xoco Gourmet' }],
    farms: [
      farm({ id: FA, org_id: 'org1', name: 'Finca Uno', region: 'Izabal', data: { type: 'individual' } }),
      farm({ id: FA_COPY, name: 'Finca Uno', merged_into: FA, deleted_at: '2026-11-26T00:00:00Z' }),
      farm({ id: FB, name: 'Finca Dos', country: 'Nicaragua' }),
      farm({ id: FC, name: 'Finca Tres' }),
      farm({ id: FC2, name: 'Finca Tres' }),
    ],
    parcels: [
      { id: PA1, farm_id: FA, name: 'Lote Norte', ha_declared: 2.5, deleted_at: null },
      { id: PA_OLD, farm_id: FA_COPY, name: 'Lote Norte (copy)', ha_declared: 2.5, deleted_at: '2026-11-26T00:00:00Z' },
      { id: PB1, farm_id: FB, name: 'Otra', ha_declared: 1, deleted_at: null },
    ],
    // the Supabase view already converts [lat, lon] → closed [lon, lat] rings and hides deleted parcels
    v_parcels_geojson: [
      { id: PA1, farm_id: FA, name: 'Lote Norte', kind: 'normal', ha_declared: 2.5, ha_measured: 2.41, eudr_status: 'free', geojson: { type: 'Polygon', coordinates: [ring] } },
      { id: PB1, farm_id: FB, name: 'Otra', kind: 'ppm', ha_declared: 1, ha_measured: null, eudr_status: 'pending', geojson: null },
    ],
    // (user, phone farm number) → shared farm
    legacy_map: [
      { user_id: U1, kind: 'finca', legacy_id: 'F008', target: FA },
      { user_id: U2, kind: 'finca', legacy_id: 'F008', target: FB },
    ],
    records: [
      rec({ id: 'fin1', user_id: U1, farm_id: 'F008', farm_uuid: FA, modulo: 'finca', data: { name: 'Finca Uno' } }),
      // Emissions; e1-old is a corrected version and must be ignored
      rec({ id: 'e1', user_id: U1, farm_id: 'F008', farm_uuid: FA, parcel_id: 'P1', parcel_uuid: PA1, modulo: 'emision', date: '2026-03-10', kg_co2e: 100, data: { activity: 'fertilizer', responsable: 'Juan Pérez', note: 'contact juan@example.com' } }),
      rec({ id: 'e1-old', user_id: U1, farm_id: 'F008', farm_uuid: FA, parcel_uuid: PA1, modulo: 'emision', date: '2026-03-10', kg_co2e: 999, data: { superseded_by: 'e1' } }),
      // still points at the merged copy → must count for FA
      rec({ id: 'e3', user_id: U1, farm_id: 'F008', farm_uuid: FA_COPY, modulo: 'emision', date: '2026-03-20', kg_co2e: 10 }),
      // U2 uses the same phone farm number F008 for a different farm
      rec({ id: 'e2', user_id: U2, farm_id: 'F008', farm_uuid: FB, parcel_uuid: PB1, modulo: 'emision', date: '2026-04-12', kg_co2e: 50 }),
      // old photo record without farm_uuid → attributed to FA through legacy_map; kg_co2e = 0 is not an emission
      rec({ id: 'ph1', user_id: U1, farm_id: 'F008', modulo: 'foto', date: '2026-04-03', kg_co2e: 0, data: { gps: '9.1, -82.1', lat: 9.1, icon: '🌿', note: 'Test foto', ai_at: '2026-04-03T10:00:00Z' } }),
      rec({ id: 'b1', user_id: U1, farm_id: 'F008', farm_uuid: FA, parcel_uuid: PA1, modulo: 'bio', date: '2026-04-01', photo_path: 'u1/bio 1.jpg' }),
      rec({ id: 'b2', user_id: U2, farm_id: 'F008', farm_uuid: FB, modulo: 'bio', date: '2026-04-02' }),
      rec({ id: 's1', user_id: U1, farm_id: 'F008', farm_uuid: FA, modulo: 'suelo', date: '2026-04-05' }),
      rec({ id: 'l2', user_id: U2, farm_id: 'F008', farm_uuid: FB, modulo: 'lluvia', date: '2026-04-06' }),
      rec({ id: 'eq1', user_id: U1, farm_id: 'F008', farm_uuid: FA, modulo: 'equipo', date: '2026-04-04' }),
      // cannot be attributed to any farm
      rec({ id: 'x1', user_id: U3, farm_id: 'F099', modulo: 'xoco', date: '2026-04-07' }),
    ],
    v_gases: [
      { id: 'e1', farm_id: 'F008', parcel_id: 'P1', date: '2026-03-10', modulo: 'emision', ch4_kg: 1, n2o_kg: 0.1, kg_co2e: 100, gwp_basis: 'AR6' },
      { id: 'e3', farm_id: 'F008', parcel_id: null, date: '2026-03-20', modulo: 'emision', ch4_kg: 0, n2o_kg: 0, kg_co2e: 10, gwp_basis: 'AR6' },
      { id: 'e2', farm_id: 'F008', parcel_id: null, date: '2026-04-12', modulo: 'emision', ch4_kg: 2, n2o_kg: 0, kg_co2e: 50, gwp_basis: 'AR6' },
    ],
    v_emissions: [
      { org_id: 'org1', farm_id: 'F008', sector: 'cacao', month: '2026-03-01', modulo: 'emision', kg_co2e: 110, n: 2 },
      { org_id: 'org1', farm_id: 'F008', sector: 'cacao', month: '2026-04-01', modulo: 'emision', kg_co2e: 50, n: 1 },
      // same org/month/sector/modulo from another farm → must be merged, not listed twice
      { org_id: 'org1', farm_id: 'F009', sector: 'cacao', month: '2026-04-01', modulo: 'emision', kg_co2e: 25, n: 2 },
      { org_id: 'org1', farm_id: 'F008', sector: 'cacao', month: '2026-04-01', modulo: 'foto', kg_co2e: 0, n: 5 },
    ],
    v_observations: [
      { id: 'b1', farm_id: 'F008', parcel_id: 'P1', date: '2026-04-01', lat: 9.1, lon: -82.1, earth_bric_id: null, species: 'Ara macao', grp: 'aves', confidence: 'high', photo_path: 'u1/bio 1.jpg' },
      { id: 'b2', farm_id: 'F008', parcel_id: null, date: '2026-04-02', lat: 12, lon: -86, earth_bric_id: null, species: 'Bradypus variegatus', grp: 'mammalia', confidence: 'medium', photo_path: null },
    ],
    v_species_ai: [
      { id: 'b1', farm_id: 'F008', parcel_id: 'P1', date: '2026-04-01', modulo: 'bio', ai_status: 'done', species_ai: 'Ara macao', score_ai: 0.93, source_ai: 'model', species_used: 'Ara macao', confirmed: true, gbif_status: 'ACCEPTED', gbif_n_50km: 120, photo_path: 'u1/bio 1.jpg' },
    ],
    v_field_measures: [
      { id: 's1', farm_id: 'F008', parcel_id: null, date: '2026-04-05', modulo: 'suelo', soil_texture: 'franco', earthworms_n: 5, media_paths: ['a.jpg', 'b.mp4'], photo_path: null, alert: null },
      { id: 'l2', farm_id: 'F008', parcel_id: null, date: '2026-04-06', modulo: 'lluvia', rain_mm: 12, rain_openmeteo_mm: 10, media_paths: [], photo_path: null, alert: null },
    ],
    profiles: [{ id: U1, email: 'secret@example.com', full_name: 'Secret Person', role: 'integracion' }],
  }
}

// ------------------------------------------------------------------ fake Supabase

interface FakeState {
  db: Record<string, Row[]>
  validTokens: Set<string>
  tokenSeq: number
  expiresIn: number
  failRefresh: boolean
  grants: string[]
  restCalls: { table: string; params: URLSearchParams; auth: string | null }[]
  storageCalls: { path: string; body: any }[]
}

let state: FakeState

function getPath(row: Row, expr: string): any {
  const m = expr.match(/^(\w+)(?:->>?(\w+))?$/)
  if (!m) throw new Error(`fake: unsupported column expr ${expr}`)
  const base = row[m[1]]
  if (!m[2]) return base
  const v = base?.[m[2]]
  if (expr.includes('->>')) return v === undefined || v === null ? null : typeof v === 'object' ? JSON.stringify(v) : String(v)
  return v === undefined ? null : v
}

const unquote = (s: string) => (s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1).replace(/\\(.)/g, '$1') : s)

/** Split on commas at nesting depth 0, respecting "quoted" values. */
function splitTop(s: string): string[] {
  const out: string[] = []
  let depth = 0, inQ = false, cur = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQ) {
      cur += ch
      if (ch === '\\') cur += s[++i]
      else if (ch === '"') inQ = false
      continue
    }
    if (ch === '"') inQ = true
    else if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur) out.push(cur)
  return out
}

function matches(row: Row, col: string, op: string): boolean {
  if (op.startsWith('not.')) return !matches(row, col, op.slice(4))
  const v = getPath(row, col)
  if (op === 'is.null') return v === null || v === undefined
  const [kind, ...rest] = op.split('.')
  const arg = unquote(rest.join('.'))
  switch (kind) {
    case 'eq':
      return v !== null && v !== undefined && String(v) === arg
    case 'neq': // SQL semantics: NULL <> x is not true
      return v !== null && v !== undefined && String(v) !== arg
    case 'gte':
      return v !== null && String(v) >= arg
    case 'lte':
      return v !== null && String(v) <= arg
    case 'in':
      return v !== null && v !== undefined && splitTop(arg.slice(1, -1)).map(unquote).includes(String(v))
    default:
      throw new Error(`fake: unsupported operator ${op}`)
  }
}

/** One condition of a logic tree: `col.op.value` or `and(...)` / `or(...)`. */
function evalCond(row: Row, cond: string): boolean {
  const logic = cond.match(/^(and|or)\((.*)\)$/s)
  if (logic) {
    const parts = splitTop(logic[2]).map((c) => evalCond(row, c))
    return logic[1] === 'and' ? parts.every(Boolean) : parts.some(Boolean)
  }
  const dot = cond.indexOf('.')
  return matches(row, cond.slice(0, dot), cond.slice(dot + 1))
}

function project(row: Row, selectExpr: string): Row {
  if (selectExpr === '*') return { ...row }
  const out: Row = {}
  for (const item of selectExpr.split(',')) {
    const [alias, expr] = item.includes(':') ? item.split(':') : [item.split('->').pop()!.replace('>', ''), item]
    out[alias] = getPath(row, expr)
  }
  return out
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

async function fakeFetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  const url = new URL(String(input))
  const headers = (init.headers ?? {}) as Record<string, string>
  if (headers.apikey !== ANON) return json(401, { message: 'bad apikey' })

  if (url.pathname === '/auth/v1/token') {
    const grant = url.searchParams.get('grant_type')!
    state.grants.push(grant)
    const body = JSON.parse(String(init.body))
    if (grant === 'refresh_token' && state.failRefresh) return json(400, { error_description: 'Invalid Refresh Token' })
    if (grant === 'password' && (body.email !== 'gaian@test' || body.password !== 'pw')) return json(400, { error_description: 'Invalid login credentials' })
    const token = `tok${++state.tokenSeq}`
    state.validTokens.add(token)
    return json(200, { access_token: token, refresh_token: `ref${state.tokenSeq}`, expires_in: state.expiresIn, token_type: 'bearer' })
  }

  const bearer = headers.Authorization?.replace('Bearer ', '') ?? null
  if (!bearer || !state.validTokens.has(bearer)) return json(401, { message: 'JWT expired' })

  if (url.pathname.startsWith('/storage/v1/object/sign/')) {
    assert.equal(init.method, 'POST')
    const path = decodeURIComponent(url.pathname.slice('/storage/v1/object/sign/'.length))
    state.storageCalls.push({ path, body: JSON.parse(String(init.body)) })
    return json(200, { signedURL: `/object/sign/${url.pathname.slice('/storage/v1/object/sign/'.length)}?token=signed` })
  }

  const m = url.pathname.match(/^\/rest\/v1\/(\w+)$/)
  if (!m) return json(404, { message: 'not found' })
  assert.equal(init.method ?? 'GET', 'GET', 'REST access must be read-only')
  const table = m[1]
  state.restCalls.push({ table, params: url.searchParams, auth: bearer })
  let rows = state.db[table]
  if (!rows) return json(404, { message: `relation ${table} does not exist` })
  const reserved = new Set(['select', 'limit', 'offset', 'order'])
  for (const key of new Set(url.searchParams.keys())) {
    if (reserved.has(key)) continue
    for (const op of url.searchParams.getAll(key)) {
      if (key === 'or' || key === 'and') rows = rows.filter((r) => evalCond(r, `${key}${op}`))
      else rows = rows.filter((r) => matches(r, key, op))
    }
  }
  const order = url.searchParams.get('order')
  if (order) {
    const [col, dir] = order.split(',')[0].split('.')
    rows = [...rows].sort((a, b) => {
      const av = a[col] ?? '', bv = b[col] ?? ''
      return (av < bv ? -1 : av > bv ? 1 : 0) * (dir === 'desc' ? -1 : 1)
    })
  }
  const offset = Number(url.searchParams.get('offset') ?? 0)
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 1000), 1000)
  const sel = url.searchParams.get('select') ?? '*'
  return json(200, rows.slice(offset, offset + limit).map((r) => project(r, sel)))
}

// ------------------------------------------------------------------ harness

beforeEach(() => {
  state = {
    db: fixtures(),
    validTokens: new Set(),
    tokenSeq: 0,
    expiresIn: 3600,
    failRefresh: false,
    grants: [],
    restCalls: [],
    storageCalls: [],
  }
  globalThis.fetch = fakeFetch as typeof fetch
  process.env.ELEDGER_SUPABASE_URL = URL_
  process.env.ELEDGER_SUPABASE_ANON_KEY = ANON
  process.env.ELEDGER_SUPABASE_EMAIL = 'gaian@test'
  process.env.ELEDGER_SUPABASE_PASSWORD = 'pw'
  resetEledgerSession()
})

async function call(name: string, args: Record<string, unknown> = {}) {
  const server = new McpServer({ name: 'test', version: '0' })
  registerEledgerTools(server)
  const [clientT, serverT] = InMemoryTransport.createLinkedPair()
  await server.connect(serverT)
  const client = new Client({ name: 'test-client', version: '0' })
  await client.connect(clientT)
  const res = (await client.callTool({ name, arguments: args })) as { content: { text: string }[]; isError?: boolean }
  await client.close()
  const text = res.content[0].text
  return { isError: !!res.isError, text, data: res.isError ? null : JSON.parse(text) }
}

const ids = (rows: Row[]) => rows.map((r) => r.id).sort()

// ------------------------------------------------------------------ tests

test('eledger_farms: one row per shared farm, merged copies hidden, stats rolled up', async () => {
  const { data, isError, text } = await call('eledger_farms')
  assert.equal(isError, false, text)
  assert.deepEqual(data.farms.map((f: Row) => f.farm).sort(), [FA, FB, FC, FC2].sort())
  const a = data.farms.find((f: Row) => f.farm === FA)
  assert.equal(a.name, 'Finca Uno')
  assert.equal(a.organization, 'Xoco Gourmet')
  assert.equal(a.type, 'individual')
  assert.equal(a.parcels, 1) // the merged copy's parcel is deleted
  assert.equal(a.ha_declared, 2.5)
  // e1, e3 (on the merged copy), ph1 (legacy_map), b1, s1, eq1 — not e1-old (superseded) or fin1 (master data)
  assert.equal(a.records, 6)
  assert.equal(data.farms.find((f: Row) => f.farm === FB).records, 3)
  assert.equal(data.records_without_farm, 1) // x1
  assert.deepEqual(data.possible_duplicates, [{ name: 'Finca Tres', farms: [FC, FC2] }])
  for (const u of [U1, U2, U3]) assert.ok(!text.includes(u), 'raw user_id must not leak')
})

test('superseded records are excluded everywhere', async () => {
  const recs = await call('eledger_records', { farm: FA, modulo: 'emision' })
  assert.deepEqual(ids(recs.data.records), ['e1', 'e3'])
  const em = await call('eledger_emissions', { farm: FA })
  assert.equal(em.data.total.kg_co2e, 110) // not + 999
  for (const c of state.restCalls.filter((c) => c.table === 'records')) {
    if (c.params.has('id')) continue // exact id lookups
    assert.equal(c.params.get('data->>superseded_by'), 'is.null', `records query without superseded filter: ${c.params}`)
  }
})

test('eledger_parcels: GeoJSON per shared farm; a merged copy id resolves to the kept farm', async () => {
  const { data, isError, text } = await call('eledger_parcels', { farm: FA_COPY })
  assert.equal(isError, false, text)
  assert.equal(data.farm, FA)
  assert.equal(data.parcel_count, 1)
  const f = data.geojson.features[0]
  assert.equal(f.id, PA1)
  assert.deepEqual(f.geometry.coordinates[0][0], [-82.1, 9.1])
  assert.deepEqual(f.properties, { parcel: PA1, name: 'Lote Norte', kind: 'normal', ha_declared: 2.5, ha_measured: 2.41, eudr_status: 'free' })
  const b = await call('eledger_parcels', { farm: FB })
  assert.equal(b.data.parcels_without_valid_geometry, 1)
  assert.equal(b.data.geojson.features[0].geometry, null)
})

test('two users with the same phone farm number are never merged', async () => {
  const ambiguous = await call('eledger_parcels', { farm: 'F008' })
  assert.equal(ambiguous.isError, true)
  assert.ok(ambiguous.text.includes(FA) && ambiguous.text.includes(FB), ambiguous.text)

  const em = await call('eledger_emissions', { group_by: 'farm' })
  const groups = Object.fromEntries(em.data.groups.map((g: Row) => [g.key, g]))
  assert.equal(groups[FA].kg_co2e, 110)
  assert.equal(groups[FA].farm_name, 'Finca Uno')
  assert.equal(groups[FA].ch4_kg, 1)
  assert.equal(groups[FB].kg_co2e, 50)
  assert.equal(em.data.total.kg_co2e, 160)

  const sp = await call('eledger_species', { farm: FA })
  assert.deepEqual(sp.data.observations.by_species.map((s: Row) => s.species), ['Ara macao'])
  assert.equal(sp.data.observations.recent[0].farm, FA)
  assert.equal(sp.data.observations.recent[0].parcel, PA1)
  assert.equal(sp.data.ai_identifications.confirmed, 1)

  const fm = await call('eledger_field_measures', { farm: FB })
  assert.deepEqual(Object.keys(fm.data.summary), ['lluvia'])
  assert.equal(fm.data.summary.lluvia.rain_mm_total, 12)

  const all = await call('eledger_species', { source: 'observations' })
  assert.deepEqual(all.data.observations.recent.map((r: Row) => r.farm).sort(), [FA, FB].sort())
})

test('farm references: name, old farm_key and ambiguous names', async () => {
  const byName = await call('eledger_records', { farm: 'finca uno', modulo: 'bio' })
  assert.equal(byName.data.farm, FA)
  assert.deepEqual(ids(byName.data.records), ['b1'])

  const legacy = await call('eledger_parcels', { farm: `${userHash(U2)}:F008` })
  assert.equal(legacy.data.farm, FB)

  const dup = await call('eledger_parcels', { farm: 'Finca Tres' })
  assert.equal(dup.isError, true)
  assert.match(dup.text, /2 farms are named "Finca Tres"/)
  assert.ok(dup.text.includes(FC) && dup.text.includes(FC2))

  const none = await call('eledger_parcels', { farm: 'Nowhere' })
  assert.equal(none.isError, true)
})

test('old records without farm_uuid are attributed through legacy_map', async () => {
  const { data } = await call('eledger_records', { farm: FA, modulo: 'foto' })
  assert.deepEqual(ids(data.records), ['ph1'])
  assert.equal(data.records[0].farm, FA)
  const any = await call('eledger_records', { modulo: 'foto' })
  assert.equal(any.data.records[0].farm, FA)
  assert.equal(any.data.records[0].farm_name, 'Finca Uno')
})

test('parcel filter by parcel id (uuid) works without farm; phone parcel number needs farm', async () => {
  const { data } = await call('eledger_records', { parcel: PA1, modulo: 'emision' })
  assert.deepEqual(ids(data.records), ['e1'])
  const bad = await call('eledger_records', { parcel: 'P1' })
  assert.equal(bad.isError, true)
  const ok = await call('eledger_records', { farm: FA, parcel: 'P1' })
  assert.deepEqual(ids(ok.data.records), ['e1'])
})

test('expired access token is refreshed via refresh_token', async () => {
  state.expiresIn = 0 // token is already inside the refresh margin
  await call('eledger_farms')
  await call('eledger_farms')
  assert.equal(state.grants[0], 'password')
  assert.ok(state.grants.includes('refresh_token'), `grants: ${state.grants}`)
})

test('token rejected server-side (401) triggers one re-auth and retry', async () => {
  await call('eledger_farms')
  state.validTokens.clear() // server revokes/expires every token
  const { isError, data } = await call('eledger_farms')
  assert.equal(isError, false)
  assert.equal(data.count, 4)
})

test('failed refresh falls back to password login', async () => {
  state.expiresIn = 0
  state.failRefresh = true
  await call('eledger_farms')
  const { isError } = await call('eledger_farms')
  assert.equal(isError, false)
  assert.ok(state.grants.slice(1).includes('refresh_token') && state.grants.lastIndexOf('password') > state.grants.indexOf('refresh_token'))
})

test('errors become tool errors, not crashes', async () => {
  delete process.env.ELEDGER_SUPABASE_PASSWORD
  const missing = await call('eledger_farms')
  assert.equal(missing.isError, true)
  assert.match(missing.text, /missing ELEDGER_SUPABASE_PASSWORD/)

  process.env.ELEDGER_SUPABASE_PASSWORD = 'wrong'
  resetEledgerSession()
  const badLogin = await call('eledger_farms')
  assert.equal(badLogin.isError, true)
  assert.match(badLogin.text, /login failed/)
  assert.ok(!badLogin.text.includes('wrong'), 'password must not appear in errors')

  process.env.ELEDGER_SUPABASE_PASSWORD = 'pw'
  const tooMany = await call('eledger_records', { limit: 500 })
  assert.equal(tooMany.isError, true)
})

test('eledger_records: summary hides personal data, profiles never queried', async () => {
  const { data } = await call('eledger_records', { farm: FA, modulo: 'emision', parcel: PA1 })
  const r = data.records[0]
  assert.equal(r.recorded_by, 'XX')
  assert.equal(r.summary.activity, 'fertilizer')
  assert.ok(!('responsable' in r.summary))
  assert.ok(!JSON.stringify(data).includes('@'))
  assert.ok(!state.restCalls.some((c) => c.table === 'profiles'))
  assert.deepEqual(summarizeData({ email: 'a@b.c', telefono: '123', name: 'Lote', n: 3 }), { name: 'Lote', n: 3 })
})

test('eledger_emissions: org_month uses v_emissions, merged per month, zero rows dropped', async () => {
  const { data } = await call('eledger_emissions', { group_by: 'org_month', from: '2026-04-01' })
  assert.equal(data.rows.length, 1, JSON.stringify(data.rows))
  assert.deepEqual(data.rows[0], { org_id: 'org1', month: '2026-04', sector: 'cacao', modulo: 'emision', kg_co2e: 75, n: 3 })
})

test('eledger_emissions: zero-kg records (photos) are not counted', async () => {
  const { data } = await call('eledger_emissions', { farm: FA, group_by: 'modulo' })
  assert.deepEqual(data.groups.map((g: Row) => g.key), ['emision'])
  assert.equal(data.total.records, 2)
})

test('eledger_records: accepts modules outside the original list; summary skips duplicated columns', async () => {
  const eq = await call('eledger_records', { farm: FA, modulo: 'equipo' })
  assert.equal(eq.isError, false, eq.text)
  assert.deepEqual(ids(eq.data.records), ['eq1'])
  const ph = await call('eledger_records', { farm: FA, modulo: 'foto' })
  assert.deepEqual(ph.data.records[0].summary, { note: 'Test foto' })
})

test('eledger_photo_url: signs photos/{photo_path} for 1 hour', async () => {
  const { data, isError } = await call('eledger_photo_url', { record_id: 'b1' })
  assert.equal(isError, false)
  assert.deepEqual(state.storageCalls[0], { path: 'photos/u1/bio 1.jpg', body: { expiresIn: 3600 } })
  assert.equal(data.url, `${URL_}/storage/v1/object/sign/photos/u1/bio%201.jpg?token=signed`)
  const none = await call('eledger_photo_url', { record_id: 'e2' })
  assert.equal(none.isError, true)
})

test('select paginates in pages of at most 1000 and reports truncation', async () => {
  state.db.big = Array.from({ length: 2500 }, (_, i) => ({ id: `r${i}` }))
  const all = await select<Row>('big', { select: 'id' }, 5000)
  assert.equal(all.rows.length, 2500)
  assert.equal(all.truncated, false)
  const capped = await select<Row>('big', { select: 'id' }, 1200)
  assert.equal(capped.rows.length, 1200)
  assert.equal(capped.truncated, true)
  for (const c of state.restCalls) assert.ok(Number(c.params.get('limit')) <= 1000)
})

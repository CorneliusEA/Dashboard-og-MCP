/**
 * Tests for the E-Ledger tools against an in-memory fake of Supabase
 * (auth + a small PostgREST subset + storage signing). Run: npm test
 */
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { registerEledgerTools } from '../src/tools/eledger.js'
import {
  farmKey,
  parcelGeometryToGeoJSON,
  resetEledgerSession,
  select,
  summarizeData,
} from '../src/lib/eledger.js'

const URL_ = 'https://fake.supabase.co'
const ANON = 'sb_publishable_test'
const U1 = '11111111-1111-1111-1111-111111111111'
const U2 = '22222222-2222-2222-2222-222222222222'
const K1 = farmKey(U1, 'F008')
const K2 = farmKey(U2, 'F008')

type Row = Record<string, any>

// ------------------------------------------------------------------ fixtures

function fixtures(): Record<string, Row[]> {
  const rec = (r: Row): Row => ({
    org_id: 'org1',
    recorded_by: 'XX',
    parcel_id: null,
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
  return {
    records: [
      // Two users, SAME farm_id "F008"
      rec({ id: 'f1', user_id: U1, farm_id: 'F008', modulo: 'finca', data: { name: 'Finca Uno', type: 'cacao', country: 'Panama', region: 'Bocas', totalHa: 10 }, updated_at: '2026-02-01T00:00:00Z' }),
      rec({ id: 'f1-old', user_id: U1, farm_id: 'F008', modulo: 'finca', data: { name: 'Finca Uno (OLD)', country: 'Panama', superseded_by: 'f1' }, updated_at: '2026-03-01T00:00:00Z' }),
      rec({ id: 'f2', user_id: U2, farm_id: 'F008', modulo: 'finca', data: { name: 'Finca Dos', country: 'Nicaragua', totalHa: '4.5' } }),
      // Parcel stored as [lat, lon], open ring
      rec({ id: 'p1', user_id: U1, farm_id: 'F008', parcel_id: 'P1', modulo: 'parcela', data: { name: 'Lote Norte', ha: '2.5', ha_measured: 2.41, eudrStatus: 'compliant', geometry: [[9.1, -82.1], [9.1, -82.2], [9.2, -82.2]] } }),
      rec({ id: 'p1-old', user_id: U1, farm_id: 'F008', parcel_id: 'P1', modulo: 'parcela', data: { name: 'Lote Norte OLD', geometry: [[0, 0], [0, 1], [1, 1]], superseded_by: 'p1' }, updated_at: '2026-05-01T00:00:00Z' }),
      rec({ id: 'p2', user_id: U2, farm_id: 'F008', parcel_id: 'P1', modulo: 'parcela', data: { name: 'Otra', geometry: [[12, -86], [12, -86.1], [12.1, -86.1], [12, -86]] } }),
      // Emissions; e1-old is a corrected version and must be ignored
      rec({ id: 'e1', user_id: U1, farm_id: 'F008', parcel_id: 'P1', modulo: 'emision', date: '2026-03-10', kg_co2e: 100, data: { activity: 'fertilizer', responsable: 'Juan Pérez', note: 'contact juan@example.com' } }),
      rec({ id: 'e1-old', user_id: U1, farm_id: 'F008', parcel_id: 'P1', modulo: 'emision', date: '2026-03-10', kg_co2e: 999, data: { superseded_by: 'e1' } }),
      rec({ id: 'e2', user_id: U2, farm_id: 'F008', parcel_id: 'P1', modulo: 'emision', date: '2026-04-12', kg_co2e: 50 }),
      // Photo records carry kg_co2e = 0 in real data and must not count as emissions
      rec({ id: 'ph1', user_id: U1, farm_id: 'F008', parcel_id: 'P1', modulo: 'foto', date: '2026-04-03', kg_co2e: 0, data: { gps: '9.1, -82.1', lat: 9.1, icon: '🌿', note: 'Test foto', ai_at: '2026-04-03T10:00:00Z' } }),
      // A module that is not in the original spec list
      rec({ id: 'eq1', user_id: U1, farm_id: 'F008', modulo: 'equipo', date: '2026-04-04' }),
      // Biodiversity
      rec({ id: 'b1', user_id: U1, farm_id: 'F008', parcel_id: 'P1', modulo: 'bio', date: '2026-04-01', photo_path: 'u1/bio 1.jpg' }),
      rec({ id: 'b2', user_id: U2, farm_id: 'F008', modulo: 'bio', date: '2026-04-02' }),
      // Field measures
      rec({ id: 's1', user_id: U1, farm_id: 'F008', modulo: 'suelo', date: '2026-04-05' }),
      rec({ id: 'l2', user_id: U2, farm_id: 'F008', modulo: 'lluvia', date: '2026-04-06' }),
    ],
    v_gases: [
      { id: 'e1', org_id: 'org1', farm_id: 'F008', parcel_id: 'P1', date: '2026-03-10', modulo: 'emision', ch4_kg: 1, n2o_kg: 0.1, kg_co2e: 100, gwp_basis: 'AR6' },
      { id: 'e2', org_id: 'org1', farm_id: 'F008', parcel_id: 'P1', date: '2026-04-12', modulo: 'emision', ch4_kg: 2, n2o_kg: 0, kg_co2e: 50, gwp_basis: 'AR6' },
    ],
    v_emissions: [
      { org_id: 'org1', farm_id: 'F008', sector: 'cacao', month: '2026-03-01', modulo: 'emision', kg_co2e: 100, n: 1 },
      { org_id: 'org1', farm_id: 'F008', sector: 'cacao', month: '2026-04-01', modulo: 'emision', kg_co2e: 50, n: 1 },
      // same org/month/sector/modulo from another farm → must be merged, not listed twice
      { org_id: 'org1', farm_id: 'F009', sector: 'cacao', month: '2026-04-01', modulo: 'emision', kg_co2e: 25, n: 2 },
      { org_id: 'org1', farm_id: 'F008', sector: 'cacao', month: '2026-04-01', modulo: 'foto', kg_co2e: 0, n: 5 },
    ],
    v_observations: [
      { id: 'b1', org_id: 'org1', farm_id: 'F008', parcel_id: 'P1', date: '2026-04-01', lat: 9.1, lon: -82.1, earth_bric_id: null, species: 'Ara macao', grp: 'aves', confidence: 'high', photo_sha256: 'x', photo_path: 'u1/bio 1.jpg' },
      { id: 'b2', org_id: 'org1', farm_id: 'F008', parcel_id: null, date: '2026-04-02', lat: 12, lon: -86, earth_bric_id: null, species: 'Bradypus variegatus', grp: 'mammalia', confidence: 'medium', photo_sha256: null, photo_path: null },
    ],
    v_species_ai: [
      { id: 'b1', org_id: 'org1', farm_id: 'F008', parcel_id: 'P1', date: '2026-04-01', lat: 9.1, lon: -82.1, earth_bric_id: null, modulo: 'bio', ai_status: 'done', species_ai: 'Ara macao', score_ai: 0.93, source_ai: 'model', species_used: 'Ara macao', confirmed: true, gbif_status: 'ACCEPTED', gbif_n_50km: 120, photo_path: 'u1/bio 1.jpg' },
    ],
    v_field_measures: [
      { id: 's1', org_id: 'org1', farm_id: 'F008', parcel_id: null, date: '2026-04-05', modulo: 'suelo', soil_texture: 'franco', earthworms_n: 5, media_paths: ['a.jpg', 'b.mp4'], photo_path: null, alert: null },
      { id: 'l2', org_id: 'org1', farm_id: 'F008', parcel_id: null, date: '2026-04-06', modulo: 'lluvia', rain_mm: 12, rain_openmeteo_mm: 10, media_paths: [], photo_path: null, alert: null },
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

function matches(row: Row, col: string, op: string): boolean {
  const v = getPath(row, col)
  if (op === 'is.null') return v === null || v === undefined
  if (op === 'not.is.null') return v !== null && v !== undefined
  const [kind, ...rest] = op.split('.')
  const arg = rest.join('.')
  switch (kind) {
    case 'eq':
      return v !== null && String(v) === arg
    case 'neq': // SQL semantics: NULL <> x is not true
      return v !== null && v !== undefined && String(v) !== arg
    case 'gte':
      return v !== null && String(v) >= arg
    case 'lte':
      return v !== null && String(v) <= arg
    case 'in': {
      const items = [...arg.slice(1, -1).matchAll(/"((?:[^"\\]|\\.)*)"|([^,]+)/g)].map((m) => (m[1] ?? m[2]).replace(/\\(.)/g, '$1'))
      return items.includes(String(v))
    }
    default:
      throw new Error(`fake: unsupported operator ${op}`)
  }
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
    for (const op of url.searchParams.getAll(key)) rows = rows.filter((r) => matches(r, key, op))
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

// ------------------------------------------------------------------ tests

test('eledger_farms: one entry per (user, farm_id), current version, parcel counts', async () => {
  const { data, isError } = await call('eledger_farms')
  assert.equal(isError, false)
  assert.equal(data.count, 2)
  const byKey = Object.fromEntries(data.farms.map((f: Row) => [f.farm_key, f]))
  assert.equal(byKey[K1].name, 'Finca Uno')
  assert.equal(byKey[K1].total_ha, 10)
  assert.equal(byKey[K1].parcel_count, 1)
  assert.equal(byKey[K2].name, 'Finca Dos')
  assert.equal(byKey[K2].total_ha, 4.5)
  assert.ok(!JSON.stringify(data).includes(U1), 'raw user_id must not leak')
})

test('superseded records are excluded everywhere', async () => {
  const farms = await call('eledger_farms')
  assert.ok(!farms.text.includes('OLD'))
  const recs = await call('eledger_records', { farm: K1, modulo: 'emision' })
  assert.deepEqual(recs.data.records.map((r: Row) => r.id), ['e1'])
  const em = await call('eledger_emissions', { farm: K1 })
  assert.equal(em.data.total.kg_co2e, 100) // not 100 + 999
  const parcels = await call('eledger_parcels', { farm: K1 })
  assert.equal(parcels.data.geojson.features[0].properties.name, 'Lote Norte')
  for (const c of state.restCalls.filter((c) => c.table === 'records')) {
    if (c.params.has('id')) continue // id lookups are exact
    assert.equal(c.params.get('data->>superseded_by'), 'is.null', `records query without superseded filter: ${c.params}`)
  }
})

test('eledger_parcels: [lat, lon] becomes closed GeoJSON ring of [lon, lat]', async () => {
  const { data } = await call('eledger_parcels', { farm: K1 })
  assert.equal(data.parcel_count, 1)
  const f = data.geojson.features[0]
  assert.equal(f.geometry.type, 'Polygon')
  assert.deepEqual(f.geometry.coordinates[0], [
    [-82.1, 9.1],
    [-82.2, 9.1],
    [-82.2, 9.2],
    [-82.1, 9.1],
  ])
  assert.deepEqual(f.properties, { parcel_id: 'P1', name: 'Lote Norte', ha: 2.5, ha_measured: 2.41, eudr_status: 'compliant' })
})

test('parcelGeometryToGeoJSON: already-closed ring is not double-closed; junk is rejected', () => {
  const g = parcelGeometryToGeoJSON([[12, -86], [12, -86.1], [12.1, -86.1], [12, -86]])!
  assert.equal(g.coordinates[0].length, 4)
  assert.equal(parcelGeometryToGeoJSON([[1, 2], [3, 4]]), null)
  assert.equal(parcelGeometryToGeoJSON('nope'), null)
  assert.equal(parcelGeometryToGeoJSON([[1, 2], [3, 'x'], [5, 6]]), null)
})

test('two users with the same farm_id are never merged', async () => {
  const ambiguous = await call('eledger_parcels', { farm: 'F008' })
  assert.equal(ambiguous.isError, true)
  assert.ok(ambiguous.text.includes(K1) && ambiguous.text.includes(K2), ambiguous.text)

  const p2 = await call('eledger_parcels', { farm: K2 })
  assert.equal(p2.data.geojson.features[0].properties.name, 'Otra')

  const em = await call('eledger_emissions', { group_by: 'farm' })
  const groups = Object.fromEntries(em.data.groups.map((g: Row) => [g.key, g]))
  assert.equal(groups[K1].kg_co2e, 100)
  assert.equal(groups[K1].ch4_kg, 1)
  assert.equal(groups[K2].kg_co2e, 50)
  assert.equal(em.data.total.kg_co2e, 150)

  const sp = await call('eledger_species', { farm: K1 })
  assert.deepEqual(sp.data.observations.by_species.map((s: Row) => s.species), ['Ara macao'])
  assert.equal(sp.data.observations.recent[0].farm_key, K1)
  assert.equal(sp.data.ai_identifications.confirmed, 1)

  const fm = await call('eledger_field_measures', { farm: K2 })
  assert.deepEqual(Object.keys(fm.data.summary), ['lluvia'])
  assert.equal((fm.data.summary as Row).lluvia.rain_mm_total, 12)

  const all = await call('eledger_species', { source: 'observations' })
  const keys = all.data.observations.recent.map((r: Row) => r.farm_key).sort()
  assert.deepEqual(keys, [K1, K2].sort())
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
  assert.equal(data.count, 2)
})

test('failed refresh falls back to password login', async () => {
  state.expiresIn = 0
  state.failRefresh = true
  await call('eledger_farms')
  const { isError } = await call('eledger_farms')
  assert.equal(isError, false)
  assert.deepEqual(state.grants.slice(-2), ['refresh_token', 'password'])
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
  const parcelOnly = await call('eledger_records', { parcel: 'P1' })
  assert.equal(parcelOnly.isError, true)

  const tooMany = await call('eledger_records', { limit: 500 })
  assert.equal(tooMany.isError, true)
})

test('eledger_records: summary hides personal data, profiles never queried', async () => {
  const { data } = await call('eledger_records', { farm: K1, modulo: 'emision' })
  const r = data.records[0]
  assert.equal(r.recorded_by, 'XX')
  assert.equal(r.summary.activity, 'fertilizer')
  assert.ok(!('responsable' in r.summary))
  assert.ok(!JSON.stringify(data).includes('@'))
  assert.ok(!state.restCalls.some((c) => c.table === 'profiles'))
  assert.deepEqual(summarizeData({ email: 'a@b.c', telefono: '123', name: 'Lote', n: 3 }), { name: 'Lote', n: 3 })
})

test('eledger_emissions: org_month uses v_emissions with month filter', async () => {
  const { data } = await call('eledger_emissions', { group_by: 'org_month', from: '2026-04-01' })
  assert.equal(data.rows.length, 1, JSON.stringify(data.rows)) // F008+F009 merged, zero-kg foto row dropped
  assert.deepEqual(data.rows[0], { org_id: 'org1', month: '2026-04', sector: 'cacao', modulo: 'emision', kg_co2e: 75, n: 3 })
  assert.equal(data.total_kg_co2e, 75)
})

test('eledger_emissions: zero-kg records (photos) are not counted', async () => {
  const { data } = await call('eledger_emissions', { farm: K1, group_by: 'modulo' })
  assert.deepEqual(data.groups.map((g: Row) => g.key), ['emision'])
  assert.equal(data.total.records, 1)
})

test('eledger_records: accepts modules outside the original list; summary skips duplicated columns', async () => {
  const eq = await call('eledger_records', { farm: K1, modulo: 'equipo' })
  assert.equal(eq.isError, false, eq.text)
  assert.deepEqual(eq.data.records.map((r: Row) => r.id), ['eq1'])
  const ph = await call('eledger_records', { farm: K1, modulo: 'foto' })
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

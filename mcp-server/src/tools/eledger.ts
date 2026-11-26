import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  CURRENT,
  FarmIndex,
  Params,
  compact,
  dateRange,
  isUuid,
  loadFarmIndex,
  num,
  recordRefs,
  resolveFarmRef,
  round,
  select,
  signPhotoUrl,
  summarizeData,
} from '../lib/eledger.js'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
const farmArg = z
  .string()
  .min(1)
  .describe('Farm id (uuid) from eledger_farms. An exact farm name also works when it is unique.')
const parcelArg = z
  .string()
  .min(1)
  .describe('Parcel id (uuid) from eledger_parcels; a phone parcel number (e.g. "P011-A") needs farm as well.')

// Free-form on purpose: the app adds modules over time (e.g. `equipo` exists in
// live data but not in the original spec), so an enum would block valid filters.
const moduloArg = z
  .string()
  .regex(/^[a-z_]+$/, 'modulo is a lowercase module name')
  .describe(
    'Module, e.g. emision, quim, trans, activo (trees), bio, foto, tur (GPS walk), tarea, suelo, agua, lluvia, cobertura, papel, xoco, equipo; master data: finca, parcela, lote, declaracion',
  )

const MAX_AGG_ROWS = 20_000 // cap for rows pulled in to aggregate (emissions, farm lists)
const MAX_VIEW_ROWS = 2_000 // cap for view rows pulled in before summarising

type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean }

/** Never let a tool crash the request: every failure becomes a readable tool error. */
function safe<A>(fn: (args: A) => Promise<unknown>): (args: A) => Promise<ToolResult> {
  return async (args: A) => {
    try {
      const result = await fn(args)
      // Compact JSON: parcel polygons and record lists get large; indentation roughly doubles the size.
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { content: [{ type: 'text', text: `E-Ledger error: ${message}` }], isError: true }
    }
  }
}

interface Scope {
  farm: { id: string; name: string | null } | null
  /** filters for `records` that select exactly this farm/parcel */
  params: Params
}

function scopeFor(index: FarmIndex, farm?: string, parcel?: string): Scope {
  if (parcel && !farm && !isUuid(parcel))
    throw new Error('A phone parcel number needs farm as well (parcel numbers are only unique per user); or pass the parcel id from eledger_parcels')
  const params: Params = {}
  let resolved: Scope['farm'] = null
  if (farm) {
    resolved = resolveFarmRef(farm, index)
    params.or = index.recordFilter(resolved.id)
  }
  if (parcel) {
    if (isUuid(parcel)) params.parcel_uuid = `eq.${parcel}`
    else params.parcel_id = `eq.${parcel}`
  }
  return { farm: resolved, params }
}

const scoped = (s: Scope) => !!(s.params.or || s.params.parcel_uuid || s.params.parcel_id)

/** Ids of current records inside a farm/parcel scope — used to scope the v_* views, which lack farm_uuid. */
async function recordIdsIn(scope: Scope) {
  const { rows, truncated } = await select<{ id: string }>(
    'records',
    { select: 'id', ...scope.params, ...CURRENT },
    MAX_AGG_ROWS,
  )
  return { ids: new Set(rows.map((r) => r.id)), truncated }
}

/** Replace a view row's phone farm_id/parcel_id with the shared farm id + name and parcel id. */
async function withFarms<T extends { id: string; farm_id?: string | null; parcel_id?: string | null }>(rows: T[], index: FarmIndex) {
  const refs = await recordRefs(rows.map((r) => r.id))
  return rows.map(({ farm_id, parcel_id, ...rest }) => {
    const ref = refs.get(rest.id)
    const farm = ref ? index.farmOf(ref) : null
    return { ...rest, farm, farm_name: index.name(farm), parcel: ref?.parcel_uuid ?? parcel_id ?? null }
  })
}

export function registerEledgerTools(server: McpServer) {
  // ------------------------------------------------------------ farms
  server.registerTool(
    'eledger_farms',
    {
      title: 'E-Ledger farms (fincas)',
      description:
        'List the fincas in the ES Field App / E-Ledger (Supabase, read-only), one row per real farm: id, name, organisation, country, region, sector, parcel count, declared ha and number of field records. Use the farm id as `farm` in the other eledger_* tools. `possible_duplicates` lists farms with the same name that the app team has not merged yet — do not add those up as separate farms without checking.',
      inputSchema: {
        country: z.string().optional().describe('Only farms whose country matches (case-insensitive)'),
      },
    },
    safe(async ({ country }: { country?: string }) => {
      const index = await loadFarmIndex()
      const orgs = await select<{ id: string; name: string | null }>('organizations', { select: 'id,name' }, 5_000)
      const orgName = new Map(orgs.rows.map((o) => [o.id, o.name]))
      const parcels = await select<{ farm_id: string; ha_declared: number | null }>(
        'parcels',
        { select: 'farm_id,ha_declared', deleted_at: 'is.null' },
        MAX_AGG_ROWS,
      )
      const recs = await select<{ user_id: string | null; farm_id: string | null; farm_uuid: string | null }>(
        'records',
        { select: 'user_id,farm_id,farm_uuid', modulo: 'not.in.(finca,parcela)', ...CURRENT },
        MAX_AGG_ROWS,
      )

      const stats = new Map<string, { parcels: number; ha: number; records: number }>()
      const stat = (id: string) => {
        const s = stats.get(id) ?? { parcels: 0, ha: 0, records: 0 }
        stats.set(id, s)
        return s
      }
      for (const p of parcels.rows) {
        const id = index.final(p.farm_id)
        if (!id) continue
        const s = stat(id)
        s.parcels++
        s.ha += num(p.ha_declared) ?? 0
      }
      let unattributed = 0
      for (const r of recs.rows) {
        const id = index.farmOf(r)
        if (id) stat(id).records++
        else unattributed++
      }

      const active = index
        .active()
        .filter((f) => !country || (f.country ?? '').trim().toLowerCase() === country.trim().toLowerCase())
      const farms = active
        .map((f) => {
          const s = stats.get(f.id)
          return compact({
            farm: f.id,
            name: f.name,
            organization: f.org_id ? (orgName.get(f.org_id) ?? null) : null,
            country: f.country?.trim() || null,
            region: f.region?.trim() || null,
            sector: f.sector,
            type: f.type,
            parcels: s?.parcels ?? 0,
            ha_declared: round(s?.ha ?? 0, 2),
            records: s?.records ?? 0,
          })
        })
        .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))

      const byName = new Map<string, string[]>()
      for (const f of active) {
        const k = (f.name ?? '').trim().toLowerCase()
        if (k) byName.set(k, [...(byName.get(k) ?? []), f.id])
      }
      const possible_duplicates = [...byName.values()]
        .filter((ids) => ids.length > 1)
        .map((ids) => ({ name: index.name(ids[0]), farms: ids }))

      return {
        count: farms.length,
        truncated: parcels.truncated || recs.truncated,
        ...(possible_duplicates.length ? { possible_duplicates } : {}),
        ...(unattributed ? { records_without_farm: unattributed } : {}),
        farms,
      }
    }),
  )

  // ------------------------------------------------------------ parcels
  server.registerTool(
    'eledger_parcels',
    {
      title: 'E-Ledger parcels (GeoJSON)',
      description:
        'Parcels of one finca as a GeoJSON FeatureCollection (polygons in [lon, lat]) with parcel id, name, kind (normal / ppm sample plot), declared ha, measured ha and EUDR status.',
      inputSchema: { farm: farmArg },
    },
    safe(async ({ farm }: { farm: string }) => {
      const index = await loadFarmIndex()
      const resolved = resolveFarmRef(farm, index)
      const { rows, truncated } = await select<{
        id: string
        name: string | null
        kind: string | null
        ha_declared: number | null
        ha_measured: number | null
        eudr_status: string | null
        geojson: { type?: string; coordinates?: unknown } | null
      }>(
        'v_parcels_geojson',
        {
          select: 'id,name,kind,ha_declared,ha_measured,eudr_status,geojson',
          farm_id: `in.(${index.members(resolved.id).join(',')})`,
          order: 'name.asc',
        },
        MAX_VIEW_ROWS,
      )
      let withoutGeometry = 0
      const features = rows.map((p) => {
        const geometry = p.geojson?.type === 'Polygon' && Array.isArray(p.geojson.coordinates) ? p.geojson : null
        if (!geometry) withoutGeometry++
        return {
          type: 'Feature' as const,
          id: p.id,
          geometry,
          properties: compact({
            parcel: p.id,
            name: p.name,
            kind: p.kind,
            ha_declared: num(p.ha_declared),
            ha_measured: num(p.ha_measured),
            eudr_status: p.eudr_status,
          }),
        }
      })
      return {
        farm: resolved.id,
        farm_name: resolved.name,
        parcel_count: features.length,
        parcels_without_valid_geometry: withoutGeometry,
        truncated,
        geojson: { type: 'FeatureCollection', features },
      }
    }),
  )

  // ------------------------------------------------------------ records
  server.registerTool(
    'eledger_records',
    {
      title: 'E-Ledger field records',
      description:
        'Field registrations from the E-Ledger (current versions only), newest first, with a short summary per record. Filter by farm, parcel, modulo and date range. Use eledger_photo_url with a record id for its photo.',
      inputSchema: {
        farm: farmArg.optional(),
        parcel: parcelArg.optional(),
        modulo: moduloArg.optional(),
        from: isoDate.optional().describe('Earliest date, YYYY-MM-DD'),
        to: isoDate.optional().describe('Latest date, YYYY-MM-DD'),
        limit: z.number().int().min(1).max(200).default(50).describe('Max records returned (1-200, default 50)'),
      },
    },
    safe(
      async (args: { farm?: string; parcel?: string; modulo?: string; from?: string; to?: string; limit?: number }) => {
        const index = await loadFarmIndex()
        const scope = scopeFor(index, args.farm, args.parcel)
        const { rows, truncated } = await select<{
          id: string
          user_id: string | null
          recorded_by: string | null
          farm_id: string | null
          farm_uuid: string | null
          parcel_id: string | null
          parcel_uuid: string | null
          sector: string | null
          modulo: string
          date: string | null
          lat: number | null
          lon: number | null
          earth_bric_id: string | null
          kg_co2e: number | null
          photo_path: string | null
          data: unknown
        }>(
          'records',
          {
            select:
              'id,user_id,recorded_by,farm_id,farm_uuid,parcel_id,parcel_uuid,sector,modulo,date,lat,lon,earth_bric_id,kg_co2e,photo_path,data',
            ...scope.params,
            ...(args.modulo ? { modulo: `eq.${args.modulo}` } : {}),
            date: dateRange(args.from, args.to),
            ...CURRENT,
            order: 'date.desc.nullslast,updated_at.desc',
          },
          args.limit ?? 50,
        )
        return {
          ...(scope.farm ? { farm: scope.farm.id, farm_name: scope.farm.name } : {}),
          count: rows.length,
          truncated,
          records: rows.map((r) => {
            const farm = index.farmOf(r)
            return compact({
              id: r.id,
              farm,
              farm_name: scope.farm ? null : index.name(farm),
              parcel: r.parcel_uuid ?? r.parcel_id,
              modulo: r.modulo,
              date: r.date,
              recorded_by: r.recorded_by,
              sector: r.sector,
              lat: r.lat,
              lon: r.lon,
              earth_bric_id: r.earth_bric_id,
              kg_co2e: num(r.kg_co2e),
              has_photo: !!r.photo_path,
              summary: summarizeData(r.data),
            })
          }),
        }
      },
    ),
  )

  // ------------------------------------------------------------ emissions
  server.registerTool(
    'eledger_emissions',
    {
      title: 'E-Ledger emissions (CO2e, CH4, N2O)',
      description:
        'Emissions from E-Ledger field records: kg CO2e plus CH4/N2O kg, totalled and grouped by farm, parcel, month or modulo, optionally for one farm/parcel and a date range. group_by=org_month returns the org-level monthly view (v_emissions) instead.',
      inputSchema: {
        farm: farmArg.optional(),
        parcel: parcelArg.optional(),
        from: isoDate.optional(),
        to: isoDate.optional(),
        group_by: z.enum(['farm', 'parcel', 'month', 'modulo', 'org_month']).default('farm'),
      },
    },
    safe(
      async (args: { farm?: string; parcel?: string; from?: string; to?: string; group_by?: string }) => {
        const groupBy = args.group_by ?? 'farm'

        if (groupBy === 'org_month') {
          if (args.farm || args.parcel)
            throw new Error('group_by=org_month is organisation-wide; drop farm/parcel or use group_by=farm|parcel|month')
          const { rows, truncated } = await select<{
            org_id: string | null
            month: string
            sector: string | null
            modulo: string
            kg_co2e: number | null
            n: number | null
          }>('v_emissions', { select: 'org_id,month,sector,modulo,kg_co2e,n', order: 'month.asc' }, MAX_AGG_ROWS)
          const fromM = args.from?.slice(0, 7)
          const toM = args.to?.slice(0, 7)
          // v_emissions is also split per farm_id; merge to one row per org/month/sector/modulo
          // and drop zero-emission rows (e.g. photo records carry kg_co2e = 0).
          const merged = new Map<string, { org_id: string | null; month: string; sector: string | null; modulo: string; kg_co2e: number; n: number }>()
          for (const r of rows) {
            const month = String(r.month).slice(0, 7)
            if ((fromM && month < fromM) || (toM && month > toM)) continue
            const kg = num(r.kg_co2e) ?? 0
            if (kg === 0) continue
            const k = [r.org_id, month, r.sector, r.modulo].join('|')
            const acc = merged.get(k) ?? { org_id: r.org_id, month, sector: r.sector, modulo: r.modulo, kg_co2e: 0, n: 0 }
            acc.kg_co2e += kg
            acc.n += num(r.n) ?? 0
            merged.set(k, acc)
          }
          const kept = [...merged.values()].sort((a, b) => a.month.localeCompare(b.month))
          return {
            group_by: groupBy,
            total_kg_co2e: round(kept.reduce((s, r) => s + r.kg_co2e, 0)),
            truncated,
            rows: kept.map((r) => compact({ ...r, kg_co2e: round(r.kg_co2e) })),
          }
        }

        const index = await loadFarmIndex()
        const scope = scopeFor(index, args.farm, args.parcel)
        const date = dateRange(args.from, args.to)
        const recs = await select<{
          id: string
          user_id: string | null
          farm_id: string | null
          farm_uuid: string | null
          parcel_id: string | null
          parcel_uuid: string | null
          date: string | null
          modulo: string
          kg_co2e: number | null
        }>(
          'records',
          {
            select: 'id,user_id,farm_id,farm_uuid,parcel_id,parcel_uuid,date,modulo,kg_co2e',
            kg_co2e: 'neq.0', // excludes NULL too; photo/master-data records carry kg_co2e = 0
            ...scope.params,
            date,
            ...CURRENT,
          },
          MAX_AGG_ROWS,
        )
        // v_gases has the CH4/N2O split but no farm reference → join on id with the rows above.
        const gases = await select<{ id: string; ch4_kg: number | null; n2o_kg: number | null; gwp_basis: string | null }>(
          'v_gases',
          { select: 'id,ch4_kg,n2o_kg,gwp_basis', kg_co2e: 'neq.0', date },
          MAX_AGG_ROWS,
        )
        const gasById = new Map(gases.rows.map((g) => [g.id, g]))

        const keyOf = (r: (typeof recs.rows)[number]) => {
          const farm = index.farmOf(r) ?? '(no farm)'
          switch (groupBy) {
            case 'parcel':
              return `${farm}/${r.parcel_uuid ?? r.parcel_id ?? '(no parcel)'}`
            case 'month':
              return (r.date ?? '').slice(0, 7) || '(no date)'
            case 'modulo':
              return r.modulo
            default:
              return farm
          }
        }
        const groups = new Map<string, { kg_co2e: number; ch4_kg: number; n2o_kg: number; records: number }>()
        const total = { kg_co2e: 0, ch4_kg: 0, n2o_kg: 0, records: 0 }
        const gwpBases = new Set<string>()
        for (const r of recs.rows) {
          const g = gasById.get(r.id)
          if (g?.gwp_basis) gwpBases.add(g.gwp_basis)
          const add = { kg_co2e: num(r.kg_co2e) ?? 0, ch4_kg: num(g?.ch4_kg) ?? 0, n2o_kg: num(g?.n2o_kg) ?? 0 }
          const k = keyOf(r)
          const acc = groups.get(k) ?? { kg_co2e: 0, ch4_kg: 0, n2o_kg: 0, records: 0 }
          for (const t of [acc, total]) {
            t.kg_co2e += add.kg_co2e
            t.ch4_kg += add.ch4_kg
            t.n2o_kg += add.n2o_kg
            t.records++
          }
          groups.set(k, acc)
        }
        const r3 = (o: typeof total) => ({
          kg_co2e: round(o.kg_co2e),
          ch4_kg: round(o.ch4_kg),
          n2o_kg: round(o.n2o_kg),
          records: o.records,
        })
        return {
          group_by: groupBy,
          ...(scope.farm ? { farm: scope.farm.id, farm_name: scope.farm.name } : {}),
          ...(args.parcel ? { parcel: args.parcel } : {}),
          period: { from: args.from ?? null, to: args.to ?? null },
          total: r3(total),
          gwp_basis: [...gwpBases],
          truncated: recs.truncated || gases.truncated,
          groups: [...groups.entries()]
            .map(([key, v]) => ({
              key,
              ...(groupBy === 'farm' || groupBy === 'parcel' ? { farm_name: index.name(key.split('/')[0]) } : {}),
              ...r3(v),
            }))
            .sort((a, b) => (groupBy === 'month' ? a.key.localeCompare(b.key) : b.kg_co2e - a.kg_co2e)),
        }
      },
    ),
  )

  // ------------------------------------------------------------ species
  server.registerTool(
    'eledger_species',
    {
      title: 'E-Ledger species observations',
      description:
        'Species found in the field (v_observations: species, group, confidence, position) and AI species identifications (v_species_ai: AI suggestion, score, confirmed, GBIF status), per farm/parcel and date range. Returns a per-species summary plus the most recent rows.',
      inputSchema: {
        farm: farmArg.optional(),
        parcel: parcelArg.optional(),
        from: isoDate.optional(),
        to: isoDate.optional(),
        source: z.enum(['observations', 'ai', 'both']).default('both'),
        limit: z.number().int().min(1).max(200).default(50).describe('Max rows returned per source (1-200)'),
      },
    },
    safe(
      async (args: { farm?: string; parcel?: string; from?: string; to?: string; source?: string; limit?: number }) => {
        const index = await loadFarmIndex()
        const scope = scopeFor(index, args.farm, args.parcel)
        const inScope = scoped(scope) ? await recordIdsIn(scope) : null
        const source = args.source ?? 'both'
        const limit = args.limit ?? 50
        const base: Params = { date: dateRange(args.from, args.to), order: 'date.desc.nullslast' }
        const out: Record<string, unknown> = scope.farm ? { farm: scope.farm.id, farm_name: scope.farm.name } : {}
        let truncated = inScope?.truncated ?? false

        if (source !== 'ai') {
          const obs = await select<{
            id: string
            farm_id: string | null
            parcel_id: string | null
            date: string | null
            lat: number | null
            lon: number | null
            earth_bric_id: string | null
            species: string | null
            grp: string | null
            confidence: string | number | null
            photo_path: string | null
          }>(
            'v_observations',
            { select: 'id,farm_id,parcel_id,date,lat,lon,earth_bric_id,species,grp,confidence,photo_path', ...base },
            MAX_VIEW_ROWS,
          )
          truncated ||= obs.truncated
          const rows = inScope ? obs.rows.filter((r) => inScope.ids.has(r.id)) : obs.rows
          const bySpecies = new Map<string, { species: string; grp: string | null; n: number; last_date: string | null }>()
          for (const r of rows) {
            const k = r.species ?? '(unknown)'
            const s = bySpecies.get(k) ?? { species: k, grp: r.grp, n: 0, last_date: null }
            s.n++
            if (r.date && (!s.last_date || r.date > s.last_date)) s.last_date = r.date
            bySpecies.set(k, s)
          }
          out.observations = {
            total: rows.length,
            species_count: bySpecies.size,
            by_species: [...bySpecies.values()].sort((a, b) => b.n - a.n).map((s) => compact(s)),
            recent: (await withFarms(rows.slice(0, limit), index)).map(({ photo_path, ...r }) =>
              compact({ ...r, has_photo: !!photo_path }),
            ),
          }
        }

        if (source !== 'observations') {
          const ai = await select<{
            id: string
            farm_id: string | null
            parcel_id: string | null
            date: string | null
            modulo: string | null
            ai_status: string | null
            species_ai: string | null
            score_ai: number | null
            source_ai: string | null
            species_used: string | null
            confirmed: boolean | null
            gbif_status: string | null
            gbif_n_50km: number | null
            photo_path: string | null
          }>(
            'v_species_ai',
            {
              select:
                'id,farm_id,parcel_id,date,modulo,ai_status,species_ai,score_ai,source_ai,species_used,confirmed,gbif_status,gbif_n_50km,photo_path',
              ...base,
            },
            MAX_VIEW_ROWS,
          )
          truncated ||= ai.truncated
          const rows = inScope ? ai.rows.filter((r) => inScope.ids.has(r.id)) : ai.rows
          const bySpecies = new Map<string, { species: string; n: number; confirmed: number }>()
          for (const r of rows) {
            const k = r.species_used ?? r.species_ai ?? '(unidentified)'
            const s = bySpecies.get(k) ?? { species: k, n: 0, confirmed: 0 }
            s.n++
            if (r.confirmed) s.confirmed++
            bySpecies.set(k, s)
          }
          out.ai_identifications = {
            total: rows.length,
            confirmed: rows.filter((r) => r.confirmed).length,
            by_species: [...bySpecies.values()].sort((a, b) => b.n - a.n),
            recent: (await withFarms(rows.slice(0, limit), index)).map(({ photo_path, ...r }) =>
              compact({ ...r, has_photo: !!photo_path }),
            ),
          }
        }
        return { ...out, truncated }
      },
    ),
  )

  // ------------------------------------------------------------ field measures
  server.registerTool(
    'eledger_field_measures',
    {
      title: 'E-Ledger field measurements',
      description:
        'Field measurements from v_field_measures: soil (suelo: texture, colour, earthworms), water (agua: type, flow l/min), rain (lluvia: mm vs Open-Meteo mm), canopy cover (cobertura: %), documents (papel) and audio/video, with on-site weather. Returns per-modulo aggregates plus the most recent rows.',
      inputSchema: {
        farm: farmArg.optional(),
        parcel: parcelArg.optional(),
        modulo: z.string().optional().describe('e.g. suelo, agua, lluvia, cobertura, papel'),
        from: isoDate.optional(),
        to: isoDate.optional(),
        limit: z.number().int().min(1).max(200).default(50).describe('Max rows returned (1-200)'),
      },
    },
    safe(
      async (args: { farm?: string; parcel?: string; modulo?: string; from?: string; to?: string; limit?: number }) => {
        const index = await loadFarmIndex()
        const scope = scopeFor(index, args.farm, args.parcel)
        const inScope = scoped(scope) ? await recordIdsIn(scope) : null
        const fm = await select<Record<string, unknown> & { id: string; farm_id: string | null; parcel_id: string | null; modulo: string | null }>(
          'v_field_measures',
          {
            select:
              'id,farm_id,parcel_id,date,lat,lon,earth_bric_id,modulo,activity_type,canopy_pct,soil_texture,soil_color,earthworms_n,water_type,flow_l_min,rain_mm,rain_openmeteo_mm,doc_type,alert,wx_temp_c,wx_rh,wx_hpa,wx_rain24_mm,wx_src,scale_ref,media_paths,photo_path',
            ...(args.modulo ? { modulo: `eq.${args.modulo}` } : {}),
            date: dateRange(args.from, args.to),
            order: 'date.desc.nullslast',
          },
          MAX_VIEW_ROWS,
        )
        const rows = inScope ? fm.rows.filter((r) => inScope.ids.has(r.id)) : fm.rows

        type Agg = { n: number; sums: Record<string, number>; counts: Record<string, number>; cats: Record<string, Record<string, number>> }
        const aggs = new Map<string, Agg>()
        for (const r of rows) {
          const m = r.modulo ?? '(none)'
          const a = aggs.get(m) ?? { n: 0, sums: {}, counts: {}, cats: {} }
          a.n++
          for (const f of ['rain_mm', 'rain_openmeteo_mm', 'canopy_pct', 'earthworms_n', 'flow_l_min']) {
            const v = num(r[f])
            if (v === null) continue
            a.sums[f] = (a.sums[f] ?? 0) + v
            a.counts[f] = (a.counts[f] ?? 0) + 1
          }
          for (const f of ['soil_texture', 'water_type', 'doc_type']) {
            const v = r[f]
            if (typeof v !== 'string' || !v) continue
            a.cats[f] ??= {}
            a.cats[f][v] = (a.cats[f][v] ?? 0) + 1
          }
          if (r.alert) a.sums.alerts = (a.sums.alerts ?? 0) + 1
          aggs.set(m, a)
        }
        const summary: Record<string, unknown> = {}
        for (const [m, a] of aggs) {
          const s: Record<string, unknown> = { n: a.n }
          if (a.counts.rain_mm) s.rain_mm_total = round(a.sums.rain_mm, 1)
          if (a.counts.rain_openmeteo_mm) s.rain_openmeteo_mm_total = round(a.sums.rain_openmeteo_mm, 1)
          if (a.counts.canopy_pct) s.canopy_pct_avg = round(a.sums.canopy_pct / a.counts.canopy_pct, 1)
          if (a.counts.earthworms_n) s.earthworms_avg = round(a.sums.earthworms_n / a.counts.earthworms_n, 1)
          if (a.counts.flow_l_min) s.flow_l_min_avg = round(a.sums.flow_l_min / a.counts.flow_l_min, 2)
          if (a.sums.alerts) s.alerts = a.sums.alerts
          Object.assign(s, a.cats)
          summary[m] = s
        }

        const limited = await withFarms(rows.slice(0, args.limit ?? 50), index)
        return {
          ...(scope.farm ? { farm: scope.farm.id, farm_name: scope.farm.name } : {}),
          total: rows.length,
          truncated: fm.truncated || (inScope?.truncated ?? false),
          summary,
          recent: limited.map(({ media_paths, photo_path, ...r }) =>
            compact({
              ...r,
              has_photo: !!photo_path,
              media_count: Array.isArray(media_paths) ? media_paths.length : undefined,
            }),
          ),
        }
      },
    ),
  )

  // ------------------------------------------------------------ photo url
  server.registerTool(
    'eledger_photo_url',
    {
      title: 'E-Ledger photo link',
      description:
        'Temporary (1 hour) signed link to the photo of one E-Ledger record (record id from eledger_records, eledger_species or eledger_field_measures).',
      inputSchema: { record_id: z.string().min(1) },
    },
    safe(async ({ record_id }: { record_id: string }) => {
      const { rows } = await select<{ photo_path: string | null }>(
        'records',
        { select: 'photo_path', id: `eq.${record_id}` },
        1,
      )
      if (!rows.length) throw new Error(`No record with id "${record_id}"`)
      if (!rows[0].photo_path) throw new Error(`Record "${record_id}" has no photo`)
      const url = await signPhotoUrl(rows[0].photo_path, 3600)
      return { record_id, url, expires_in_seconds: 3600 }
    }),
  )
}

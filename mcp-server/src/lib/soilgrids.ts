/**
 * SoilGrids (ISRIC) client — free global soil property maps, no key required.
 * Docs: https://www.isric.org/explore/soilgrids/faq-soilgrids#What_do_the_filenames_mean
 * Used to cover ground SoilSense sensors don't reach, not to replace them.
 */

const PROPERTIES = ['phh2o', 'soc', 'clay', 'sand', 'nitrogen'] as const

export interface SoilProperties {
  latitude: number
  longitude: number
  depth: string
  phH2o: number | null
  socGPerKg: number | null
  clayPct: number | null
  sandPct: number | null
  nitrogenGPerKg: number | null
}

// SoilGrids reports scaled integers (e.g. pH*10, g/kg*10) — see unit_measure.d_factor per layer.
function unscale(value: number | undefined, dFactor: number): number | null {
  return value === undefined ? null : value / dFactor
}

export async function fetchSoilProperties(lat: number, lon: number, depth = '0-5cm'): Promise<SoilProperties> {
  const params = new URLSearchParams({ lon: String(lon), lat: String(lat), depth, value: 'mean' })
  for (const p of PROPERTIES) params.append('property', p)

  const res = await fetch(`https://rest.isric.org/soilgrids/v2.0/properties/query?${params}`)
  if (!res.ok) throw new Error(`SoilGrids query failed: ${res.status}`)
  const json = await res.json()

  const layers: Array<{ name: string; unit_measure: { d_factor: number }; depths: Array<{ label: string; values: { mean?: number } }> }> =
    json.properties?.layers ?? []

  const meanFor = (name: string) => {
    const layer = layers.find((l) => l.name === name)
    const d = layer?.depths.find((d) => d.label === depth)
    return layer && d ? unscale(d.values.mean, layer.unit_measure.d_factor) : null
  }

  return {
    latitude: lat,
    longitude: lon,
    depth,
    phH2o: meanFor('phh2o'),
    socGPerKg: meanFor('soc'),
    clayPct: meanFor('clay'),
    sandPct: meanFor('sand'),
    nitrogenGPerKg: meanFor('nitrogen'),
  }
}

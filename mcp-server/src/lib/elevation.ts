/**
 * OpenTopoData client — free SRTM30m elevation lookups, no key required.
 * Docs: https://www.opentopodata.org/
 * Public instance is rate-limited to ~1 req/sec; fine for occasional estate-level lookups.
 */

export interface ElevationPoint {
  latitude: number
  longitude: number
  elevationM: number | null
}

export async function fetchElevation(lat: number, lon: number): Promise<ElevationPoint> {
  const res = await fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lon}`)
  if (!res.ok) throw new Error(`OpenTopoData query failed: ${res.status}`)
  const json = await res.json()

  const result = json.results?.[0]
  return {
    latitude: lat,
    longitude: lon,
    elevationM: result?.elevation ?? null,
  }
}

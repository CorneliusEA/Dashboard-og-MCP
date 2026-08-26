/**
 * NASA FIRMS (Fire Information for Resource Management System) client.
 * Docs: https://firms.modaps.eosdis.nasa.gov/api/area/
 *
 * Free, but requires a MAP_KEY — get one instantly at
 * https://firms.modaps.eosdis.nasa.gov/api/area/ (no approval wait, just an
 * email signup). Set FIRMS_MAP_KEY once obtained; unlike the other free
 * sources in this file, this one is UNTESTED against a real key so far —
 * verify against real credentials before relying on it.
 */

export interface FirePoint {
  latitude: number
  longitude: number
  brightnessK: number | null
  acqDate: string
  acqTime: string
  confidence: string
  satellite: string
}

function parseCsv(csv: string): FirePoint[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',')
  const idx = (name: string) => headers.indexOf(name)

  return lines.slice(1).map((line) => {
    const cols = line.split(',')
    return {
      latitude: Number(cols[idx('latitude')]),
      longitude: Number(cols[idx('longitude')]),
      brightnessK: idx('bright_ti4') >= 0 ? Number(cols[idx('bright_ti4')]) : idx('brightness') >= 0 ? Number(cols[idx('brightness')]) : null,
      acqDate: cols[idx('acq_date')],
      acqTime: cols[idx('acq_time')],
      confidence: cols[idx('confidence')],
      satellite: cols[idx('satellite')],
    }
  })
}

export async function fetchFireAlerts(
  bbox: [number, number, number, number],
  dayRange = 3,
  source: 'VIIRS_SNPP_NRT' | 'MODIS_NRT' = 'VIIRS_SNPP_NRT',
): Promise<FirePoint[]> {
  const mapKey = process.env.FIRMS_MAP_KEY
  if (!mapKey) throw new Error('FIRMS: FIRMS_MAP_KEY not configured — get a free key at firms.modaps.eosdis.nasa.gov/api/area')

  const [minLon, minLat, maxLon, maxLat] = bbox
  const area = `${minLon},${minLat},${maxLon},${maxLat}`

  const res = await fetch(
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${area}/${dayRange}`,
  )
  if (!res.ok) throw new Error(`FIRMS fire alerts failed: ${res.status}`)
  const csv = await res.text()
  return parseCsv(csv)
}

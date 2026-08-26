/**
 * Global Forest Watch (GFW) Data API client.
 * Docs: https://data-api.globalforestwatch.org/
 *
 * Free, but requires an API key — self-serve via My GFW account
 * (globalforestwatch.org → sign up → Developer → Create API key, no
 * approval wait). Set GFW_API_KEY once obtained.
 *
 * UNTESTED against a real key so far. The request shape (POST with
 * {sql, geometry}, `x-api-key` header) is confirmed correct up to the
 * auth check — GFW's API returns the generic "missing API key" error
 * for this exact shape rather than a body-validation error, which is as
 * far as this could be verified without a real key. Field names
 * (`umd_tree_cover_loss__year`, `gfw_integrated_alerts__date`,
 * `gfw_integrated_alerts__confidence`) follow GFW's documented
 * `dataset__field` naming convention but are not independently confirmed
 * — verify the actual response shape once a key is available.
 */

function bboxToGeoJSON(bbox: [number, number, number, number]) {
  const [minLon, minLat, maxLon, maxLat] = bbox
  return {
    type: 'Polygon',
    coordinates: [
      [
        [minLon, minLat],
        [maxLon, minLat],
        [maxLon, maxLat],
        [minLon, maxLat],
        [minLon, minLat],
      ],
    ],
  }
}

async function query(dataset: string, sql: string, bbox: [number, number, number, number]): Promise<any> {
  const apiKey = process.env.GFW_API_KEY
  if (!apiKey) throw new Error('GFW: GFW_API_KEY not configured — get a free key at globalforestwatch.org (My GFW → Developer)')

  const res = await fetch(`https://data-api.globalforestwatch.org/dataset/${dataset}/latest/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ sql, geometry: bboxToGeoJSON(bbox) }),
  })
  if (!res.ok) throw new Error(`GFW query failed: ${res.status} — ${await res.text()}`)
  const json = await res.json()
  return json.data ?? json
}

export interface TreeCoverLossYear {
  year: number
  areaHa: number
}

export async function fetchTreeCoverLoss(bbox: [number, number, number, number]): Promise<TreeCoverLossYear[]> {
  const rows = await query(
    'umd_tree_cover_loss',
    'SELECT umd_tree_cover_loss__year AS year, SUM(area__ha) AS area_ha FROM data WHERE umd_tree_cover_loss__year IS NOT NULL GROUP BY umd_tree_cover_loss__year ORDER BY umd_tree_cover_loss__year',
    bbox,
  )
  return (rows ?? []).map((r: any) => ({ year: r.year, areaHa: r.area_ha }))
}

export interface DeforestationAlertsSummary {
  totalAlerts: number
  sinceDate: string
}

export async function fetchRecentAlerts(bbox: [number, number, number, number], sinceDate: string): Promise<DeforestationAlertsSummary> {
  const rows = await query(
    'gfw_integrated_alerts',
    `SELECT COUNT(*) AS total FROM data WHERE gfw_integrated_alerts__date >= '${sinceDate}'`,
    bbox,
  )
  return { totalAlerts: rows?.[0]?.total ?? 0, sinceDate }
}

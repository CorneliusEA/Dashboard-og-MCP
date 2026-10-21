/**
 * Sentinel Hub client (Copernicus) — ported from Dashboard repo src/lib/sentinel.ts
 * Docs: https://docs.sentinel-hub.com
 */

// Tightened 2026-10-21 after an external QA pass flagged real data
// contamination from the original wide estate boxes: sentinel_ndvi's mean
// for Xoco (0.22, low for tropical vegetation) and gbif_biodiversity's top
// species for Cocabo (a seabird, Fregata magnificens) both traced back to
// the same cause — every tool in this file shared one BBOXES constant sized
// for "the area around the farm", which for Cocabo included a large chunk
// of the Bocas del Toro archipelago/open sea and for Xoco included a large
// chunk of the lake ("El Lago"). Unlike the Dashboard app, nothing in this
// MCP server needs the wider "surrounding context" framing (that's a
// Dashboard-only land-cover-map feature, with its own separate BBOXES
// constant, deliberately left wide and untouched) — every tool here wants a
// farm-focused point/area estimate, so tightening this one constant fixes
// sentinel_ndvi, sentinel_sar, gbif_biodiversity, weather, soilgrids,
// elevation, fire_alerts, and global_forest_watch all at once.
//
// Xoco: the real Forsler-derived property boundary (confirmed live
// 2026-09-04, see Dashboard's /api/xoco/map), not a hand-picked box.
//
// Cocabo: no single estate boundary exists — it's a cooperative of
// scattered smallholders (only 2 individually registered in Forsler so
// far, confirmed 2026-09-04: Amalia Miranda Jimenez ~[-82.443,9.247,
// -82.442,9.248], Margenia Abrego ~[-82.327,9.162,-82.326,9.164]). This is
// a padded box around both known real plots, verified via SRTM elevation
// lookups at each corner (4 of 5 sample points showed real land elevation
// up to 491m; only the NE corner was ambiguous at 0.0, which SRTM reports
// for both sea level and actual sea — not re-checked further since it's a
// single corner pixel, not representative of the box as a whole). Revisit
// if more Cocabo farmers get registered in Forsler — a real multi-plot
// convex hull would be better grounded than this estimate.
export const BBOXES = {
  cocabo: [-82.45, 9.14, -82.31, 9.27] as [number, number, number, number],
  xoco: [-86.35638, 12.28351, -86.34386, 12.29455] as [number, number, number, number],
}

let cachedToken: { token: string; expires: number } | null = null

export async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) return cachedToken.token

  const res = await fetch(
    'https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.SENTINEL_CLIENT_ID ?? '',
        client_secret: process.env.SENTINEL_CLIENT_SECRET ?? '',
      }),
    },
  )
  if (!res.ok) throw new Error(`Sentinel auth failed: ${res.status}`)
  const json = await res.json()
  cachedToken = { token: json.access_token, expires: Date.now() + (json.expires_in - 60) * 1000 }
  return cachedToken.token
}

export interface SentinelStats {
  ndviMean: number | null
  ndviMin: number | null
  ndviMax: number | null
  date: string
}

export async function fetchNDVI(bbox: [number, number, number, number] = BBOXES.cocabo): Promise<SentinelStats> {
  const token = await getToken()

  const to = new Date().toISOString().split('T')[0]
  // 90 days + relaxed cloud threshold + leastCC mosaicking, not the original
  // 30-day/30%-cloud window. Confirmed necessary 2026-10-21 after tightening
  // BBOXES.xoco to the real (much smaller, ~1.1km) property boundary: the
  // smaller the area, the more likely a fixed 30-day window has zero
  // cloud-free Sentinel-2 passes over it, especially in Nicaragua's rainy
  // season — this returned all-null (ndviMean/Min/Max) for Xoco with the
  // tighter bbox before this fix, confirmed live. Same fix already proven
  // for the land-cover renderer in the Dashboard app (fetchLandCoverImage).
  const from = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]

  // Sentinel Hub Statistics API caps output at 2500x2500px. A fixed 0.0001°
  // resolution overflows that for anything wider than ~0.25°, so derive
  // resx/resy from the bbox instead (capped at 2000px per side for headroom).
  const [minLon, minLat, maxLon, maxLat] = bbox
  const resx = Math.max((maxLon - minLon) / 2000, 0.0001)
  const resy = Math.max((maxLat - minLat) / 2000, 0.0001)

  const body = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [
        {
          type: 'sentinel-2-l2a',
          dataFilter: {
            timeRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
            maxCloudCoverage: 80,
            mosaickingOrder: 'leastCC',
          },
        },
      ],
    },
    aggregation: {
      timeRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
      aggregationInterval: { of: 'P30D' },
      resx,
      resy,
      evalscript: `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04","B08","dataMask"], units:"DN" }],
    output: [
      { id: "default", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  const ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
  return { default: [ndvi], dataMask: [s.dataMask] };
}`,
    },
    calculations: { default: { statistics: { default: { percentiles: { k: [25, 75] } } } } },
  }

  const res = await fetch('https://services.sentinel-hub.com/api/v1/statistics', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Sentinel stats failed: ${res.status}`)
  const json = await res.json()

  const interval = json.data?.[0]
  const stats = interval?.outputs?.default?.bands?.B0?.stats

  // Sentinel Hub's Statistics API can return the JSON strings "Infinity"/
  // "-Infinity"/"NaN" for degenerate pixels instead of a number (confirmed
  // for the sentinel_sar tool, same API) — normalize those to null rather
  // than passing them through as if they were real numbers.
  const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

  return {
    ndviMean: finite(stats?.mean),
    ndviMin: finite(stats?.min),
    ndviMax: finite(stats?.max),
    date: interval?.interval?.from?.split('T')[0] ?? from,
  }
}

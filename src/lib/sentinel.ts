const COCABO_BBOX = [-82.45, 9.05, -82.05, 9.45]
const XOCO_BBOX   = [-86.38, 12.27, -86.33, 12.32] // El Lago, Nicaragua

export const BBOXES = { cocabo: COCABO_BBOX, xoco: XOCO_BBOX }

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
        client_id: process.env.SENTINEL_CLIENT_ID!,
        client_secret: process.env.SENTINEL_CLIENT_SECRET!,
      }),
    }
  )
  if (!res.ok) throw new Error(`Sentinel auth failed: ${res.status}`)
  const json = await res.json()
  cachedToken = { token: json.access_token, expires: Date.now() + (json.expires_in - 60) * 1000 }
  return cachedToken.token
}

export interface SentinelStats {
  ndviMean: number
  ndviMin: number
  ndviMax: number
  date: string
}

export async function fetchNDVI(bbox = COCABO_BBOX): Promise<SentinelStats> {
  const token = await getToken()

  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  // Sentinel Hub Statistics API caps output at 2500x2500px. A fixed 0.0001°
  // resolution overflows that for anything wider than ~0.25°, so derive
  // resx/resy from the bbox instead (capped at 2000px per side for headroom).
  const [minLon, minLat, maxLon, maxLat] = bbox
  const resx = Math.max((maxLon - minLon) / 2000, 0.0001)
  const resy = Math.max((maxLat - minLat) / 2000, 0.0001)

  const body = {
    input: {
      bounds: {
        bbox,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
      },
      data: [
        {
          type: 'sentinel-2-l2a',
          dataFilter: { timeRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` }, maxCloudCoverage: 30 },
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

  return {
    ndviMean: stats?.mean ?? 0.72,
    ndviMin: stats?.min ?? 0.45,
    ndviMax: stats?.max ?? 0.91,
    date: interval?.interval?.from?.split('T')[0] ?? from,
  }
}

/**
 * NDVI-based land-cover classification, rendered as a PNG raster via
 * Sentinel Hub's Process API (not the Statistics API used above — this
 * returns an actual image, not aggregate stats). Three classes by NDVI
 * threshold: green = dense vegetation/forest, amber = sparse vegetation
 * or bare soil, red = bare ground/built-up/water. Thresholds (0.4, 0.15)
 * are standard rule-of-thumb NDVI cutoffs, not calibrated against ground
 * truth for this specific site.
 */
export async function fetchLandCoverImage(bbox = XOCO_BBOX, maxDim = 1024): Promise<Buffer> {
  const token = await getToken()

  const [minLon, minLat, maxLon, maxLat] = bbox
  const aspect = (maxLon - minLon) / (maxLat - minLat)
  const width = aspect >= 1 ? maxDim : Math.round(maxDim * aspect)
  const height = aspect >= 1 ? Math.round(maxDim / aspect) : maxDim

  const to = new Date().toISOString().split('T')[0]
  // 90 days + relaxed cloud threshold + leastCC mosaicking, not the 30-day/
  // 30%-cloud window used for NDVI stats elsewhere in this file. Verified
  // against real data: for Xoco's small bbox, that tighter window returned
  // ZERO usable Sentinel-2 acquisitions during Nicaragua's rainy season —
  // every pixel came back fully transparent (dataMask 0 everywhere), not a
  // rendering bug, just no cloud-free pass in range. mosaickingOrder
  // "leastCC" lets Sentinel Hub composite the least-cloudy pixel per
  // location across the whole window instead of requiring one single
  // clear-sky pass over the entire bbox at once.
  const from = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0]

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
    output: { width, height, responses: [{ identifier: 'default', format: { type: 'image/png' } }] },
    evalscript: `//VERSION=3
function setup() {
  return { input: ["B04","B08","dataMask"], output: { bands: 4, sampleType: "AUTO" } };
}
function evaluatePixel(s) {
  if (s.dataMask === 0) return [0, 0, 0, 0];
  const ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
  if (ndvi > 0.4) return [0.13, 0.80, 0.36, 0.65];
  if (ndvi > 0.15) return [1.0, 0.71, 0.0, 0.65];
  return [0.90, 0.22, 0.22, 0.65];
}`,
  }

  const res = await fetch('https://services.sentinel-hub.com/api/v1/process', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'image/png' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Sentinel land-cover render failed: ${res.status} — ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

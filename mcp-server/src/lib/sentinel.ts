/**
 * Sentinel Hub client (Copernicus) — ported from Dashboard repo src/lib/sentinel.ts
 * Docs: https://docs.sentinel-hub.com
 */

export const BBOXES = {
  cocabo: [-82.45, 9.05, -82.05, 9.45] as [number, number, number, number],
  xoco: [-86.38, 12.27, -86.33, 12.32] as [number, number, number, number],
}

let cachedToken: { token: string; expires: number } | null = null

async function getToken(): Promise<string> {
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
  ndviMean: number
  ndviMin: number
  ndviMax: number
  date: string
}

export async function fetchNDVI(bbox: [number, number, number, number] = BBOXES.cocabo): Promise<SentinelStats> {
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
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
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
    ndviMean: stats?.mean ?? null,
    ndviMin: stats?.min ?? null,
    ndviMax: stats?.max ?? null,
    date: interval?.interval?.from?.split('T')[0] ?? from,
  }
}

/**
 * Sentinel-1 SAR (radar) via Sentinel Hub — same credentials/auth as
 * src/lib/sentinel.ts (Sentinel-2 NDVI), just a different `data.type`.
 * SAR backscatter penetrates cloud cover and is sensitive to soil/canopy
 * moisture, unlike optical NDVI. Docs: https://docs.sentinel-hub.com
 */
import { getToken } from './sentinel.js'

export interface SarStats {
  vvMean: number | null
  vvMin: number | null
  vvMax: number | null
  vhMean: number | null
  vhMin: number | null
  vhMax: number | null
  date: string
}

export async function fetchSAR(bbox: [number, number, number, number]): Promise<SarStats> {
  const token = await getToken()

  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  // Coarser than sentinel.ts's NDVI /2000: GAMMA0_TERRAIN orthorectification
  // is much more expensive per-pixel than optical NDVI, and /2000 was both
  // slow (~47s for Cocabo) and produced degenerate stats (Sentinel Hub
  // returning the JSON string "Infinity" for mean/max on some pixels).
  const [minLon, minLat, maxLon, maxLat] = bbox
  const resx = Math.max((maxLon - minLon) / 1000, 0.0002)
  const resy = Math.max((maxLat - minLat) / 1000, 0.0002)

  const body = {
    input: {
      bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [
        {
          type: 'sentinel-1-grd',
          dataFilter: {
            timeRange: { from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
            acquisitionMode: 'IW',
            polarization: 'DV',
            resolution: 'HIGH',
          },
          processing: { orthorectify: true, backCoeff: 'GAMMA0_TERRAIN' },
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
    input: [{ bands: ["VV","VH","dataMask"] }],
    output: [
      { id: "default", bands: 2, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  return { default: [s.VV, s.VH], dataMask: [s.dataMask] };
}`,
    },
    calculations: { default: { statistics: { default: { percentiles: { k: [25, 75] } } } } },
  }

  const res = await fetch('https://services.sentinel-hub.com/api/v1/statistics', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Sentinel-1 SAR stats failed: ${res.status}`)
  const json = await res.json()

  const interval = json.data?.[0]
  const vv = interval?.outputs?.default?.bands?.B0?.stats
  const vh = interval?.outputs?.default?.bands?.B1?.stats

  // Sentinel Hub Statistics API can return the JSON strings "Infinity"/
  // "-Infinity"/"NaN" for degenerate pixels (radar layover/shadow) instead
  // of a number — normalize those to null rather than passing them through.
  const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

  return {
    vvMean: finite(vv?.mean),
    vvMin: finite(vv?.min),
    vvMax: finite(vv?.max),
    vhMean: finite(vh?.mean),
    vhMin: finite(vh?.min),
    vhMax: finite(vh?.max),
    date: interval?.interval?.from?.split('T')[0] ?? from,
  }
}

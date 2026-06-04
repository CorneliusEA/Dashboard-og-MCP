export interface ForslerMap {
  id: string
  name: string
  estateName?: string
  categories: string[]
  bbox?: [number, number, number, number]
  creationDate: string
  lastModifiedDate: string
}

export interface ForslerGeometry {
  type: 'Point' | 'Polygon' | 'MultiPolygon' | 'LineString'
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

export interface ForslerFeature {
  id: string
  name?: string
  categories: string[]
  geometry?: ForslerGeometry
  properties?: Record<string, unknown>
}

const BASE_URL = (process.env.FORSLER_BASE_URL ?? 'https://foresting-tomorrow-public-4yr7fia4nq-ey.a.run.app').replace(/\/$/, '')
const API_KEY = process.env.FORSLER_API_KEY ?? ''
const ORG_ID = process.env.FORSLER_ORGANIZATION_ID ?? ''

async function request<T>(path: string, extraParams: Record<string, string> = {}): Promise<T> {
  const url = new URL(BASE_URL + path)
  url.searchParams.set('key', API_KEY)
  for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v)

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' }, next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`Forsler ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export async function searchMaps(orgId = ORG_ID): Promise<ForslerMap[]> {
  const query = JSON.stringify({ type: 'organization', id: orgId })
  return request<ForslerMap[]>('/crud/map/search', { query })
}

export async function getMap(mapId: string): Promise<ForslerMap> {
  return request<ForslerMap>(`/crud/map/${mapId}`)
}

export async function searchMapFeatures(mapId: string): Promise<ForslerFeature[]> {
  return request<ForslerFeature[]>(`/crud/map/${mapId}/feature/search`)
}

export async function getMapFeature(mapId: string, featureId: string): Promise<ForslerFeature> {
  return request<ForslerFeature>(`/crud/map/${mapId}/feature/${featureId}`)
}

// COCABO bbox: Bocas del Toro, Panama
const COCABO_BBOX = { minLon: -82.6, maxLon: -81.9, minLat: 8.9, maxLat: 9.6 }

export function isCocaboMap(map: ForslerMap): boolean {
  if (!map.bbox) return false
  const [minLon, minLat, maxLon, maxLat] = map.bbox
  return (
    minLon > COCABO_BBOX.minLon && maxLon < COCABO_BBOX.maxLon &&
    minLat > COCABO_BBOX.minLat && maxLat < COCABO_BBOX.maxLat
  )
}

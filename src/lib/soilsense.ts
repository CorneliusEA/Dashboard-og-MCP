/**
 * SoilSense API client
 * Docs: https://api.staging.soilsense.io/docs
 * Auth: email/password → Bearer token
 */

const BASE_URL = process.env.SOILSENSE_BASE_URL || 'https://api.staging.soilsense.io'
const EMAIL    = process.env.SOILSENSE_EMAIL    || 'ns@futureforest.io'
const PASSWORD = process.env.SOILSENSE_PASSWORD || '3120chili'

export interface SoilSensor {
  id: string
  name: string
  location?: string
  lat?: number
  lon?: number
  online: boolean
  lastSeen?: string
}

export interface SoilReading {
  sensorId: string
  timestamp: string
  soilTemperature?: number      // °C
  soilMoisture?: number         // % volumetric water content
  plantAvailableWater?: number  // % of field capacity
  electricalConductivity?: number // dS/m
  batteryVoltage?: number
}

let cachedToken: string | null = null
let tokenExpiry = 0

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })

  if (!res.ok) throw new Error(`SoilSense auth failed: ${res.status}`)

  const data = await res.json()
  // Common token field names — adjust once docs are confirmed
  cachedToken = data.token ?? data.access_token ?? data.accessToken ?? data.jwt
  if (!cachedToken) throw new Error('SoilSense: no token in auth response')

  // Default 1h expiry; adjust if API returns expires_in
  tokenExpiry = Date.now() + (data.expires_in ? data.expires_in * 1000 : 3600_000)
  return cachedToken
}

async function apiFetch<T>(path: string): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    next: { revalidate: 300 }, // 5-min cache
  })
  if (!res.ok) throw new Error(`SoilSense ${path} → ${res.status}`)
  return res.json()
}

export async function getSensors(): Promise<SoilSensor[]> {
  // Try common endpoint patterns; update once docs confirm
  try {
    const data = await apiFetch<SoilSensor[] | { sensors: SoilSensor[] } | { data: SoilSensor[] }>('/sensors')
    if (Array.isArray(data)) return data
    if ('sensors' in data) return data.sensors
    if ('data' in data) return data.data
    return []
  } catch {
    // Fallback: try /api/sensors or /v1/sensors
    const data = await apiFetch<SoilSensor[]>('/api/sensors')
    return Array.isArray(data) ? data : []
  }
}

export async function getLatestReadings(): Promise<SoilReading[]> {
  try {
    const data = await apiFetch<SoilReading[] | { readings: SoilReading[] } | { data: SoilReading[] }>('/sensors/readings/latest')
    if (Array.isArray(data)) return data
    if ('readings' in data) return data.readings
    if ('data' in data) return data.data
    return []
  } catch {
    const data = await apiFetch<SoilReading[]>('/api/sensors/readings/latest')
    return Array.isArray(data) ? data : []
  }
}

export async function getSensorReadings(
  sensorId: string,
  from?: string,
  to?: string,
): Promise<SoilReading[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString() ? `?${params}` : ''
  try {
    const data = await apiFetch<SoilReading[] | { readings: SoilReading[] }>(`/sensors/${sensorId}/readings${qs}`)
    if (Array.isArray(data)) return data
    if ('readings' in data) return data.readings
    return []
  } catch {
    return []
  }
}

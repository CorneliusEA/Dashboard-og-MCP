/**
 * SoilSense client — ported from Dashboard repo src/lib/soilsense.ts
 * Docs: https://api.staging.soilsense.io/docs
 * Auth: email/password → Bearer token
 *
 * NOTE: no hardcoded credential fallback here — SOILSENSE_EMAIL/PASSWORD
 * must be set as real env vars. If unset, calls fail loudly instead of
 * silently using a shared account.
 */

const BASE_URL = process.env.SOILSENSE_BASE_URL || 'https://api.staging.soilsense.io'

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
  soilTemperature?: number
  soilMoisture?: number
  plantAvailableWater?: number
  electricalConductivity?: number
  batteryVoltage?: number
}

let cachedToken: string | null = null
let tokenExpiry = 0

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const email = process.env.SOILSENSE_EMAIL
  const password = process.env.SOILSENSE_PASSWORD
  if (!email || !password) {
    throw new Error('SoilSense: SOILSENSE_EMAIL / SOILSENSE_PASSWORD not configured')
  }

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) throw new Error(`SoilSense auth failed: ${res.status}`)

  const data = await res.json()
  cachedToken = data.token ?? data.access_token ?? data.accessToken ?? data.jwt
  if (!cachedToken) throw new Error('SoilSense: no token in auth response')

  tokenExpiry = Date.now() + (data.expires_in ? data.expires_in * 1000 : 3600_000)
  return cachedToken
}

async function apiFetch<T>(path: string): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`SoilSense ${path} → ${res.status}`)
  return res.json()
}

export async function getSensors(): Promise<SoilSensor[]> {
  const data = await apiFetch<SoilSensor[] | { sensors: SoilSensor[] } | { data: SoilSensor[] }>('/sensors')
  if (Array.isArray(data)) return data
  if ('sensors' in data) return data.sensors
  if ('data' in data) return data.data
  return []
}

export async function getLatestReadings(): Promise<SoilReading[]> {
  const data = await apiFetch<SoilReading[] | { readings: SoilReading[] } | { data: SoilReading[] }>('/sensors/readings/latest')
  if (Array.isArray(data)) return data
  if ('readings' in data) return data.readings
  if ('data' in data) return data.data
  return []
}

export async function getSensorReadings(sensorId: string, from?: string, to?: string): Promise<SoilReading[]> {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const qs = params.toString() ? `?${params}` : ''
  const data = await apiFetch<SoilReading[] | { readings: SoilReading[] }>(`/sensors/${sensorId}/readings${qs}`)
  if (Array.isArray(data)) return data
  if ('readings' in data) return data.readings
  return []
}

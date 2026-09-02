/**
 * SoilSense client — rewritten 2026-09-02 against the real production API.
 * The original implementation targeted api.staging.soilsense.io with
 * email/password auth, following an outdated integration guide; SoilSense
 * confirmed that staging host is no longer available. The real API is
 * entirely different: host, auth method, and endpoints all changed.
 * Docs: https://www.soilsense.io/blog/integrate-soil-moisture-data-api-webhooks
 *
 * Auth: a single API key (created in SoilSense account settings) sent as
 * the `x-api-key` header — no login flow, no token refresh.
 *
 * Confirmed live 2026-09-02 against a real farm (Finca del Lago,
 * Nicaragua — Xoco). No pH or nutrient fields exist anywhere in the
 * response shape; SoilSense's docs don't mention them either, so this
 * data likely isn't measured by their sensors, not just unexposed by the
 * API. Depth readings are named top/mid/midBot/bot — mid/midBot come back
 * as empty objects for sites with only two cables (top+bottom) configured,
 * which is the case for both current Xoco sites.
 */

const BASE_URL = process.env.SOILSENSE_BASE_URL || 'https://api.app.soilsense.io'

function apiKey(): string {
  const key = process.env.SOILSENSE_API_KEY
  if (!key) throw new Error('SoilSense: SOILSENSE_API_KEY not configured')
  return key
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'x-api-key': apiKey(), Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`SoilSense ${path} → ${res.status}`)
  return res.json()
}

export interface SiteConfig {
  depth: number
  calibration: { fieldCapacity: number; wiltingPoint: number }
}

export interface ObservationSite {
  id: string
  name: string
  coordinates: { lat: number; lng: number }
  cropType?: string
  locationType?: string
  active: boolean
  currentDataLogger?: { id: number; name: string }
  configuration?: { cableTop?: SiteConfig; cableBottom?: SiteConfig }
}

export interface Farm {
  id: string
  name: string
  location: { coordinates: { lat: number; lng: number }; country: string; countryCode: string }
  observationSites: ObservationSite[]
}

export async function getFarm(): Promise<Farm> {
  return apiFetch<Farm>('/api/farm')
}

export interface SiteListEntry {
  id: string
  name: string
  active: boolean
  currentDataLoggerId?: number
}

export async function getSites(): Promise<SiteListEntry[]> {
  return apiFetch<SiteListEntry[]>('/api/farm/sites')
}

export interface DepthReading {
  dielPerm?: number
  salinityBulk?: number
  salinityPorewater?: number
  volumetricWaterContent?: number
  temperature?: number
  plantAvailableWater?: number
  rawMes?: number
}

export interface Observation {
  timestamp: number
  rssi?: number
  data: {
    top?: DepthReading
    mid?: DepthReading
    midBot?: DepthReading
    bot?: DepthReading
    box?: { batteryVoltage?: number; temperature?: number }
    status?: { irrigationStatus?: string; irrigationStatusColorSuggestion?: string }
  }
}

export async function getLatestObservation(siteId: string): Promise<Observation> {
  return apiFetch<Observation>(`/api/site/${siteId}/observations/latest`)
}

export async function getObservationHistory(siteId: string): Promise<Observation[]> {
  // The API accepted from/to query params without erroring, but returned
  // identical results with and without them in testing — date filtering is
  // NOT confirmed to actually work. This currently just returns whatever
  // window the API defaults to (~21 readings / ~7 hours in testing) rather
  // than claiming date-range support that isn't verified.
  return apiFetch<Observation[]>(`/api/site/${siteId}/observations`)
}

export interface PrecipitationReading {
  timestamp: number
  value: number
}

export async function getPrecipitation(siteId: string): Promise<PrecipitationReading[]> {
  return apiFetch<PrecipitationReading[]>(`/api/site/${siteId}/precipitation`)
}

/**
 * 3Bee / XNatura client — Oasi platform API.
 *
 * Confirmed 2026-08-24 by reading the live OpenAPI spec at
 * https://platform.3bee.com/openapi.json (720 routes, title "Oasi"),
 * after finding the real base URL via DNS/nginx fingerprinting from the
 * marketing page at ilovenatura.com/tools/mcp:
 *   - Base URL: https://platform.3bee.com (NOT api.3bee.com — that host
 *     exists but 404s on every real route)
 *   - Auth: X-Api-Key header (securityScheme "APIKeyHeader"), generated
 *     from platform Settings → API keys. NOT a Bearer token.
 *   - Routes are scoped by {user_slug}/sites/{site_id} — user_slug for
 *     this account is "earth-surveillance" (visible in the platform URL
 *     and confirmed via GET /v1/users/me/sites).
 *   - site_id 101561 = "Xoco Gourmet, El Lago" (the Xoco/Nicaragua estate).
 *     COCABO does not have a 3Bee site as of this writing.
 *
 * Verified live: GET .../observations/kpis and .../observations/all_kpis
 * both return real biodiversity data (species clusters, Shannon/Simpson
 * diversity indexes, etc).
 */

const BASE_URL = (process.env.XNATURA_BASE_URL ?? 'https://platform.3bee.com').replace(/\/$/, '')
const USER_SLUG = process.env.XNATURA_USER_SLUG ?? 'earth-surveillance'
const SITE_ID = process.env.XNATURA_SITE_ID ?? '101561'

export interface XNaturaData {
  siteId: string
  kpis: unknown
  observations: unknown
}

async function apiFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.XNATURA_API_KEY
  if (!apiKey) throw new Error('XNatura: XNATURA_API_KEY not configured')

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`3Bee ${path} → ${res.status}`)
  return res.json()
}

export async function getBiodiversity(): Promise<XNaturaData> {
  const base = `/v1/monitoring/${USER_SLUG}/sites/${SITE_ID}`

  const [kpis, observations] = await Promise.all([
    apiFetch(`${base}/observations/all_kpis`),
    apiFetch(`${base}/observations`),
  ])

  return { siteId: SITE_ID, kpis, observations }
}

/**
 * 3Bee / XNatura client — ported from Dashboard repo
 * src/app/api/xoco/xnatura/route.ts
 */

const BASE_URL = 'https://api.3bee.com/v1'
const SITE_ID = process.env.XNATURA_SITE_ID ?? '101561'

export interface XNaturaData {
  siteId: string
  kpis: unknown
  observations: unknown
}

export async function getBiodiversity(): Promise<XNaturaData> {
  const token = process.env.XNATURA_API_TOKEN
  if (!token) throw new Error('XNatura: XNATURA_API_TOKEN not configured')

  const [kpisRes, obsRes] = await Promise.all([
    fetch(`${BASE_URL}/sites/${SITE_ID}/kpis`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    }),
    fetch(`${BASE_URL}/sites/${SITE_ID}/observations`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    }),
  ])

  if (!kpisRes.ok) throw new Error(`3Bee KPIs → ${kpisRes.status}`)

  const kpis = await kpisRes.json()
  const observations = obsRes.ok ? await obsRes.json() : null

  return { siteId: SITE_ID, kpis, observations }
}

import { NextResponse } from 'next/server'

// Platform is "Oasi" (platform.3bee.com), not api.3bee.com — that host
// resolves but 404s on every real route. Confirmed via the live OpenAPI
// spec at platform.3bee.com/openapi.json and the account's Settings ->
// API keys page, which documents the X-Api-Key header (not Bearer).
const SITE_ID = '101561'
const USER_SLUG = process.env.XNATURA_USER_SLUG || 'earth-surveillance'
const BASE_URL = (process.env.XNATURA_BASE_URL || 'https://platform.3bee.com').replace(/\/$/, '')
const API_KEY = process.env.XNATURA_API_KEY

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ source: 'pending', message: 'XNatura API key not configured' }, { status: 503 })
  }

  const base = `${BASE_URL}/v1/monitoring/${USER_SLUG}/sites/${SITE_ID}`

  try {
    const [kpisRes, speciesRes] = await Promise.all([
      fetch(`${base}/observations/all_kpis`, {
        headers: { 'X-Api-Key': API_KEY, Accept: 'application/json' },
        next: { revalidate: 3600 },
      }),
      fetch(`${base}/observations`, {
        headers: { 'X-Api-Key': API_KEY, Accept: 'application/json' },
        next: { revalidate: 3600 },
      }),
    ])

    if (!kpisRes.ok) {
      throw new Error(`3Bee KPIs → ${kpisRes.status}`)
    }

    const kpis = await kpisRes.json()
    const observations = speciesRes.ok ? await speciesRes.json() : null

    return NextResponse.json({ source: 'live', siteId: SITE_ID, kpis, observations })
  } catch (err) {
    console.error('XNatura API error:', err)
    return NextResponse.json({ source: 'error', error: String(err) }, { status: 502 })
  }
}

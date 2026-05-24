import { NextResponse } from 'next/server'

const SITE_ID = '101561'
const BASE_URL = 'https://api.3bee.com/v1'
const TOKEN = process.env.XNATURA_API_TOKEN

export async function GET() {
  if (!TOKEN) {
    return NextResponse.json({ source: 'pending', message: 'XNatura API token not configured' }, { status: 503 })
  }

  try {
    const [kpisRes, speciesRes] = await Promise.all([
      fetch(`${BASE_URL}/sites/${SITE_ID}/kpis`, {
        headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
        next: { revalidate: 3600 },
      }),
      fetch(`${BASE_URL}/sites/${SITE_ID}/observations`, {
        headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
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

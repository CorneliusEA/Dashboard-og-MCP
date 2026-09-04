import { NextResponse } from 'next/server'
import { fetchForecast } from '@/lib/weather'

export const revalidate = 900

// Bocas del Toro, Panama — center of COCABO_BBOX in lib/sentinel.ts
const LAT = 9.25
const LON = -82.25

export async function GET() {
  try {
    const forecast = await fetchForecast(LAT, LON)
    return NextResponse.json({ source: 'live', ...forecast })
  } catch (err) {
    console.error('Weather fetch error:', err)
    return NextResponse.json({ source: 'error', error: String(err) }, { status: 502 })
  }
}

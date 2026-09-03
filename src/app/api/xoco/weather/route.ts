import { NextResponse } from 'next/server'
import { fetchForecast } from '@/lib/weather'

export const revalidate = 900

// El Lago, Nicaragua (same center used for the Xoco site map)
const LAT = 12.295
const LON = -86.355

export async function GET() {
  try {
    const forecast = await fetchForecast(LAT, LON)
    return NextResponse.json({ source: 'live', ...forecast })
  } catch (err) {
    console.error('Weather fetch error:', err)
    return NextResponse.json({ source: 'error', error: String(err) }, { status: 502 })
  }
}

import { NextResponse } from 'next/server'
import { fetchNDVI } from '@/lib/sentinel'

// force-dynamic, not ISR: this route always returns 200 (even its catch
// block falls back to modelled data with a 200 status), so Next.js was
// statically pre-rendering it at Docker BUILD time — when Cloud Build has
// no access to the Cloud Run service's runtime env vars, guaranteeing a
// permanently-cached failure response regardless of real credentials.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const ndvi = await fetchNDVI()

    // Derive carbon proxy from NDVI (Somarriba 2013: 117 tC/ha baseline)
    // NDVI 0.72 baseline → 117 tC/ha. Scale linearly.
    const BASELINE_NDVI = 0.72
    const BASELINE_TC_PER_HA = 117
    const carbonPerHa = Math.round((ndvi.ndviMean / BASELINE_NDVI) * BASELINE_TC_PER_HA)
    const totalHa = 4394
    const totalTCO2e = Math.round(carbonPerHa * totalHa * (44 / 12)) // C → CO2e

    return NextResponse.json({
      ndviMean: ndvi.ndviMean,
      ndviMin: ndvi.ndviMin,
      ndviMax: ndvi.ndviMax,
      date: ndvi.date,
      carbonPerHaTonne: carbonPerHa,
      totalCarbonTCO2e: totalTCO2e,
      vegetationHealth: ndvi.ndviMean > 0.7 ? 'GOOD' : ndvi.ndviMean > 0.5 ? 'MODERATE' : 'LOW',
      source: 'Sentinel-2 L2A',
    })
  } catch (err) {
    // Graceful fallback to modelled values if satellite unavailable
    console.error('Sentinel API error:', err)
    return NextResponse.json({
      ndviMean: 0.72,
      ndviMin: 0.45,
      ndviMax: 0.91,
      date: new Date().toISOString().split('T')[0],
      carbonPerHaTonne: 117,
      totalCarbonTCO2e: 1880000,
      vegetationHealth: 'GOOD',
      source: 'Modelled (Somarriba 2013)',
    })
  }
}

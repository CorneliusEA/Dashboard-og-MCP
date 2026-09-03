import { NextResponse } from 'next/server'
import { fetchNDVI, BBOXES } from '@/lib/sentinel'

// force-dynamic, not ISR — see src/app/api/sentinel/route.ts for why:
// a route that always returns 200 gets statically baked in at Docker
// build time (no runtime env vars available then) otherwise.
export const dynamic = 'force-dynamic'

export async function GET() {
  const TOTAL_HA = 95.4
  const BASELINE_NDVI = 0.72
  const BASELINE_TC_PER_HA = 311 // Somarriba — established agroforestry, higher than COCABO baseline

  let ndviMean = 0.72
  let carbonPerHa = BASELINE_TC_PER_HA
  let date = new Date().toISOString().split('T')[0]

  try {
    const ndvi = await fetchNDVI(BBOXES.xoco)
    ndviMean = ndvi.ndviMean
    carbonPerHa = Math.round((ndviMean / BASELINE_NDVI) * BASELINE_TC_PER_HA)
    date = ndvi.date
  } catch {
    // fallback to modelled values
  }

  const totalCarbonT = Math.round(carbonPerHa * TOTAL_HA / (44 / 12)) // CO2e → C
  const totalCO2e = Math.round(carbonPerHa * TOTAL_HA)
  const annualSeqLow = 7
  const annualSeqHigh = 9

  return NextResponse.json({
    ndviMean,
    carbonPerHaTCO2e: carbonPerHa,
    totalCarbonT,
    totalCO2e,
    totalHa: TOTAL_HA,
    annualSeqLow,
    annualSeqHigh,
    dataSufficiency: 62,
    date,
    source: ndviMean === 0.72 ? 'Modelled (Somarriba 2013)' : 'Sentinel-2 L2A',
    vegetationHealth: ndviMean > 0.7 ? 'GOOD' : ndviMean > 0.5 ? 'MODERATE' : 'LOW',
  })
}

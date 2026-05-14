import { NextResponse } from 'next/server'
import { fetchNDVI } from '@/lib/sentinel'
import type { CarbonMetrics } from '@/lib/types'

export const revalidate = 3600

export async function GET() {
  const TOTAL_HA = 4394
  const BASELINE_NDVI = 0.72
  const BASELINE_TC_PER_HA = 117 // Somarriba 2013

  let cAndNStockTPerHa = BASELINE_TC_PER_HA
  try {
    const ndvi = await fetchNDVI()
    cAndNStockTPerHa = Math.round((ndvi.ndviMean / BASELINE_NDVI) * BASELINE_TC_PER_HA)
  } catch {
    // fallback to Somarriba 2013 baseline
  }

  const reserveTCO2e = Math.round(cAndNStockTPerHa * TOTAL_HA * (44 / 12))
  const annualSeqLowT = 21000
  const annualSeqHighT = 42000

  const data: CarbonMetrics = {
    reserveTCO2e,
    annualSeqLowT,
    annualSeqHighT,
    tradeablePotentialLow: annualSeqLowT * 15,
    tradeablePotentialHigh: annualSeqHighT * 25,
    cAndNStockTPerHa,
    scenarios: [
      { label: '$15/t VCM (low)', pricePerTonne: 15, currency: 'USD', lowSeqRevenue: annualSeqLowT * 15, highSeqRevenue: annualSeqHighT * 15 },
      { label: '$25/t VCM (high)', pricePerTonne: 25, currency: 'USD', lowSeqRevenue: annualSeqLowT * 25, highSeqRevenue: annualSeqHighT * 25 },
      { label: '€15/t CSRD', pricePerTonne: 15, currency: 'EUR', lowSeqRevenue: annualSeqLowT * 15, highSeqRevenue: annualSeqHighT * 15 },
      { label: '€60/t ETS proxy', pricePerTonne: 60, currency: 'EUR', lowSeqRevenue: annualSeqLowT * 60, highSeqRevenue: annualSeqHighT * 60 },
    ],
  }
  return NextResponse.json(data)
}

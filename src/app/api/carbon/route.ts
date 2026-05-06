import { NextResponse } from 'next/server'
import type { CarbonMetrics } from '@/lib/types'

export async function GET() {
  // TODO: Replace with live biomass model / satellite data
  const data: CarbonMetrics = {
    reserveTCO2e: 1880000,
    annualSeqLowT: 21000,
    annualSeqHighT: 42000,
    tradeablePotentialLow: 315000,
    tradeablePotentialHigh: 1050000,
    cAndNStockTPerHa: 117,
    scenarios: [
      { label: '$15/t VCM (low)', pricePerTonne: 15, currency: 'USD', lowSeqRevenue: 315000, highSeqRevenue: 630000 },
      { label: '$25/t VCM (high)', pricePerTonne: 25, currency: 'USD', lowSeqRevenue: 525000, highSeqRevenue: 1050000 },
      { label: '€15/t CSRD', pricePerTonne: 15, currency: 'EUR', lowSeqRevenue: 315000, highSeqRevenue: 630000 },
      { label: '€60/t ETS proxy', pricePerTonne: 60, currency: 'EUR', lowSeqRevenue: 1260000, highSeqRevenue: 2520000 },
    ],
  }
  return NextResponse.json(data)
}

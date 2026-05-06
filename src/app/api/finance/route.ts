import { NextResponse } from 'next/server'
import type { FinanceMetrics } from '@/lib/types'

export async function GET() {
  // TODO: Replace with live financial data source
  const data: FinanceMetrics = {
    carbonCreditPotentialUSD: 1000000,
    dfiRelationships: 0,
    cbamReadinessYear: 2028,
    pilotCostEUR: 6000,
    annualRevenueUSD: 1440000,
    carbonLow: 315000,
    carbonHigh: 1050000,
    cbamPotentialLow: 1260000,
    cbamPotentialHigh: 2520000,
  }
  return NextResponse.json(data)
}

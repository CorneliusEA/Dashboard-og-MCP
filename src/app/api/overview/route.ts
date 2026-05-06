import { NextResponse } from 'next/server'
import type { OverviewMetrics } from '@/lib/types'

export async function GET() {
  // TODO: Replace with live data source (database, Google Sheets, satellite API)
  const data: OverviewMetrics = {
    carbonReserveTCO2e: 1880000,
    eudrCommunitiesCompliant: 0,
    eudrCommunitiesTotal: 60,
    annualSeqLow: 21000,
    annualSeqHigh: 42000,
    eLedgerPerKgCacao: 1.72,
    totalFarmers: 1438,
    totalHa: 4394,
    birdSpecies: 234,
    monthlyRevenue: 120000,
    phase: 1,
  }
  return NextResponse.json(data)
}

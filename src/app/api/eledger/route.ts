import { NextResponse } from 'next/server'
import type { ELedgerMetrics } from '@/lib/types'

export async function GET() {
  // TODO: Replace with live shipment data from E-Ledger system
  const data: ELedgerMetrics = {
    seqPerKgCacao: 2.31,
    processShippingEmissions: 0.59,
    netCarbonPerKgShipped: 1.72,
    annualExportTonnes: 400,
    annualCarbonCertTCO2e: 608,
  }
  return NextResponse.json(data)
}

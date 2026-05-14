import { NextResponse } from 'next/server'
import type { ELedgerMetrics } from '@/lib/types'

export async function GET() {
  // TODO: Replace with live shipment data from E-Ledger system
  const data: ELedgerMetrics = {
    seqPerKgCacao: 1.72,
    processShippingEmissions: 0.20,
    netCarbonPerKgShipped: 1.52,
    annualExportTonnes: 400,
    annualCarbonCertTCO2e: 608,
  }
  return NextResponse.json(data)
}

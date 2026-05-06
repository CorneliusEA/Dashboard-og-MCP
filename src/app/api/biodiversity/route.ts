import { NextResponse } from 'next/server'
import type { BiodiversityMetrics } from '@/lib/types'

export async function GET() {
  // TODO: Replace with live acoustic monitoring / satellite LAI data
  const data: BiodiversityMetrics = {
    totalBirdSpecies: 234,
    inCacaoAndForest: 102,
    cacaoOnly: 86,
    migratoryInCacao: 18,
    forestOnly: 46,
  }
  return NextResponse.json(data)
}

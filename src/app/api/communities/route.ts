import { NextResponse } from 'next/server'
import { searchMaps, isCocaboMap } from '@/lib/forsler'
import type { EUDRMetrics } from '@/lib/types'

export const revalidate = 300 // refresh every 5 minutes

const COMMUNITIES: EUDRMetrics['communities'] = [
  { name: 'Teribe', farmers: 38, ha: 95, eudr: 'pending', carbonTCO2e: 11100 },
  { name: 'Quebrada Caña', farmers: 22, ha: 55, eudr: 'pending', carbonTCO2e: 6400 },
  { name: 'Valle de Risco', farmers: 31, ha: 77, eudr: 'pending', carbonTCO2e: 9000 },
  { name: 'Changuinola', farmers: 45, ha: 112, eudr: 'pending', carbonTCO2e: 13100 },
  { name: 'Nance de Risco', farmers: 18, ha: 45, eudr: 'pending', carbonTCO2e: 5300 },
  { name: 'Punta de Piedra', farmers: 27, ha: 67, eudr: 'pending', carbonTCO2e: 7800 },
  { name: 'Ojo de Agua', farmers: 14, ha: 35, eudr: 'pending', carbonTCO2e: 4100 },
  { name: 'Silencio', farmers: 41, ha: 102, eudr: 'pending', carbonTCO2e: 11900 },
  { name: 'Guabo', farmers: 33, ha: 82, eudr: 'pending', carbonTCO2e: 9600 },
  { name: 'Almirante sector', farmers: 52, ha: 130, eudr: 'pending', carbonTCO2e: 15200 },
  { name: 'El Empalme', farmers: 19, ha: 47, eudr: 'pending', carbonTCO2e: 5500 },
  { name: 'San San Druy', farmers: 28, ha: 70, eudr: 'pending', carbonTCO2e: 8200 },
]

export async function GET() {
  let farmPolygonsCollected = 0

  try {
    const maps = await searchMaps()
    farmPolygonsCollected = maps.filter(isCocaboMap).length
  } catch {
    // Forsler unavailable — show 0 collected
  }

  const data: EUDRMetrics = {
    communitiesCompliant: 0,
    communitiesTotal: 60,
    farmPolygonsCollected,
    farmPolygonsTotal: 1438,
    deforestationBaselineYear: 2020,
    areaHa: 4394,
    communities: COMMUNITIES,
  }

  return NextResponse.json(data)
}

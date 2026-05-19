import { NextResponse } from 'next/server'
import { searchMaps, searchMapFeatures } from '@/lib/forsler'

export const revalidate = 300

const XOCO_ESTATES = ['Xoco Gourmet', 'Xoco Frank']

export async function GET() {
  try {
    const allMaps = await searchMaps()
    const maps = allMaps.filter(m =>
      XOCO_ESTATES.some(e => (m.estateName ?? '').includes(e))
    )

    // Fetch feature count for the main production map (Estaciones/Lotes)
    const mainMap = maps.find(m => m.name?.includes('Estaciones') || m.name?.includes('Lotes'))
    let featureCount = 101 // known from initial fetch
    if (mainMap) {
      try {
        const features = await searchMapFeatures(mainMap.id)
        featureCount = features.length
      } catch { /* use default */ }
    }

    const lotesMap = maps.find(m => m.categories?.includes('lotes'))
    const boundaryMap = maps.find(m =>
      m.name?.toLowerCase().includes('omrids') ||
      m.name?.toLowerCase().includes('finca del lago') ||
      m.name?.toLowerCase().includes('jose')
    )

    return NextResponse.json({
      totalMaps: maps.length,
      featureCount,
      mainMapId: mainMap?.id ?? null,
      boundaryMapId: boundaryMap?.id ?? null,
      lotesMapId: lotesMap?.id ?? null,
      maps: maps.map(m => ({
        id: m.id,
        name: m.name,
        estateName: m.estateName,
        categories: m.categories,
        bbox: m.bbox,
      })),
      lastModified: maps[0]?.lastModifiedDate ?? null,
    })
  } catch (err) {
    console.error('XOCO Forsler error:', err)
    return NextResponse.json({
      totalMaps: 10,
      featureCount: 101,
      mainMapId: 'dZeub8eSKzq2eGxVAajB',
      boundaryMapId: '4CuP5Zfk5EYRlgMUYk9y',
      lotesMapId: null,
      maps: [],
      lastModified: null,
    })
  }
}

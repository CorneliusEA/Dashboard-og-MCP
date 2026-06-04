import { NextResponse } from 'next/server'
import { searchMaps, searchMapFeatures } from '@/lib/forsler'

export const revalidate = 300

const XOCO_ESTATES = ['Xoco Gourmet', 'Xoco Frank']

function layerColor(categories: string[]): string {
  const c = categories.join(' ').toLowerCase()
  if (c.includes('boundary') || c.includes('omrids') || c.includes('finca')) return 'boundary'
  if (c.includes('lote') || c.includes('plot') || c.includes('estacion')) return 'lotes'
  return 'points'
}

export async function GET() {
  try {
    const allMaps = await searchMaps()
    const maps = allMaps.filter(m =>
      XOCO_ESTATES.some(e => (m.estateName ?? '').includes(e))
    )

    const layers: Record<string, { type: string; name: string; color: string; features: unknown[] }> = {
      boundary: { type: 'FeatureCollection', name: 'Site Boundary', color: '#A78BFA', features: [] },
      lotes:    { type: 'FeatureCollection', name: 'Lotes / Plots',  color: '#9DFF51', features: [] },
      points:   { type: 'FeatureCollection', name: 'Key Points',     color: '#FFB402', features: [] },
    }

    // Fetch features for each map
    await Promise.all(
      maps.slice(0, 8).map(async (map) => {
        try {
          const features = await searchMapFeatures(map.id)
          for (const f of features) {
            if (!f.geometry) continue
            const layer = layerColor(f.categories ?? [])
            layers[layer].features.push({
              type: 'Feature',
              id: f.id,
              properties: { id: f.id, name: f.name ?? map.name, categories: f.categories, mapName: map.name },
              geometry: f.geometry,
            })
          }
        } catch { /* skip map on error */ }
      })
    )

    // Bounding box center for map init (El Lago, Nicaragua)
    const center = [-86.355, 12.295]

    return NextResponse.json({ center, layers })
  } catch (err) {
    console.error('XOCO map error:', err)
    return NextResponse.json({ center: [-86.355, 12.295], layers: {}, error: String(err) })
  }
}

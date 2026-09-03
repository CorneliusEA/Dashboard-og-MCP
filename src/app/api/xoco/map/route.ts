import { NextResponse } from 'next/server'
import { searchMaps, searchMapFeatures } from '@/lib/forsler'

export const revalidate = 300

const XOCO_ESTATES = ['Xoco Gourmet', 'Xoco Frank']

// Real Forsler features never populate the top-level `categories` field —
// it lives at `properties.categories` instead (confirmed against live data
// 2026-09-03; every feature had categories: [] at the top level while
// properties.categories had real tags like "omrids", "lotes", "forest").
// Classification signal found in real data: exactly one ~114ha polygon
// tagged "omrids" (Danish for "outline/perimeter") is the whole-property
// boundary; polygons tagged "lotes" are individual plots. Everything else
// non-Point defaults to the lotes bucket (still renders correctly as a
// polygon either way, just affects which toggle/color group it's in).
function layerColor(categories: string[], geomType?: string): string {
  if (geomType === 'Point') return 'points'
  const c = categories.join(' ').toLowerCase()
  if (c.includes('omrids') || c.includes('boundary') || c.includes('perimeter') || c.includes('skel')) return 'boundary'
  if (c.includes('lote') || c.includes('plot')) return 'lotes'
  if (geomType === 'Polygon' || geomType === 'MultiPolygon' || geomType === 'LineString') return 'lotes'
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
            const props = (f.properties ?? {}) as { id?: string; categories?: string[] }
            const categories = props.categories ?? []
            const layer = layerColor(categories, f.geometry.type)
            layers[layer].features.push({
              type: 'Feature',
              id: props.id,
              properties: { id: props.id, name: f.name ?? map.name, categories, mapName: map.name },
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

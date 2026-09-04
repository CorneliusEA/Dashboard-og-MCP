import { NextResponse } from 'next/server'
import { searchMaps, searchMapFeatures } from '@/lib/forsler'

// force-dynamic, not ISR — see src/app/api/sentinel/route.ts for why:
// a route that always returns 200 gets statically baked in at Docker
// build time (no runtime env vars available then) otherwise.
export const dynamic = 'force-dynamic'

const COCABO_ESTATE = 'Cocabo R.L.'
// A map with this many features isn't one farmer's plot (confirmed against
// real data 2026-09-04: one "farmer" map actually held 1,198 polygons
// spanning ~65km — almost certainly an unverified cadastral/reference
// layer, not registered farmer data). Route it to a separate, off-by-
// default layer instead of letting it swamp the real plot data or blow
// out the map's default zoom the same way a distant outlier did on Xoco.
const PLOT_SIZE_LIMIT = 50

export async function GET() {
  try {
    const allMaps = await searchMaps()
    const maps = allMaps.filter((m) => (m.estateName ?? '').trim() === COCABO_ESTATE)

    const layers: Record<string, { type: string; name: string; color: string; features: unknown[]; preferred?: boolean; defaultVisible?: boolean }> = {
      plots: { type: 'FeatureCollection', name: 'Registered farmer plots', color: '#9DFF51', features: [], preferred: true },
      reference: { type: 'FeatureCollection', name: 'Reference parcels (unverified)', color: '#666', features: [], defaultVisible: false },
    }

    await Promise.all(
      maps.map(async (map) => {
        try {
          const features = await searchMapFeatures(map.id)
          const bucket = features.length > PLOT_SIZE_LIMIT ? 'reference' : 'plots'
          for (const f of features) {
            if (!f.geometry) continue
            const props = (f.properties ?? {}) as { id?: string; categories?: string[] }
            layers[bucket].features.push({
              type: 'Feature',
              id: props.id,
              properties: { id: props.id, name: f.name ?? map.name, categories: props.categories ?? [], mapName: map.name },
              geometry: f.geometry,
            })
          }
        } catch { /* skip map on error */ }
      })
    )

    // Bounding box center for map init — Bocas del Toro, Panama
    const center = [-82.25, 9.25]

    return NextResponse.json({ center, layers })
  } catch (err) {
    console.error('Cocabo map error:', err)
    return NextResponse.json({ center: [-82.25, 9.25], layers: {}, error: String(err) })
  }
}

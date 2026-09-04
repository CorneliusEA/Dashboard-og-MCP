'use client'
import { useEffect, useRef, useState } from 'react'

interface LayerData {
  type: string
  name: string
  color: string
  features: unknown[]
  /** Outline-only, dashed style (e.g. a site/property boundary) instead of a filled shape. */
  dashed?: boolean
  /** Included when fitting the map's initial view. Layers with far-flung or bulk/unverified
   *  data (a distant outgrower site, an unverified cadastral dump) should leave this false so
   *  they don't force the default view to zoom out to the point of hiding everything else. */
  preferred?: boolean
  /** Whether this layer starts toggled on. Defaults to true if omitted — set false for
   *  layers that shouldn't clutter the view by default (e.g. bulk/unverified data). */
  defaultVisible?: boolean
}

interface MapData {
  center: [number, number]
  layers: Record<string, LayerData>
  error?: string
}

const TILE_LAYERS = {
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
  },
  street: {
    label: 'Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
}

interface XocoMapProps {
  data: MapData
  /** URL serving the classified land-cover PNG (e.g. /api/xoco/landcover) */
  landCoverUrl?: string
  /** [minLon, minLat, maxLon, maxLat] the land-cover image was rendered for */
  landCoverBounds?: [number, number, number, number]
}

export function XocoMap({ data, landCoverUrl, landCoverBounds }: XocoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMap = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRefs = useRef<Record<string, any>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const landCoverRef = useRef<any>(null)

  const [basemap, setBasemap] = useState<'satellite' | 'street'>('satellite')
  // Derived from the actual layers passed in, not a hardcoded key list —
  // a layer with no explicit `defaultVisible` starts on; `landcover` (not
  // a data.layers entry, handled separately below) always starts off.
  const [visible, setVisible] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { landcover: false }
    for (const [key, layer] of Object.entries(data.layers)) {
      initial[key] = layer.defaultVisible ?? true
    }
    return initial
  })
  // Leaflet's ImageOverlay fails completely silently on a load error — no
  // broken-image icon, nothing in the UI, just stays invisible forever.
  // Track load state explicitly so a real failure is visible instead of
  // looking identical to "still deciding whether to show colors."
  const [landCoverStatus, setLandCoverStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

  // Init map once
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return

    import('leaflet').then((L) => {
      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center: [data.center[1], data.center[0]],
        zoom: 14,
        zoomControl: false,
      })
      L.control.zoom({ position: 'bottomright' }).addTo(map)

      // Tile layer
      tileRef.current = L.tileLayer(TILE_LAYERS.satellite.url, {
        attribution: TILE_LAYERS.satellite.attribution,
        maxZoom: 20,
      }).addTo(map)

      leafletMap.current = map

      // Land-cover raster overlay (NDVI-classified, from /api/xoco/landcover)
      if (landCoverUrl && landCoverBounds) {
        const [minLon, minLat, maxLon, maxLat] = landCoverBounds
        const bounds = L.latLngBounds([minLat, minLon], [maxLat, maxLon])
        const overlay = L.imageOverlay(landCoverUrl, bounds, { opacity: 1 })
        overlay.on('load', () => setLandCoverStatus('loaded'))
        overlay.on('error', () => setLandCoverStatus('error'))
        landCoverRef.current = overlay
        if (visible.landcover) {
          setLandCoverStatus('loading')
          overlay.addTo(map)
        }
      }

      // Add GeoJSON layers — styling comes from each layer's own data
      // (color/dashed), not a hardcoded key list, so this component works
      // for any dashboard's layer set, not just Xoco's boundary/lotes/points.
      for (const [key, layer] of Object.entries(data.layers)) {
        const color = layer.color ?? '#fff'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geo = L.geoJSON({ type: 'FeatureCollection', features: layer.features } as any, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style: (f: any) => {
            const geomType = f?.geometry?.type
            if (geomType === 'Point') return {}
            return {
              color,
              weight: geomType === 'Polygon' || geomType === 'MultiPolygon' ? 2 : 1.5,
              fillColor: color,
              fillOpacity: layer.dashed ? 0 : 0.12,
              dashArray: layer.dashed ? '6, 6' : undefined,
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pointToLayer: (_f: any, latlng: any) =>
            L.circleMarker(latlng, { radius: 5, color, fillColor: color, fillOpacity: 0.9, weight: 1.5 }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onEachFeature: (f: any, featureLayer: any) => {
            const p = f.properties ?? {}
            featureLayer.bindPopup(
              `<div style="font-family:monospace;font-size:11px;color:#111">
                <strong>${p.name ?? 'Feature'}</strong><br/>
                ${p.mapName ? `<span style="color:#666">${p.mapName}</span><br/>` : ''}
                ${p.categories?.length ? `<span style="color:#666">${p.categories.join(', ')}</span>` : ''}
              </div>`,
              { maxWidth: 200 }
            )
          },
        })
        if (layer.defaultVisible ?? true) geo.addTo(map)

        layerRefs.current[key] = geo
      }

      // Fit bounds to the real site data, not every feature on the account.
      // Some orgs include far-away or bulk/unverified data in the same
      // layer set (a supplier farm 90km from the main site; a 1,198-
      // feature "cadastral reference" dump that isn't actually registered
      // farmer data) — fitting bounds to ALL layers combined would zoom
      // out to include those too, shrinking the real site to an invisible
      // speck. Each API route marks which of its layers are trustworthy
      // for this via `preferred`; fall back to everything only if none are.
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const preferredLayers = Object.entries(data.layers)
          .filter(([, layer]) => layer.preferred)
          .map(([key]) => layerRefs.current[key])
          .filter(Boolean) as any[]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fallbackLayers = Object.values(layerRefs.current) as any[]
        const group = L.featureGroup(preferredLayers.length > 0 ? preferredLayers : fallbackLayers)
        const bounds = group.getBounds()
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] })
      } catch { /* use default center */ }
    })

    return () => {
      leafletMap.current?.remove()
      leafletMap.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Toggle basemap
  useEffect(() => {
    if (!leafletMap.current || !tileRef.current) return
    import('leaflet').then((L) => {
      tileRef.current.setUrl(TILE_LAYERS[basemap].url)
      tileRef.current.options.attribution = TILE_LAYERS[basemap].attribution
      L.control // keep reference alive
    })
  }, [basemap])

  // Toggle layer visibility
  useEffect(() => {
    if (!leafletMap.current) return
    for (const [key, layer] of Object.entries(layerRefs.current)) {
      if (visible[key]) {
        leafletMap.current.addLayer(layer)
      } else {
        leafletMap.current.removeLayer(layer)
      }
    }
    if (landCoverRef.current) {
      if (visible.landcover) {
        setLandCoverStatus((s) => (s === 'loaded' ? s : 'loading'))
        leafletMap.current.addLayer(landCoverRef.current)
      } else {
        leafletMap.current.removeLayer(landCoverRef.current)
      }
    }
  }, [visible])

  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--bd)' }}>
      {/* Map container */}
      <div ref={mapRef} style={{ height: 480, width: '100%', background: '#0a0a0a' }} />

      {/* Layer controls */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 1000,
        background: 'rgba(10,10,10,.85)', backdropFilter: 'blur(8px)',
        border: '1px solid var(--bd)', borderRadius: 8, padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140,
      }}>
        {/* Basemap toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['satellite', 'street'] as const).map(b => (
            <button key={b} onClick={() => setBasemap(b)} style={{
              flex: 1, padding: '3px 0', fontSize: 9, fontFamily: 'var(--mono)',
              borderRadius: 4, border: '1px solid var(--bd)', cursor: 'pointer',
              background: basemap === b ? '#A78BFA' : 'transparent',
              color: basemap === b ? '#000' : 'var(--muted)',
              textTransform: 'uppercase',
            }}>
              {TILE_LAYERS[b].label}
            </button>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--bd2)' }} />

        {/* Layer toggles — one per entry in data.layers, using each
            layer's own name/color rather than a hardcoded key list */}
        {Object.entries(data.layers).map(([key, layer]) => {
          const isPointLayer = layer.features.length > 0 &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (layer.features as any[]).every((f) => f?.geometry?.type === 'Point')
          return (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={visible[key] ?? true}
              onChange={e => setVisible(v => ({ ...v, [key]: e.target.checked }))}
              style={{ display: 'none' }}
            />
            <span style={{
              width: 10, height: 10, borderRadius: isPointLayer ? '50%' : 2,
              background: visible[key] ? layer.color : 'transparent',
              border: `1.5px solid ${layer.color}`,
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontSize: 10, color: visible[key] ? '#fff' : 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {layer.name}
            </span>
          </label>
          )
        })}

        {landCoverUrl && landCoverBounds && (
          <>
            <div style={{ height: 1, background: 'var(--bd2)' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={visible.landcover ?? false}
                onChange={e => setVisible(v => ({ ...v, landcover: e.target.checked }))}
                style={{ display: 'none' }}
              />
              <span style={{
                width: 10, height: 10, borderRadius: 2,
                background: visible.landcover ? 'linear-gradient(90deg,#E63A3A,#FFB402,#22CC5C)' : 'transparent',
                border: '1.5px solid var(--muted)',
                display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ fontSize: 10, color: visible.landcover ? '#fff' : 'var(--muted)', fontFamily: 'var(--mono)' }}>
                Land cover
              </span>
            </label>
            {visible.landcover && (
              <div style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: 'var(--muted)', lineHeight: 1.7, paddingLeft: 17 }}>
                {landCoverStatus === 'loading' && <div style={{ color: '#FFB402' }}>⏳ loading image…</div>}
                {landCoverStatus === 'error' && (
                  <div style={{ color: '#E63A3A' }}>
                    ✕ image failed to load —{' '}
                    <a href={landCoverUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#E63A3A', textDecoration: 'underline' }}>
                      open directly
                    </a>
                  </div>
                )}
                <div><span style={{ color: '#22CC5C' }}>■</span> Forest / dense vegetation</div>
                <div><span style={{ color: '#FFB402' }}>■</span> Sparse vegetation / soil</div>
                <div><span style={{ color: '#E63A3A' }}>■</span> Bare ground / built-up</div>
                <div style={{ marginTop: 3, color: 'var(--muted)', opacity: 0.7 }}>NDVI-derived · Sentinel-2 · 90d</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

'use client'
import { useEffect, useRef, useState } from 'react'

interface LayerData {
  type: string
  name: string
  color: string
  features: unknown[]
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

export function XocoMap({ data }: { data: MapData }) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMap = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRefs = useRef<Record<string, any>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileRef = useRef<any>(null)

  const [basemap, setBasemap] = useState<'satellite' | 'street'>('satellite')
  const [visible, setVisible] = useState<Record<string, boolean>>({
    boundary: true,
    lotes: true,
    points: true,
  })

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

      // Add GeoJSON layers
      const COLORS: Record<string, string> = {
        boundary: '#A78BFA',
        lotes: '#9DFF51',
        points: '#FFB402',
      }

      for (const [key, layer] of Object.entries(data.layers)) {
        const color = layer.color ?? COLORS[key] ?? '#fff'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geo = L.geoJSON({ type: 'FeatureCollection', features: layer.features } as any, {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          style: (f: any) => {
            const geomType = f?.geometry?.type
            return geomType === 'Point'
              ? {}
              : { color, weight: geomType === 'Polygon' || geomType === 'MultiPolygon' ? 2 : 1.5, fillColor: color, fillOpacity: 0.12 }
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
        }).addTo(map)

        layerRefs.current[key] = geo
      }

      // Fit bounds if we have features
      const allFeatures = Object.values(data.layers).flatMap(l => l.features)
      if (allFeatures.length > 0) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const allLayers = Object.values(layerRefs.current) as any[]
          const group = L.featureGroup(allLayers)
          const bounds = group.getBounds()
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] })
        } catch { /* use default center */ }
      }
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
  }, [visible])

  const COLORS: Record<string, string> = { boundary: '#A78BFA', lotes: '#9DFF51', points: '#FFB402' }
  const LABELS: Record<string, string> = { boundary: 'Site boundary', lotes: 'Lotes / plots', points: 'Key points' }

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

        {/* Layer toggles */}
        {Object.entries(LABELS).map(([key, label]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={visible[key] ?? true}
              onChange={e => setVisible(v => ({ ...v, [key]: e.target.checked }))}
              style={{ display: 'none' }}
            />
            <span style={{
              width: 10, height: 10, borderRadius: key === 'points' ? '50%' : 2,
              background: visible[key] ? COLORS[key] : 'transparent',
              border: `1.5px solid ${COLORS[key]}`,
              display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{ fontSize: 10, color: visible[key] ? '#fff' : 'var(--muted)', fontFamily: 'var(--mono)' }}>
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

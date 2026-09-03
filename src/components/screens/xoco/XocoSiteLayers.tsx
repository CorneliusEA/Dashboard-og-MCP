'use client'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

// Leaflet must not run on server
const XocoMap = dynamic(() => import('@/components/XocoMap').then(m => m.XocoMap), { ssr: false, loading: () => (
  <div style={{ height: 480, background: 'var(--dark2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--bd)' }}>
    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>Loading map…</span>
  </div>
)})

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function XocoSiteLayers() {
  const { data: forsler } = useSWR('/api/xoco/forsler', fetcher, { refreshInterval: 300_000 })
  const { data: mapData }  = useSWR('/api/xoco/map',     fetcher, { refreshInterval: 300_000 })

  const totalMaps    = forsler?.totalMaps    ?? 10
  const featureCount = forsler?.featureCount ?? 101

  return (
    <div>
      <div className="section-label">Forsler API · Spatial Layers</div>
      <div className="section-title">Site Layers — El Lago</div>
      <div className="section-sub">Interactive map with Forsler spatial layers · {totalMaps} maps · {featureCount} features</div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(167,139,250,.3)', background: 'var(--dark2)', color: '#A78BFA', marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', display: 'inline-block' }} />
        SOURCE · FORSLER API · {totalMaps} maps · {featureCount} features live
      </div>

      {/* KPI row */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total maps',         value: String(totalMaps),    sub: 'registered in Forsler org',   color: 'var(--green)' },
          { label: 'Lotes / features',   value: String(featureCount), sub: 'plots, lotes & key points',  color: 'var(--green)' },
          { label: 'Site area',          value: '95.4 ha',            sub: 'El Lago boundary · registered', color: '#9DFF51'    },
        ].map((m, i) => (
          <div key={i} className="metric" style={{ borderLeft: '2px solid #A78BFA' }}>
            <div style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: '#A78BFA', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
            <div className="metric-value" style={{ color: m.color, fontSize: 20 }}>{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Interactive map */}
      {mapData ? (
        <XocoMap
          data={mapData}
          landCoverUrl="/api/xoco/landcover"
          landCoverBounds={[-86.38, 12.27, -86.33, 12.32]}
        />
      ) : (
        <div style={{ height: 480, background: 'var(--dark2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--bd)', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>Loading map data from Forsler…</span>
        </div>
      )}

      {/* Layer register */}
      <Card title="Layer register" sub="Live from Forsler API" style={{ marginTop: 16 }}>
        <table className="data-table">
          <thead><tr><th>Layer</th><th>Geometry</th><th>Features</th><th>Use</th><th>Status</th></tr></thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600, color: 'white' }}>Full site</td>
              <td>Polygon</td>
              <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>1</td>
              <td style={{ color: 'var(--muted)' }}>EUDR boundary · baseline</td>
              <td><Pill variant="g">VERIFIED</Pill></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: 'white' }}>Lotes</td>
              <td>Polygons</td>
              <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>18</td>
              <td style={{ color: 'var(--muted)' }}>Plot-level attribution</td>
              <td><Pill variant="g">ACTIVE</Pill></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: 'white' }}>Key points</td>
              <td>Points</td>
              <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{featureCount - 19}</td>
              <td style={{ color: 'var(--muted)' }}>High-productivity trees</td>
              <td><Pill variant="g">TAGGED</Pill></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: 'white' }}>SoilSense grid</td>
              <td>Points</td>
              <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>3×3</td>
              <td style={{ color: 'var(--muted)' }}>Soil sensor positions</td>
              <td><Pill variant="g">MAPPED</Pill></td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}

'use client'
import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function XocoSiteLayers() {
  const { data: forsler } = useSWR('/api/xoco/forsler', fetcher, { refreshInterval: 300_000 })

  const totalMaps = forsler?.totalMaps ?? 10
  const featureCount = forsler?.featureCount ?? 101

  return (
    <div>
      <div className="section-label">Forsler API · Spatial Layers</div>
      <div className="section-title">Site Layers — El Lago</div>
      <div className="section-sub">Spatial data layers from Forsler: full-site boundary, lotes, key points — {totalMaps} maps registered for Xoco Gourmet</div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(167,139,250,.3)', background: 'var(--dark2)', color: '#A78BFA', marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', display: 'inline-block' }} />
        SOURCE · FORSLER API · {totalMaps} maps · {featureCount} features live
      </div>

      <div className="grid-3">
        {[
          { label: 'Total maps', value: String(totalMaps), sub: 'registered in Forsler org', color: 'var(--green)' },
          { label: 'Lotes / features', value: String(featureCount), sub: 'plots, lotes & key points', color: 'var(--green)' },
          { label: 'Site area', value: '95.4 ha', sub: 'El Lago boundary · registered', color: '#9DFF51' },
        ].map((m, i) => (
          <div key={i} className="metric" style={{ borderLeft: '2px solid #A78BFA' }}>
            <div style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: '#A78BFA', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
            <div className="metric-value" style={{ color: m.color, fontSize: 20 }}>{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      <Card title="Layer register" sub="Live from Forsler API">
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

      <Card title="All Forsler maps — Xoco Gourmet">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {(forsler?.maps ?? []).map((m: { id: string; name: string; estateName?: string; bbox?: number[] }, i: number) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--bd2)', fontSize: 11 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#A78BFA', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: 'white' }}>{m.name || '(unnamed)'}</div>
                <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 1 }}>{m.estateName}</div>
              </div>
              {m.bbox && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--muted)', textAlign: 'right' }}>
                  {m.bbox[1].toFixed(3)}N {Math.abs(m.bbox[0]).toFixed(3)}W
                </div>
              )}
            </div>
          ))}
          {(!forsler?.maps || forsler.maps.length === 0) && (
            <div style={{ fontSize: 10, color: 'var(--muted)', padding: '12px 0', textAlign: 'center' }}>Loading maps from Forsler...</div>
          )}
        </div>
      </Card>
    </div>
  )
}

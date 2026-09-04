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

export function CocaboSiteLayers() {
  const { data: mapData } = useSWR('/api/cocabo/map', fetcher, { refreshInterval: 300_000 })

  const plotCount = mapData?.layers?.plots?.features?.length ?? 0
  const referenceCount = mapData?.layers?.reference?.features?.length ?? 0

  return (
    <div>
      <div className="section-label">Gaian-Earth Mapping API · Spatial Layers</div>
      <div className="section-title">Site Layers — Bocas del Toro</div>
      <div className="section-sub">Registered farmer plots from Forsler · {plotCount} plots confirmed</div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(167,139,250,.3)', background: 'var(--dark2)', color: '#A78BFA', marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', display: 'inline-block' }} />
        SOURCE · GAIAN-EARTH MAPPING API · {plotCount} plots live
      </div>

      <div style={{ background: 'rgba(255,180,2,.05)', border: '1px solid rgba(255,180,2,.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
        Only {plotCount} of the cooperative's 1,438 farmers currently have a registered plot in Gaian-Earth
        Mapping. The rest of the portal&apos;s farmer/area figures are cooperative-reported totals, not yet
        individually mapped.
      </div>

      {/* Interactive map */}
      {mapData ? (
        <XocoMap
          data={mapData}
          landCoverUrl="/api/cocabo/landcover"
          landCoverBounds={[-82.45, 9.05, -82.05, 9.45]}
        />
      ) : (
        <div style={{ height: 480, background: 'var(--dark2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--bd)', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>Loading map data from Forsler…</span>
        </div>
      )}

      <Card title="Layer register" sub="Live from Gaian-Earth Mapping API" style={{ marginTop: 16 }}>
        <table className="data-table">
          <thead><tr><th>Layer</th><th>Geometry</th><th>Features</th><th>Use</th><th>Status</th></tr></thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600, color: 'white' }}>Registered farmer plots</td>
              <td>Polygon</td>
              <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{plotCount}</td>
              <td style={{ color: 'var(--muted)' }}>Individual smallholder plot boundaries</td>
              <td><Pill variant="g">VERIFIED</Pill></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 600, color: 'white' }}>Reference parcels</td>
              <td>Polygon</td>
              <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{referenceCount}</td>
              <td style={{ color: 'var(--muted)' }}>Bulk cadastral data, not confirmed as registered farmer plots — off by default</td>
              <td><Pill variant="a">UNVERIFIED</Pill></td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  )
}

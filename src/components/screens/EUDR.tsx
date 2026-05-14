'use client'
import useSWR from 'swr'
import type { EUDRMetrics } from '@/lib/types'
import { Metric } from '@/components/ui/Metric'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_COLOR: Record<string, string> = { compliant: '#2ECC71', pending: '#D97706', missing: '#DC2626' }

export function EUDR() {
  const { data } = useSWR<EUDRMetrics>('/api/communities', fetcher, { refreshInterval: 60_000 })
  const d = data ?? { communitiesCompliant: 0, communitiesTotal: 60, farmPolygonsCollected: 0, farmPolygonsTotal: 1438, deforestationBaselineYear: 2020, areaHa: 4394, communities: [] }

  return (
    <div>
      <div className="section-label">EUDR COMPLIANCE MODULE</div>
      <div className="section-title">EU Deforestation Regulation Status</div>
      <div className="section-sub">Phase 1 deliverable: Full EUDR compliance package for all 1,438 COCABO farms across 60 communities</div>

      <div className="grid-4">
        <Metric color="a" label="Communities Compliant" value={`${d.communitiesCompliant} / ${d.communitiesTotal}`} sub="GPS polygons + DDS pending" />
        <Metric color="a" label="Farm Polygons Collected" value={`${d.farmPolygonsCollected.toLocaleString()} / ${d.farmPolygonsTotal.toLocaleString()}`} sub="Gaian app collection pending" />
        <Metric color="g" label="Deforestation Baseline" value={String(d.deforestationBaselineYear)} sub="Sentinel-1/2 · GFW · Phase 1" />
        <Metric color="b" label="Area to Cover" value={d.areaHa.toLocaleString()} sub="hectares · satellite pre-discovery" />
      </div>

      <div className="grid-65">
        <div>
          <Card title="EUDR Compliance Pipeline — Phase 1" sub="60 communities · 4 deliverables">
            <div className="flow-steps" style={{ marginBottom: 14 }}>
              {[
                { icon: '🛰️', label: 'Satellite Pre-Discovery', sub: 'Sentinel-1/2 all 4,394 ha · deforestation baseline 2020', active: true },
                { icon: '📍', label: 'GPS Polygon Collection', sub: '60 communities · Gaian app · field operators', active: false },
                { icon: '🤖', label: 'Gaian AI Analysis', sub: 'Deforestation risk flags · NDVI analysis · boundary verification', active: false },
                { icon: '📄', label: 'Auto Due Diligence Statement', sub: 'Per community · per shipment · EUDR Art. 4 compliant', active: false },
              ].map((step, i) => (
                <div key={i} className={`flow-step${step.active ? ' active-step' : ''}`}>
                  <div className="flow-icon">{step.icon}</div>
                  <div className="flow-label">{step.label}</div>
                  <div className="flow-sub">{step.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', padding: '7px 0 4px', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ minWidth: 130 }}>Community</span>
                <span style={{ minWidth: 60 }}>Farmers</span>
                <span style={{ minWidth: 70 }}>Area (ha)</span>
                <span style={{ minWidth: 70 }}>GPS Status</span>
                <span>DDS Status</span>
              </div>
            </div>
            {d.communities.map((c) => (
              <div key={c.name} className="community-row">
                <div className="comm-dot" style={{ background: STATUS_COLOR[c.eudr] }} />
                <div className="comm-name">{c.name}</div>
                <div className="comm-farmers">{c.farmers} farmers</div>
                <div className="comm-ha">{c.ha} ha</div>
                <div className="comm-eudr"><Pill variant={c.eudr === 'compliant' ? 'g' : c.eudr === 'pending' ? 'a' : 'r'}>{c.eudr.toUpperCase()}</Pill></div>
                <div className="comm-carbon">{(c.carbonTCO2e / 1000).toFixed(1)}k tCO₂e</div>
              </div>
            ))}
            <div style={{ padding: '8px 10px', fontSize: 10, color: 'var(--muted)', textAlign: 'center', fontFamily: 'var(--mono)' }}>
              ... {d.communitiesTotal - d.communities.length} more communities · all {d.communitiesTotal} pending Phase 1 GPS collection
            </div>
          </Card>
        </div>

        <div>
          <Card title="What EUDR Compliance Unlocks">
            {[
              { icon: '🇪🇺', label: 'EU market access protected', value: 'CRITICAL', color: 'g' },
              { icon: '🏪', label: 'Stella Bernrain supply chain', value: 'SECURED', color: 'g' },
              { icon: '📦', label: 'Auto DDS per shipment', value: '~60 docs', color: '' },
              { icon: '⏱️', label: 'Delivery timeline', value: '4 weeks', color: '' },
            ].map((item, i) => (
              <div key={i} className="mini-stat">
                <div className="ms-icon">{item.icon}</div>
                <div className="ms-label">{item.label}</div>
                <div className={`ms-val${item.color ? ' ' + item.color : ''}`}>{item.value}</div>
              </div>
            ))}
          </Card>

          <Card title="Current Compliance Risk">
            <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 7, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#F87171', marginBottom: 6 }}>⚠️ Market Access at Risk</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5 }}>Stella Bernrain currently funds GPS-only collection via Abunda+. No satellite-verified deforestation baseline exists. No auto-generated Due Diligence Statements. EU regulation enforcement escalating in 2025–2026.</div>
            </div>
            <div style={{ background: 'rgba(46,204,113,.05)', border: '1px solid rgba(46,204,113,.15)', borderRadius: 7, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', marginBottom: 6 }}>✓ Phase 1 Solution</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5 }}>Sentinel-2 satellite verification + deforestation baseline 2020 + auto DDS generation per community. Upgrades GPS-only to full EUDR Article 4 compliance in 4 weeks.</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

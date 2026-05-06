'use client'
import useSWR from 'swr'
import type { EUDRMetrics } from '@/lib/types'
import { Metric } from '@/components/ui/Metric'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_COLOR: Record<string, string> = {
  compliant: '#2ECC71',
  pending: '#D97706',
  missing: '#DC2626',
}

export function EUDR() {
  const { data, isLoading } = useSWR<EUDRMetrics>('/api/communities', fetcher, {
    refreshInterval: 60_000,
  })

  if (isLoading || !data) {
    return <div style={{ padding: 40, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>Loading...</div>
  }

  const pct = Math.round((data.communitiesCompliant / data.communitiesTotal) * 100)

  return (
    <div>
      <div className="section-label">EU DEFORESTATION REGULATION</div>
      <div className="section-title">EU Deforestation Regulation Status</div>
      <div className="section-sub">EUDR effective Jan 2025 · All 60 communities must provide GPS polygons + deforestation-free proof before EU export</div>

      <div className="grid-4">
        <Metric color="a" label="Communities Compliant" value={`${data.communitiesCompliant} / ${data.communitiesTotal}`} sub={`${pct}% complete`} delta="↑ Phase 1 target: 60/60" deltaDir="up" />
        <Metric color="a" label="Farm Polygons Collected" value={`${data.farmPolygonsCollected}`} sub={`of ${data.farmPolygonsTotal} farmers`} delta="↑ GPS collection underway" deltaDir="up" />
        <Metric color="g" label="Deforestation Baseline" value={String(data.deforestationBaselineYear)} sub="EUDR reference year · satellite verified" delta="↑ Sentinel-2 pre-processed" deltaDir="up" />
        <Metric color="b" label="Area to Cover" value={`${data.areaHa.toLocaleString()} ha`} sub="Bocas del Toro · 60 communities" delta="↑ Auto DDS in Phase 1" deltaDir="up" />
      </div>

      <div className="grid-65">
        <div>
          <Card title="EUDR Compliance Pipeline — Phase 1" sub="Automated via EarthSurveillance platform">
            <div className="flow-steps">
              {[
                { icon: '🛰️', label: 'Satellite Pre-Discovery', sub: 'Sentinel-2 deforestation check', active: true },
                { icon: '📍', label: 'GPS Polygon Collection', sub: '1,438 farm boundaries', active: false },
                { icon: '🌿', label: 'Land Use Verification', sub: 'Cacao agroforestry confirmed', active: false },
                { icon: '📋', label: 'Auto DDS Generation', sub: 'EU Due Diligence Statement', active: false },
                { icon: '✅', label: 'Compliant Export', sub: 'Stella Bernrain shipments cleared', active: false },
              ].map((step, i) => (
                <div key={i} className={`flow-step${step.active ? ' active-step' : ''}`}>
                  <div className="flow-icon">{step.icon}</div>
                  <div className="flow-label">{step.label}</div>
                  <div className="flow-sub">{step.sub}</div>
                </div>
              ))}
            </div>

            <div className="data-table" style={{ marginTop: 16 }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Community</th>
                    <th>Farmers</th>
                    <th>Area</th>
                    <th>EUDR Status</th>
                    <th>Carbon Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {data.communities.map((c) => (
                    <tr key={c.name}>
                      <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[c.eudr], display: 'inline-block', flexShrink: 0 }} />
                        {c.name}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{c.farmers}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{c.ha} ha</td>
                      <td><Pill variant={c.eudr === 'compliant' ? 'g' : c.eudr === 'pending' ? 'a' : 'r'}>{c.eudr.toUpperCase()}</Pill></td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--green)' }}>{(c.carbonTCO2e / 1000).toFixed(1)}k tCO₂e</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '8px 10px', fontSize: 10, color: 'var(--muted)', textAlign: 'center', fontFamily: 'var(--mono)' }}>
                ... {data.communitiesTotal - data.communities.length} more communities · all {data.communitiesTotal} pending Phase 1 GPS collection
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card title="What EUDR Compliance Unlocks">
            {[
              { icon: '🚢', label: 'EU market access maintained', sub: 'Stella Bernrain export continuity', pill: <Pill variant="g">CRITICAL</Pill> },
              { icon: '💰', label: 'Premium pricing preserved', sub: '~€2–4/kg organic premium at risk', pill: <Pill variant="g">HIGH VALUE</Pill> },
              { icon: '📊', label: 'CSRD scope 3 data to buyers', sub: 'EU corporate sustainability reporting', pill: <Pill variant="b">PHASE 1</Pill> },
              { icon: '🌿', label: 'Verra VCS eligibility', sub: 'EUDR compliance prerequisite', pill: <Pill variant="a">UNLOCKS</Pill> },
              { icon: '🏦', label: 'DFI finance readiness', sub: 'NDF/IFU require verified traceability', pill: <Pill variant="p">PHASE 3</Pill> },
            ].map((item, i) => (
              <div key={i} className="val-row">
                <div className="val-label">
                  {item.icon} {item.label}
                  <small>{item.sub}</small>
                </div>
                {item.pill}
              </div>
            ))}
          </Card>

          <Card title="Current Compliance Risk">
            <div className="highlight-box" style={{ marginBottom: 12 }}>
              <div className="hb-value" style={{ color: 'var(--amber)' }}>HIGH</div>
              <div className="hb-label">EUDR Risk Level</div>
              <div className="hb-sub">0 of 60 communities with verified GPS polygons</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
              Without EUDR compliance, COCABO cacao cannot legally enter the EU market after Jan 2025.
              EarthSurveillance Phase 1 delivers automated GPS collection + satellite deforestation verification
              for all 60 communities — closing this gap in 8 weeks.
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

'use client'
import useSWR from 'swr'
import type { OverviewMetrics } from '@/lib/types'
import { Metric } from '@/components/ui/Metric'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(n)
}

export function Overview() {
  const { data, isLoading } = useSWR<OverviewMetrics>('/api/overview', fetcher, {
    refreshInterval: 30_000,
  })

  if (isLoading || !data) {
    return <div style={{ padding: 40, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>Loading...</div>
  }

  return (
    <div>
      <div className="tick-strip">
        <span className="tick-item"><span className="tick-label">CO₂ RESERVE</span><span className="tick-val up">{fmt(data.carbonReserveTCO2e)} tCO₂e</span></span>
        <span className="tick-item"><span className="tick-label">SEQ/YR</span><span className="tick-val up">{fmt(data.annualSeqLow)}–{fmt(data.annualSeqHigh)} tCO₂e</span></span>
        <span className="tick-item"><span className="tick-label">AREA</span><span className="tick-val">{data.totalHa.toLocaleString()} ha</span></span>
        <span className="tick-item"><span className="tick-label">FARMERS</span><span className="tick-val">{data.totalFarmers.toLocaleString()}</span></span>
        <span className="tick-item"><span className="tick-label">COMMUNITIES</span><span className="tick-val">{data.eudrCommunitiesTotal}</span></span>
        <span className="tick-item"><span className="tick-label">BIRD SPP.</span><span className="tick-val up">{data.birdSpecies}</span></span>
        <span className="tick-item"><span className="tick-label">REVENUE/MO</span><span className="tick-val">${fmt(data.monthlyRevenue)} USD</span></span>
        <span className="tick-item"><span className="tick-label">CARBON CREDITS ISSUED</span><span className="tick-val" style={{ color: 'var(--red)' }}>$0</span></span>
        <span className="tick-item"><span className="tick-label">EUDR STATUS</span><span className="tick-val" style={{ color: 'var(--amber)' }}>PENDING</span></span>
      </div>

      <div className="section-label">PILOT DASHBOARD · APRIL 2026</div>
      <div className="section-title">COCABO Natural Capital Monitor</div>
      <div className="section-sub">
        {data.totalFarmers.toLocaleString()} Ngöbe + Naso smallholder farmers · {data.totalHa.toLocaleString()} ha certified organic cacao agroforestry · UNESCO La Amistad buffer zone
      </div>

      <div className="phase-track">
        <div className="phase-block active-phase">
          <div className="phase-num">Phase 1 · Month 1–2 · NOW</div>
          <div className="phase-name">Discovery + EUDR Baseline</div>
          <div className="phase-desc">Satellite pre-discovery · GPS polygon collection · Auto EUDR DDS · First E-Ledger entries</div>
          <div className="phase-status"><Pill variant="g">ACTIVE</Pill></div>
        </div>
        <div className="phase-block">
          <div className="phase-num">Phase 2 · Month 3–4</div>
          <div className="phase-name">Carbon Baseline + E-Ledger</div>
          <div className="phase-desc">Biomass model · Carbon stock per community · Shipment certificates · CSRD scope 3</div>
          <div className="phase-status"><Pill variant="a">UPCOMING</Pill></div>
        </div>
        <div className="phase-block">
          <div className="phase-num">Phase 3 · Month 5–6</div>
          <div className="phase-name">Carbon Credit + Board Package</div>
          <div className="phase-desc">Verra VCS PDD · Annual credit potential · EBAN biodiversity layer · DFI finance package</div>
          <div className="phase-status"><Pill variant="c">PLANNED</Pill></div>
        </div>
      </div>

      <div className="grid-4">
        <Metric color="g" label="Carbon Reserve" value={fmt(data.carbonReserveTCO2e)} sub="tCO₂e stored · 117 tC/ha avg" delta="↑ €0 monetised today" deltaDir="up" />
        <Metric color="a" label="EUDR Status" value="PENDING" sub={`0 / ${data.eudrCommunitiesTotal} communities compliant`} delta="↑ Phase 1 closes this gap" deltaDir="dn" />
        <Metric color="b" label="Annual Sequestration" value={`~${fmt((data.annualSeqLow + data.annualSeqHigh) / 2)}`} sub="tCO₂e/yr · mid estimate" delta="↑ $315k–$1M credit potential" deltaDir="up" />
        <Metric color="c" label="E-Ledger per kg Cacao" value={`+${data.eLedgerPerKgCacao}`} sub="kg CO₂e seq. per kg produced" delta="↑ Net sink after shipping" deltaDir="up" />
      </div>

      <div className="grid-65">
        <div>
          <Card title="Four Value Gaps — All Solvable with One Platform" sub="ES closes each gap in sequence">
            <div className="val-row">
              <div className="val-label">EUDR Compliance Gap<small>Stella Bernrain GPS-only — no satellite baseline, no auto DDS</small></div>
              <div><Pill variant="a">HIGH RISK</Pill></div>
            </div>
            <div className="val-row">
              <div className="val-label">Carbon Invisible<small>{fmt(data.carbonReserveTCO2e)} tCO₂e stored, zero credits ever issued</small></div>
              <div><Pill variant="r">ZERO REVENUE</Pill></div>
            </div>
            <div className="val-row">
              <div className="val-label">No Nordic DFI Relationship<small>NDF, IFU, Nordic pension funds not yet connected</small></div>
              <div><Pill variant="b">GAP</Pill></div>
            </div>
            <div className="val-row">
              <div className="val-label">EU Buyer Carbon Data Missing<small>CSRD scope 3 obligations NOW — no verified embedded CO₂/kg</small></div>
              <div><Pill variant="r">MISSING</Pill></div>
            </div>
          </Card>

          <Card title="Pilot Investment vs. Potential">
            <div className="val-row">
              <div className="val-label">Phase 1<small>Free · Pre-Discovery</small></div>
              <div className="val-num g">FREE</div>
            </div>
            <div className="val-row">
              <div className="val-label">Phase 2–3<small>50% pilot discount</small></div>
              <div className="val-num b">€6,000/yr</div>
            </div>
            <div className="val-row">
              <div className="val-label">Carbon credit potential<small>Verra VCS annual</small></div>
              <div className="val-num g">$315k–$1M/yr</div>
            </div>
            <div className="val-row">
              <div className="val-label">EUDR compliance value<small>Market access protection</small></div>
              <div className="val-num g">CRITICAL</div>
            </div>
          </Card>
        </div>

        <div>
          <Card title="Current Certification Status">
            <div style={{ overflowX: 'auto' }}>
              <div className="cert-label-row" style={{ paddingLeft: 192, marginBottom: 2 }}>
                {['ORG', 'FT', 'RA', 'UTZ', 'EUDR', 'VCS'].map((l) => (
                  <div key={l} className="cert-cert-label">{l}</div>
                ))}
              </div>
              {[
                { name: 'Organic (USDA/EU)', method: 'Third-party annual', dots: ['y', 'n', 'n', 'n', 'n', 'n'] },
                { name: 'Fair Trade', method: 'FLO · farmer premiums', dots: ['n', 'y', 'n', 'n', 'n', 'n'] },
                { name: 'Rainforest Alliance', method: 'Pending renewal', dots: ['n', 'n', 'p', 'n', 'n', 'n'] },
                { name: 'UTZ / RA merged', method: 'Legacy UTZ sunset', dots: ['n', 'n', 'n', 'p', 'n', 'n'] },
                { name: 'EUDR DDS', method: 'Phase 1 delivery', dots: ['n', 'n', 'n', 'n', 'p', 'n'] },
                { name: 'Verra VCS Carbon', method: 'Phase 2–3 pathway', dots: ['n', 'n', 'n', 'n', 'n', 'p'] },
              ].map((row) => (
                <div key={row.name} className="cert-row">
                  <span className="cert-indicator">{row.dots.find((d) => d === 'y') ? '✅' : row.dots.find((d) => d === 'p') ? '🔄' : '⬜'}</span>
                  <span className="cert-name">{row.name}</span>
                  <span className="cert-method">{row.method}</span>
                  <div className="cert-dots">
                    {row.dots.map((d, i) => (
                      <div key={i} className={`cert-dot ${d === 'y' ? 'cd-y' : d === 'p' ? 'cd-p' : 'cd-n'}`}>
                        {d === 'y' ? '✓' : d === 'p' ? '~' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Next Actions">
            {[
              { icon: '📡', text: 'Satellite pre-discovery imagery delivered', status: <Pill variant="g">DONE</Pill> },
              { icon: '📍', text: 'GPS polygon collection — 60 communities', status: <Pill variant="a">WEEK 1–4</Pill> },
              { icon: '📋', text: 'EUDR Due Diligence Statement drafted', status: <Pill variant="a">PHASE 1</Pill> },
              { icon: '📊', text: 'First E-Ledger entries — shipment cert', status: <Pill variant="a">PHASE 1</Pill> },
              { icon: '🌱', text: 'Carbon biomass model + Verra VCS PDD', status: <Pill variant="c">PHASE 2</Pill> },
            ].map((item, i) => (
              <div key={i} className="alert-row">
                <span className="alert-icon">{item.icon}</span>
                <div className="alert-text">
                  <div className="alert-title">{item.text}</div>
                </div>
                {item.status}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

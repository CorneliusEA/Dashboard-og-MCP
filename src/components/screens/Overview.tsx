'use client'
import useSWR from 'swr'
import type { OverviewMetrics } from '@/lib/types'
import { Metric } from '@/components/ui/Metric'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function Overview() {
  const { data } = useSWR<OverviewMetrics>('/api/overview', fetcher, { refreshInterval: 30_000 })
  const d = data ?? { carbonReserveTCO2e: 1880000, eudrCommunitiesTotal: 60, annualSeqLow: 21000, annualSeqHigh: 42000, eLedgerPerKgCacao: 1.52, totalFarmers: 1438, totalHa: 4394, birdSpecies: 234, monthlyRevenue: 120000, eudrCommunitiesCompliant: 0, phase: 1 }

  return (
    <div>
      <div className="tick-strip">
        <span className="tick-item"><span className="tick-label">CO₂ RESERVE</span><span className="tick-val up">1.88M tCO₂e</span></span>
        <span className="tick-item"><span className="tick-label">SEQ/YR</span><span className="tick-val up">21–42k tCO₂e</span></span>
        <span className="tick-item"><span className="tick-label">AREA</span><span className="tick-val">{d.totalHa.toLocaleString()} ha</span></span>
        <span className="tick-item"><span className="tick-label">FARMERS</span><span className="tick-val">{d.totalFarmers.toLocaleString()}</span></span>
        <span className="tick-item"><span className="tick-label">COMMUNITIES</span><span className="tick-val">{d.eudrCommunitiesTotal}</span></span>
        <span className="tick-item"><span className="tick-label">BIRD SPP.</span><span className="tick-val up">{d.birdSpecies}</span></span>
        <span className="tick-item"><span className="tick-label">REVENUE/MO</span><span className="tick-val">${(d.monthlyRevenue / 1000).toFixed(0)}k USD</span></span>
        <span className="tick-item"><span className="tick-label">CARBON CREDITS ISSUED</span><span className="tick-val" style={{ color: 'var(--red)' }}>$0</span></span>
        <span className="tick-item"><span className="tick-label">EUDR STATUS</span><span className="tick-val" style={{ color: 'var(--amber)' }}>PENDING</span></span>
        <span className="tick-item"><span className="tick-label">FOUNDED</span><span className="tick-val">1952</span></span>
      </div>

      <div className="section-label">PILOT DASHBOARD · 2026</div>
      <div className="section-title">COCABO Natural Capital Monitor</div>
      <div className="section-sub">{d.totalFarmers.toLocaleString()} Ngöbe + Naso smallholder farmers · {d.totalHa.toLocaleString()} ha certified organic cacao agroforestry · UNESCO La Amistad buffer zone</div>

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
        <Metric color="g" label="Carbon Reserve" value="1.88M" sub="tCO₂e stored · 117 tC/ha avg" delta="↑ €0 monetised today" deltaDir="up" />
        <Metric color="a" label="EUDR Status" value="PENDING" sub={`0 / ${d.eudrCommunitiesTotal} communities compliant`} delta="↑ Phase 1 closes this gap" deltaDir="dn" />
        <Metric color="b" label="Annual Sequestration" value="~31k" sub="tCO₂e/yr · mid estimate" delta="↑ $315k–$1M credit potential" deltaDir="up" />
        <Metric color="c" label="E-Ledger per kg Cacao" value="+1.52" sub="kg CO₂e net sink · verified" delta="↑ Net sink after shipping" deltaDir="up" />
      </div>

      <div className="grid-65">
        <div>
          <Card title="Four Value Gaps — All Solvable with One Platform" sub="ES closes each gap in sequence">
            <div className="val-row"><div className="val-label">EUDR Compliance Gap<small>Stella Bernrain GPS-only — no satellite baseline, no auto DDS</small></div><Pill variant="a">HIGH RISK</Pill></div>
            <div className="val-row"><div className="val-label">Carbon Invisible<small>1.88M tCO₂e stored, zero credits ever issued</small></div><Pill variant="r">ZERO REVENUE</Pill></div>
            <div className="val-row"><div className="val-label">No Nordic DFI Relationship<small>NDF, IFU, Nordic pension funds not yet connected</small></div><Pill variant="a">UNTAPPED</Pill></div>
            <div className="val-row"><div className="val-label">EU Buyer Carbon Data Missing<small>CSRD scope 3 obligations NOW — no verified embedded CO₂/kg</small></div><Pill variant="r">URGENT</Pill></div>
          </Card>

          <Card title="Current Certification Status" sub="Existing + gaps">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { icon: '🌿', name: 'BioSuisse', pill: <Pill variant="g">CERTIFIED</Pill>, bg: 'rgba(46,204,113,.06)', bd: 'rgba(46,204,113,.2)' },
                { icon: '🇪🇺', name: 'EU Organic (NOP)', pill: <Pill variant="g">CERTIFIED</Pill>, bg: 'rgba(46,204,113,.06)', bd: 'rgba(46,204,113,.2)' },
                { icon: '⚖️', name: 'FLO Fairtrade', pill: <Pill variant="g">CERTIFIED</Pill>, bg: 'rgba(46,204,113,.06)', bd: 'rgba(46,204,113,.2)' },
                { icon: '📋', name: 'EUDR', pill: <Pill variant="a">PHASE 1</Pill>, bg: 'rgba(217,119,6,.05)', bd: 'rgba(217,119,6,.2)' },
                { icon: '💰', name: 'Carbon Credits', pill: <Pill variant="r">NONE YET</Pill>, bg: 'rgba(220,38,38,.04)', bd: 'rgba(220,38,38,.15)' },
                { icon: '🏦', name: 'Nordic DFI', pill: <Pill variant="b">PHASE 3</Pill>, bg: 'rgba(37,99,235,.04)', bd: 'rgba(37,99,235,.15)' },
              ].map((c) => (
                <div key={c.name} style={{ background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 7, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'white' }}>{c.name}</div>
                  <div style={{ marginTop: 4 }}>{c.pill}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Pilot Investment vs. Potential">
            <div className="highlight-box" style={{ marginBottom: 10 }}>
              <div className="hb-value">0.4%</div>
              <div className="hb-label">of annual revenue</div>
              <div className="hb-sub">EUR 6,000/yr pilot · $120k/mo cooperative</div>
            </div>
            <div className="val-row"><div className="val-label">Phase 1<small>Free · Pre-Discovery</small></div><div className="val-num g">€0</div></div>
            <div className="val-row"><div className="val-label">Phase 2–3<small>50% pilot discount</small></div><div className="val-num b">€6,000/yr</div></div>
            <div className="val-row"><div className="val-label">Carbon credit potential<small>Verra VCS annual</small></div><div className="val-num g">$315k–$1M</div></div>
            <div className="val-row"><div className="val-label">EUDR compliance value<small>Market access protection</small></div><div className="val-num g">CRITICAL</div></div>
          </Card>

          <Card title="Next Actions">
            {[
              { n: '1️⃣', t: 'Meet COCABO Board', m: 'Manuel Palacio · Present ES platform' },
              { n: '2️⃣', t: 'Launch Phase 1 Pre-Discovery', m: 'Free · No obligation · Results in 4 weeks' },
              { n: '3️⃣', t: 'Commission Carbon Baseline', m: 'Verra VCS credit project registration' },
              { n: '4️⃣', t: 'Connect Nordic DFI Network', m: 'NDF / IFU / Nordic pension funds' },
            ].map((a) => (
              <div key={a.n} className="alert-row">
                <div className="alert-icon">{a.n}</div>
                <div className="alert-text"><div className="alert-title">{a.t}</div><div className="alert-meta">{a.m}</div></div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

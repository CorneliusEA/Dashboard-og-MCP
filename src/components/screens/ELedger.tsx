'use client'
import useSWR from 'swr'
import type { ELedgerMetrics } from '@/lib/types'
import { Metric } from '@/components/ui/Metric'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const MOCK_LEDGER: ELedgerMetrics = {
  seqPerKgCacao: 2.31,
  processShippingEmissions: 0.59,
  netCarbonPerKgShipped: 1.72,
  annualExportTonnes: 400,
  annualCarbonCertTCO2e: 608,
}

export function ELedger() {
  const { data } = useSWR<ELedgerMetrics>('/api/eledger', fetcher, { refreshInterval: 60_000 })
  const d = data ?? MOCK_LEDGER

  return (
    <div>
      <div className="section-label">E-LEDGER · CARBON INSIDE</div>
      <div className="section-title">Carbon Inside — Farm to EU Buyer</div>
      <div className="section-sub">Every COCABO shipment carries a verifiable carbon certificate — net sink status from farm to EU port</div>

      <div className="grid-4">
        <Metric color="g" label="CO₂e Seq. per kg Cacao" value={`+${d.seqPerKgCacao}`} sub="kg CO₂e sequestered · farm level" delta="↑ Shade-grown agroforestry" deltaDir="up" />
        <Metric color="r" label="Process + Shipping Emissions" value={`-${d.processShippingEmissions}`} sub="kg CO₂e · ferment + ship EU" delta="↑ Certified scope 3 data" deltaDir="dn" />
        <Metric color="g" label="Net Carbon per kg (shipped EU)" value={`+${d.netCarbonPerKgShipped}`} sub="kg CO₂e net sink · per kg shipped" delta="↑ CSRD scope 3 verified" deltaDir="up" />
        <Metric color="b" label="Annual Export (400t)" value={`${d.annualCarbonCertTCO2e}`} sub="tCO₂e certified per year" delta="↑ 608 t marketable carbon" deltaDir="up" />
      </div>

      <div className="grid-65">
        <div>
          <Card title="E-Ledger Certification Flow" sub="Farm → Fermentation → Shipping → EU Buyer Certificate">
            <div className="flow-steps">
              {[
                { icon: '🌱', label: 'Farm Level', sub: 'GPS polygon · biomass model · +2.31 kg CO₂e/kg', active: true },
                { icon: '🏭', label: 'Fermentation', sub: 'COCABO facility · emissions measured', active: false },
                { icon: '📦', label: 'Dry + Pack', sub: 'Weight verified · batch ID assigned', active: false },
                { icon: '🚢', label: 'Shipping EU', sub: 'Scope 3 · -0.59 kg CO₂e/kg total', active: false },
                { icon: '📋', label: 'EU Certificate', sub: 'Net +1.72 kg CO₂e/kg · CSRD ready', active: false },
              ].map((step, i) => (
                <div key={i} className={`flow-step${step.active ? ' active-step' : ''}`}>
                  <div className="flow-icon">{step.icon}</div>
                  <div className="flow-label">{step.label}</div>
                  <div className="flow-sub">{step.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ margin: '16px 0 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#D1D5DB' }}>Sequestration</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>+{d.seqPerKgCacao} kg CO₂e/kg</span>
              </div>
              <div className="co2-bar" style={{ width: '100%' }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', fontFamily: 'var(--mono)' }}>+{d.seqPerKgCacao} sequestered</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#D1D5DB' }}>Emissions (process + ship)</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--red)' }}>-{d.processShippingEmissions} kg CO₂e/kg</span>
              </div>
              <div className="co2-emit" style={{ width: `${(d.processShippingEmissions / d.seqPerKgCacao) * 100}%` }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', fontFamily: 'var(--mono)' }}>-{d.processShippingEmissions} emitted</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#D1D5DB' }}>Net carbon (certified)</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>+{d.netCarbonPerKgShipped} kg CO₂e/kg</span>
              </div>
              <div className="co2-net" style={{ width: `${(d.netCarbonPerKgShipped / d.seqPerKgCacao) * 100}%` }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', fontFamily: 'var(--mono)' }}>NET SINK</span>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card title={`EU Buyer Value (${d.annualCarbonCertTCO2e} tCO₂e / year)`}>
            {[
              { label: 'CSRD offset market', sub: '€15/t · corporate sustainability', value: `€${(d.annualCarbonCertTCO2e * 15 / 1000).toFixed(1)}k/yr`, color: 'b' },
              { label: 'EU ETS proxy', sub: '€60/t · CBAM 2028+ benchmark', value: `€${(d.annualCarbonCertTCO2e * 60 / 1000).toFixed(1)}k/yr`, color: 'p' },
              { label: 'Premium VCM', sub: '$25/t · nature-based premium', value: `$${(d.annualCarbonCertTCO2e * 25 / 1000).toFixed(1)}k/yr`, color: 'g' },
            ].map((row, i) => (
              <div key={i} className="val-row">
                <div className="val-label">{row.label}<small>{row.sub}</small></div>
                <div className={`val-num ${row.color}`}>{row.value}</div>
              </div>
            ))}
          </Card>

          <Card title="EU Buyer CSRD Obligations">
            {[
              { label: 'Scope 3 category 1 reporting', sub: 'Purchased goods/services CO₂ content', pill: <Pill variant="r">MANDATORY NOW</Pill> },
              { label: 'EUDR traceability', sub: 'Farm-level GPS + deforestation proof', pill: <Pill variant="r">JAN 2025</Pill> },
              { label: 'Double Materiality Assessment', sub: 'Nature + climate dependencies', pill: <Pill variant="a">FY2025</Pill> },
              { label: 'Biodiversity disclosure', sub: 'EU Taxonomy · nature-related risks', pill: <Pill variant="a">FY2026</Pill> },
              { label: 'Carbon offsetting strategy', sub: 'Science-Based Targets alignment', pill: <Pill variant="b">PHASE 2</Pill> },
            ].map((row, i) => (
              <div key={i} className="val-row">
                <div className="val-label">{row.label}<small>{row.sub}</small></div>
                {row.pill}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

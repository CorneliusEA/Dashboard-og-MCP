'use client'
import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const DAYS_TO = Math.ceil((new Date('2026-12-30').getTime() - Date.now()) / 86400000)

const SHIPMENTS = [
  { id: '#47', vol: '2,400 kg', dest: 'EU · TRACES', block: '4,847,120' },
  { id: '#46', vol: '1,950 kg', dest: 'EU · TRACES', block: '4,846,902' },
  { id: '#45', vol: '2,100 kg', dest: 'EU · TRACES', block: '4,846,540' },
  { id: '#44', vol: '1,800 kg', dest: 'EU · TRACES', block: '4,846,118' },
]

export function XocoEUDR() {
  const { data: forsler } = useSWR('/api/xoco/forsler', fetcher, { refreshInterval: 300_000 })
  const polygons = forsler?.featureCount ?? 101

  return (
    <div>
      <div className="section-label">Earth Surveillance · EUDR Compliance</div>
      <div className="section-title">EUDR Compliance — Deforestation-Free Cacao</div>
      <div className="section-sub">Per-shipment digital passports anchored to the E-Ledger · GPS polygon evidence from the Gaian-Earth Mapping full-site layer · El Lago, Nicaragua</div>

      <div style={{ background: 'rgba(46,204,113,.05)', border: '1px solid rgba(46,204,113,.2)', borderRadius: 9, padding: '13px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 22 }}>📋</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>EUDR readiness — El Lago is already issuing compliant passports</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Every El Lago shipment to the EU carries a digital passport with GPS polygon and deforestation-free verification.</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 600, color: 'var(--green)', lineHeight: 1 }}>{DAYS_TO}</div>
          <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: 3 }}>DAYS TO ENFORCEMENT</div>
        </div>
      </div>

      <div className="grid-4">
        {[
          { label: 'Passports issued', value: '47', sub: 'all shipments to date', color: 'var(--green)' },
          { label: 'Passport validity', value: '100%', sub: '0 rejected at EU entry', color: 'var(--green)' },
          { label: 'GPS polygons', value: `${polygons} features`, sub: 'Gaian-Earth Mapping · all lotes geo-registered', color: 'var(--green)' },
          { label: 'Deforestation', value: 'Clear', sub: 'free pre-Dec 2020 cutoff', color: 'var(--green)' },
        ].map((m, i) => (
          <div key={i} className="metric g">
            <div style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
            <div className="metric-value" style={{ color: m.color, fontSize: 20 }}>{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-65">
        <Card title="Shipment passport ledger" sub="E-Ledger anchored · Gaian-Earth Mapping GPS">
          <table className="data-table">
            <thead><tr><th>Shipment</th><th>Volume</th><th>Destination</th><th>Polygon</th><th>Block</th><th>Status</th></tr></thead>
            <tbody>
              {SHIPMENTS.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600, color: 'white' }}>{s.id}</td>
                  <td>{s.vol}</td>
                  <td>{s.dest}</td>
                  <td style={{ color: 'var(--green)', fontFamily: 'var(--mono)', fontWeight: 600 }}>Verified</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{s.block}</td>
                  <td><Pill variant="g">VALID</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="How a passport is built">
          {[
            { color: '#A78BFA', step: '1 · GPS polygon', meta: `Gaian-Earth Mapping full-site layer · ${polygons} features registered` },
            { color: 'var(--green)', step: '2 · Deforestation check', meta: 'Sentinel-2 history confirms no forest loss after Dec 2020 cutoff.' },
            { color: 'var(--green)', step: '3 · Shipment binding', meta: 'Volume and lot linked to the verified polygon at dispatch.' },
            { color: '#60A5FA', step: '4 · E-Ledger anchor', meta: 'Passport hash committed on-chain — tamper-evident record.' },
            { color: '#60A5FA', step: '5 · DDS generated', meta: 'EU due diligence statement auto-produced and TRACES-linked.' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: i < 4 ? '1px solid var(--bd2)' : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 4 }} />
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 500, color: 'white' }}>{item.step}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{item.meta}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

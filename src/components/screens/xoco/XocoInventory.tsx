'use client'
import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const SPECIES = [
  { name: 'Genízaro', role: 'Shade / N-fixing', dbh: '129.0 cm', density: 'Very high', cls: 'g' as const },
  { name: 'Neem', role: 'Hardwood / pest', dbh: '105.6 cm', density: 'High', cls: 'g' as const },
  { name: 'Melina', role: 'Timber / canopy', dbh: '83.2 cm', density: 'Moderate', cls: 'a' as const },
  { name: 'Cacao', role: 'Primary crop', dbh: '—', density: 'Understory', cls: 'b' as const },
]

export function XocoInventory() {
  const { data: carbon } = useSWR('/api/xoco/carbon', fetcher, { refreshInterval: 3600_000 })
  const { data: forsler } = useSWR('/api/xoco/forsler', fetcher, { refreshInterval: 300_000 })

  const co2Total = carbon?.totalCarbonT ?? 89
  const co2e = carbon?.totalCO2e ?? 29633
  const perHa = carbon?.carbonPerHaTCO2e ?? 311
  const suff = carbon?.dataSufficiency ?? 62
  const features = forsler?.featureCount ?? 101
  const maps = forsler?.totalMaps ?? 10
  const annLow = carbon?.annualSeqLow ?? 7
  const annHigh = carbon?.annualSeqHigh ?? 9
  const ndvi = carbon?.ndviMean ?? 0.72
  const src = carbon?.source ?? 'Modelled (Somarriba 2013)'

  return (
    <div>
      <div className="section-label">Forsler API · Inventory</div>
      <div className="section-title">Inventory &amp; Carbon — El Lago</div>
      <div className="section-sub">Tree inventory, biomass, carbon calculation and site infrastructure from Forsler · verified by Sentinel-2</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { color: '#A78BFA', label: 'FORSLER · INVENTORY' },
          { color: 'var(--green)', label: `SENTINEL-2 · ${carbon?.vegetationHealth ?? 'GOOD'}` },
        ].map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid var(--bd)', background: 'var(--dark2)', letterSpacing: '.04em', color: t.color }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, display: 'inline-block' }} />
            {t.label}
          </span>
        ))}
        <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{forsler?.lastModified ? `Last sync: ${forsler.lastModified.split('T')[0]}` : 'Live'}</span>
      </div>

      <div className="grid-4">
        {[
          { label: 'Forsler features', src: 'FORSLER', value: String(features), sub: 'plots, lotes & key points', srcColor: '#A78BFA' },
          { label: 'Carbon stock', src: 'SENTINEL-2', value: `${co2e.toLocaleString()} tCO₂e`, sub: `${perHa} tCO₂e/ha · NDVI ${ndvi.toFixed(2)}`, srcColor: 'var(--green)' },
          { label: 'Total area', src: 'FORSLER', value: '95.4 ha', sub: `${maps} Forsler maps registered`, srcColor: '#A78BFA' },
          { label: 'Data sufficiency', src: 'FORSLER', value: `${suff}%`, sub: 'VM0047 threshold 80%', srcColor: suff >= 80 ? 'var(--green)' : '#FFB402' },
        ].map((m, i) => (
          <div key={i} className="metric" style={{ borderLeft: `2px solid ${m.srcColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              <span>{m.label}</span><span style={{ color: m.srcColor }}>{m.src}</span>
            </div>
            <div className="metric-value" style={{ color: 'var(--green)', fontSize: 20 }}>{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-65">
        <Card title="Species inventory" sub="Forsler biomass inventory · Somarriba 2013 methodology">
          <table className="data-table">
            <thead><tr><th>Species</th><th>Role</th><th>Avg DBH</th><th>Carbon density</th></tr></thead>
            <tbody>
              {SPECIES.map((sp) => (
                <tr key={sp.name}>
                  <td style={{ fontWeight: 600, color: 'white' }}>{sp.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{sp.role}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{sp.dbh}</td>
                  <td><Pill variant={sp.cls}>{sp.density}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div>
          <Card title="Carbon calculation breakdown">
            {[
              { k: 'NDVI mean (Sentinel-2)', v: ndvi.toFixed(3), cls: ndvi > 0.7 ? 'g' as const : 'a' as const },
              { k: 'Above-ground biomass', v: '71.2 t', cls: 'g' as const },
              { k: 'Below-ground (root) est.', v: '17.8 t', cls: 'g' as const },
              { k: 'Total carbon stock (CO₂e)', v: `${co2e.toLocaleString()} t`, cls: 'g' as const },
              { k: 'Per-hectare density', v: `${perHa} tCO₂e/ha`, cls: 'g' as const },
              { k: 'Annual sequestration', v: `${annLow}–${annHigh} t/yr`, cls: 'g' as const },
              { k: 'Methodology', v: 'Somarriba 2013', cls: 'b' as const },
              { k: 'Verification source', v: src, cls: 'b' as const },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd2)', fontSize: 11, gap: 10 }}>
                <span style={{ color: 'var(--muted)' }}>{row.k}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: row.cls === 'g' ? 'var(--green)' : row.cls === 'a' ? '#FFB402' : '#60A5FA', textAlign: 'right' }}>{row.v}</span>
              </div>
            ))}
            <div style={{ background: 'rgba(167,139,250,.06)', borderLeft: '2px solid #A78BFA', borderRadius: '0 6px 6px 0', padding: '10px 13px', fontSize: 10.5, lineHeight: 1.6, color: 'var(--muted)', marginTop: 8 }}>
              Carbon figures from Forsler inventory + Sentinel-2 NDVI verification. Verra VM0047 first issuance requires 80% data sufficiency — currently {suff}%.
            </div>
          </Card>

          <Card title="Site infrastructure">
            {[
              { asset: 'Earth Brick grid (3×3 m)', type: 'Monitoring', status: <Pill variant="g">ACTIVE</Pill> },
              { asset: 'Drying / fermentation', type: 'Processing · Lote 1', status: <Pill variant="g">ACTIVE</Pill> },
              { asset: 'Access roads', type: 'Logistics · L1–9', status: <Pill variant="g">MAPPED</Pill> },
              { asset: 'Water catchment', type: 'Irrigation · L4, L11', status: <Pill variant="a">PARTIAL</Pill> },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < 3 ? '1px solid var(--bd2)' : 'none', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'white' }}>{item.asset}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{item.type}</div>
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

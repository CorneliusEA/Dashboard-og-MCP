'use client'
import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const DAYS_TO = Math.ceil((new Date('2026-12-30').getTime() - Date.now()) / 86400000)

export function XocoOverview() {
  const { data: carbon } = useSWR('/api/xoco/carbon', fetcher, { refreshInterval: 3600_000 })
  const { data: forsler } = useSWR('/api/xoco/forsler', fetcher, { refreshInterval: 300_000 })

  const co2 = carbon?.totalCO2e ?? 29633
  const trees = forsler?.featureCount ?? 101
  const bioIdx = 74
  const paw = 38

  return (
    <div>
      <div className="section-label">Earth Surveillance · Xoco Gourmet ApS · 2026</div>
      <div className="section-title">Management Dashboard — El Lago Agroforestry Pilot</div>
      <div className="section-sub">Single-origin cacao &amp; agroforestry · Tuma–La Dalia corridor, Nicaragua · XNatura · SoilSense · Forsler</div>

      <div style={{ background: 'linear-gradient(135deg,rgba(255,180,2,.07),rgba(248,70,11,.05))', border: '1px solid rgba(255,180,2,.25)', borderRadius: 9, padding: '13px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 22 }}>⏳</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>EUDR enforcement — deforestation-free proof required for EU cacao entry</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>El Lago shipments already carrying valid digital passports. Counter is the regulatory deadline, not a Xoco gap.</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 600, color: '#FFB402', lineHeight: 1 }}>{DAYS_TO}</div>
          <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)', marginTop: 3 }}>DAYS TO 30 DEC 2026</div>
        </div>
      </div>

      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
        {[
          { label: 'Biodiversity index', src: 'XNATURA', srcColor: '#22D3EE', value: `${bioIdx}/100`, sub: 'composite E-Asset score', delta: '↑ recovering vs baseline', color: 'var(--green)' },
          { label: 'Bird species', src: 'XNATURA', srcColor: '#22D3EE', value: '234', sub: 'documented · acoustic + visual', delta: '↑ indicator spp. present', color: 'var(--green)' },
          { label: 'Plant-available water', src: 'SOILSENSE', srcColor: '#FFB402', value: `${paw}%`, sub: 'field mean · all sensors', delta: '→ moderate draw-down', color: '#FFB402' },
          { label: 'Carbon stock', src: 'FORSLER', srcColor: '#A78BFA', value: `${(co2 / 1000).toFixed(1)}k tCO₂e`, sub: 'Sentinel-2 · Somarriba 2013', delta: '↑ 311 tCO₂e/ha', color: 'var(--green)' },
          { label: 'Forsler features', src: 'FORSLER', srcColor: '#A78BFA', value: String(trees), sub: 'plots, lotes & key points', delta: '↑ live from Forsler', color: 'var(--green)' },
        ].map((m, i) => (
          <div key={i} className="metric" style={{ borderLeft: `2px solid ${m.srcColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              <span>{m.label}</span><span style={{ color: m.srcColor }}>{m.src}</span>
            </div>
            <div className="metric-value" style={{ color: m.color, fontSize: 20 }}>{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
            <div className="metric-delta up" style={{ fontSize: 9 }}>{m.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid-65">
        <Card title="Carbon stock — 16-year trajectory" sub="Forsler inventory · 2010 cattle baseline → 2026 established agroforestry">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[2010,2012,2014,2016,2018,2020,2022,2024,2026].map((yr, i) => {
              const vals = [6,11,19,31,45,58,71,82,co2/1000]
              const pct = Math.round((vals[i] / (co2/1000)) * 100)
              return (
                <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', width: 30 }}>{yr}</span>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,.06)', borderRadius: 2, height: 14, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: i === 8 ? '#A78BFA' : 'rgba(167,139,250,.4)', borderRadius: 2, transition: 'width .8s ease' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#A78BFA', width: 50, textAlign: 'right' }}>{typeof vals[i] === 'number' ? vals[i].toFixed(1) : vals[i]}k t</span>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 10 }}>Standing CO₂ stock derived by Forsler from biomass inventory.</div>
        </Card>

        <div>
          <Card title="Cross-source status">
            {[
              { k: 'XNatura — biodiversity', v: `${bioIdx}/100 · OK`, cls: 'g' },
              { k: 'SoilSense — soil network', v: '11/12 sensors', cls: 'a' },
              { k: 'Forsler — inventory', v: '62% sufficiency', cls: 'a' },
              { k: 'Forsler — risk mgmt', v: '2 watch items', cls: 'a' },
              { k: 'EUDR readiness', v: 'Live · passports issuing', cls: 'g' },
              { k: 'Carbon data sufficiency', v: '62% · VM0047 target 80%', cls: 'a' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd2)', fontSize: 11 }}>
                <span style={{ color: 'var(--muted)' }}>{row.k}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: row.cls === 'g' ? 'var(--green)' : '#FFB402' }}>{row.v}</span>
              </div>
            ))}
            <div style={{ background: 'var(--dark3)', borderLeft: '2px solid var(--green)', borderRadius: '0 6px 6px 0', padding: '10px 13px', fontSize: 11, lineHeight: 1.6, color: 'var(--txt)', marginTop: 8 }}>
              Baseline established across all three feeds. Open items: one soil sensor offline + disease and irrigation flags — see tabs.
            </div>
          </Card>

          <Card title="Recent cross-source activity" sub="Live feed">
            {[
              { color: '#22D3EE', title: 'XNatura — new bird detection batch', meta: 'Acoustic survey added 3 species to El Lago inventory.', time: '22m' },
              { color: '#FFB402', title: 'SoilSense — sensor SS-07 reporting gap', meta: 'No telemetry 6h on lote 13 — flagged for field check.', time: '6h' },
              { color: '#A78BFA', title: 'Forsler — biomass recalculation committed', meta: `Carbon stock live via Sentinel-2 · ${carbon?.source ?? 'Somarriba 2013'}`, time: '1d' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: i < 2 ? '1px solid var(--bd2)' : 'none' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 500, color: 'white' }}>{item.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{item.meta}</div>
                </div>
                <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)', flexShrink: 0 }}>{item.time}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

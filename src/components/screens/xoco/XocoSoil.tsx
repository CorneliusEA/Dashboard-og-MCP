'use client'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const SENSORS = [
  { id: 'SS-01', lote: 'L1',  read: '24.1°C', ok: true },
  { id: 'SS-04', lote: 'L4',  read: '25.0°C', ok: true },
  { id: 'SS-07', lote: 'L13', read: 'offline', ok: false },
  { id: 'SS-09', lote: 'L9',  read: '24.8°C', ok: true },
  { id: 'SS-11', lote: 'L16', read: '23.9°C', ok: true },
  { id: 'SS-12', lote: 'L18', read: '25.3°C', ok: true },
]

const PAW_TREND = [52, 50, 48, 46, 44, 42, 41, 40, 39, 38]

export function XocoSoil() {
  return (
    <div>
      <div className="section-label">SoilSense API · Sensor Network</div>
      <div className="section-title">Soil — El Lago Sensor Network</div>
      <div className="section-sub">In-ground sensor telemetry · hardware deployed · soil temperature, plant-available water, electrical conductivity</div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(255,180,2,.3)', background: 'var(--dark2)', color: '#FFB402', marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFB402', display: 'inline-block' }} />
        SOURCE · SOILSENSE API · mock data · live API pending · 11/12 sensors reporting
      </div>

      <div className="grid-3">
        {[
          { label: 'Soil temperature', value: '24.6°C', sub: 'field mean · root zone', color: 'var(--green)' },
          { label: 'Plant-available water', value: '38%', sub: 'field mean · % of capacity', color: '#FFB402' },
          { label: 'Electrical conductivity', value: '0.82 dS/m', sub: 'field mean · salinity proxy', color: 'var(--green)' },
        ].map((m, i) => (
          <div key={i} className="metric" style={{ borderLeft: `2px solid #FFB402` }}>
            <div style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: '#FFB402', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
            <div className="metric-value" style={{ color: m.color, fontSize: 20 }}>{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-65">
        <Card title="Plant-available water — 30-day trend" sub="Seasonal draw-down visible">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, padding: '8px 0' }}>
            {PAW_TREND.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: '100%', background: v < 40 ? 'rgba(255,180,2,.5)' : 'rgba(255,180,2,.25)', borderRadius: '2px 2px 0 0', height: `${(v / 60) * 120}px`, border: i === 9 ? '1px solid #FFB402' : 'none' }} />
                <span style={{ fontSize: 8, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{v}%</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>Sustained decline below 35% triggers the irrigation flag in Management.</div>
        </Card>

        <Card title="Sensor network status" sub="11 / 12 sensors reporting">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {SENSORS.map((s) => (
              <div key={s.id} style={{ background: 'var(--dark3)', border: `1px solid ${s.ok ? 'var(--bd)' : 'rgba(220,38,38,.3)'}`, borderRadius: 7, padding: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginBottom: 6 }}>
                  <span>{s.id}</span>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.ok ? '#FFB402' : 'var(--red)', display: 'inline-block', marginTop: 1 }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'white', marginBottom: 3 }}>Lote {s.lote.replace('L', '')}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: s.ok ? '#FFB402' : 'var(--red)' }}>{s.read}</div>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 7, padding: 10, marginTop: 10 }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>⚠ SS-07 on lote 13 offline — no telemetry for 6h. Field check required.</div>
          </div>
        </Card>
      </div>

      <Card title="Soil temp & EC by lote group">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['L1–5', 'L6–11', 'L12–15', 'L16–18'].map((lote, i) => {
            const temps = [24.1, 24.9, 25.4, 24.0]
            const ecs = [0.78, 0.85, 0.91, 0.74]
            return (
              <div key={lote} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', width: 40 }}>{lote}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>
                    <span>Temp: {temps[i]}°C</span><span>EC: {ecs[i]} dS/m</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 2, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${(temps[i] / 26) * 100}%`, height: '100%', background: '#FFB402', borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

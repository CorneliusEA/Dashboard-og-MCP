'use client'
import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const MOCK_SUMMARY = { meanTemperature: 24.6, meanPAW: 38, meanEC: 0.82, onlineSensors: 11, totalSensors: 12 }
const PAW_TREND    = [52, 50, 48, 46, 44, 42, 41, 40, 39, 38]

export function XocoSoil() {
  const { data, isLoading } = useSWR('/api/xoco/soil', fetcher, { refreshInterval: 300_000 })

  const live    = data?.source === 'live'
  const summary = live ? data.summary : MOCK_SUMMARY
  const sensors: { id: string; name: string; online: boolean }[] = live ? (data.sensors ?? []) : [
    { id: 'SS-01', name: 'Lote 1',  online: true  },
    { id: 'SS-04', name: 'Lote 4',  online: true  },
    { id: 'SS-07', name: 'Lote 13', online: false },
    { id: 'SS-09', name: 'Lote 9',  online: true  },
    { id: 'SS-11', name: 'Lote 16', online: true  },
    { id: 'SS-12', name: 'Lote 18', online: true  },
  ]

  const fmt = (v: number | null | undefined, unit: string) =>
    v != null ? `${v.toFixed(v < 10 ? 2 : 1)}${unit}` : '—'

  const offlineSensors = sensors.filter(s => !s.online)

  return (
    <div>
      <div className="section-label">SoilSense API · Sensor Network</div>
      <div className="section-title">Soil — El Lago Sensor Network</div>
      <div className="section-sub">In-ground sensor telemetry · soil temperature, plant-available water, electrical conductivity</div>

      {/* Status badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: `0.5px solid rgba(255,180,2,${live ? '.6' : '.3'})`, background: 'var(--dark2)', color: '#FFB402', marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: live ? '#FFB402' : '#666', display: 'inline-block' }} />
        {isLoading ? 'SOILSENSE · LOADING…' : live
          ? `SOILSENSE · LIVE · ${summary.onlineSensors}/${summary.totalSensors} SENSORS`
          : 'SOILSENSE · STAGING API PENDING · MOCK DATA'}
      </div>

      {/* KPI cards */}
      <div className="grid-3">
        {[
          { label: 'Soil temperature',      value: fmt(summary.meanTemperature, '°C'),   sub: 'field mean · root zone',          color: 'var(--green)' },
          { label: 'Plant-available water',  value: fmt(summary.meanPAW, '%'),            sub: 'field mean · % of capacity',      color: '#FFB402'      },
          { label: 'Electrical conductivity',value: fmt(summary.meanEC, ' dS/m'),         sub: 'field mean · salinity proxy',     color: 'var(--green)' },
        ].map((m, i) => (
          <div key={i} className="metric" style={{ borderLeft: '2px solid #FFB402' }}>
            <div style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: '#FFB402', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
            <div className="metric-value" style={{ color: m.color, fontSize: 20 }}>{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-65">
        {/* PAW trend */}
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

        {/* Sensor grid */}
        <Card title={`Sensor network status · ${summary.onlineSensors ?? '?'}/${summary.totalSensors ?? '?'} online`} sub="SoilSense telemetry">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {sensors.slice(0, 6).map((s) => {
              const reading = live ? data.readings?.find((r: { sensorId: string }) => r.sensorId === s.id) : null
              return (
                <div key={s.id} style={{ background: 'var(--dark3)', border: `1px solid ${s.online ? 'var(--bd)' : 'rgba(220,38,38,.3)'}`, borderRadius: 7, padding: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginBottom: 6 }}>
                    <span>{s.id}</span>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.online ? '#FFB402' : 'var(--red)', display: 'inline-block', marginTop: 1 }} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'white', marginBottom: 3 }}>{s.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: s.online ? '#FFB402' : 'var(--red)' }}>
                    {s.online ? (reading?.soilTemperature != null ? `${reading.soilTemperature.toFixed(1)}°C` : '—') : 'offline'}
                  </div>
                </div>
              )
            })}
          </div>
          {offlineSensors.length > 0 && (
            <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 7, padding: 10, marginTop: 10 }}>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>⚠ {offlineSensors.map(s => s.id).join(', ')} offline — no telemetry. Field check required.</div>
            </div>
          )}
          {!live && (
            <div style={{ background: 'rgba(255,180,2,.05)', border: '1px solid rgba(255,180,2,.15)', borderRadius: 7, padding: 10, marginTop: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>SoilSense staging API pending — add <code style={{ fontFamily: 'var(--mono)', background: 'rgba(255,255,255,.05)', padding: '1px 4px', borderRadius: 3 }}>SOILSENSE_BASE_URL</code> to Cloud Run env vars when ready.</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

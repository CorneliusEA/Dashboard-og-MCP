'use client'
import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { describeWeatherCode, type WeatherForecast } from '@/lib/weather'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface WeatherResponse extends Partial<WeatherForecast> {
  source: 'live' | 'error'
  error?: string
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CocaboWeather() {
  const { data, isLoading } = useSWR<WeatherResponse>('/api/cocabo/weather', fetcher, { refreshInterval: 900_000 })

  const live = data?.source === 'live'
  const current = data?.current
  const daily = data?.daily ?? []
  const currentDesc = current ? describeWeatherCode(current.weatherCode) : null

  return (
    <div>
      <div className="section-label">Open-Meteo · Weather</div>
      <div className="section-title">Weather — Bocas del Toro, Panama</div>
      <div className="section-sub">Current conditions and 7-day forecast · free, no dedicated weather station</div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(96,165,250,.3)', background: 'var(--dark2)', color: '#60A5FA', marginBottom: 18 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: live ? '#60A5FA' : '#FFB402', display: 'inline-block', animation: 'pulse 2s infinite' }} />
        OPEN-METEO · {isLoading ? 'LOADING' : live ? 'LIVE' : 'API ERROR'}
      </div>

      <div className="grid-65">
        <Card title="Current conditions" sub={current?.time ? `As of ${current.time.replace('T', ' ')}` : undefined}>
          {current && currentDesc ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ fontSize: 48, lineHeight: 1 }}>{currentDesc.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 32, fontWeight: 600, color: 'white', lineHeight: 1 }}>
                  {Math.round(current.temperatureC)}°C
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{currentDesc.label}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                <div>💧 {current.relativeHumidityPct}% humidity</div>
                <div>💨 {Math.round(current.windSpeedKmh)} km/h wind</div>
                <div>🌧️ {current.precipitationMm.toFixed(1)} mm now</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>
              {data?.source === 'error' ? `API error: ${data?.error ?? 'unknown'}` : 'Loading…'}
            </div>
          )}
        </Card>

        <Card title="Rain outlook · 7 days" sub="Sum of daily precipitation">
          {daily.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(() => {
                const maxPrecip = Math.max(...daily.map((d) => d.precipitationSumMm), 1)
                return daily.map((d) => (
                  <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', width: 32 }}>
                      {DAY_LABELS[new Date(d.date + 'T00:00:00').getDay()]}
                    </span>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.06)', borderRadius: 2, height: 12, overflow: 'hidden' }}>
                      <div style={{ width: `${(d.precipitationSumMm / maxPrecip) * 100}%`, height: '100%', background: 'rgba(96,165,250,.55)', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#60A5FA', width: 46, textAlign: 'right' }}>{d.precipitationSumMm.toFixed(1)} mm</span>
                  </div>
                ))
              })()}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>No forecast data yet.</div>
          )}
        </Card>
      </div>

      <Card title="7-day forecast" sub="Open-Meteo · updated every 15 min" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {daily.map((d, i) => {
            const desc = describeWeatherCode(d.weatherCode)
            return (
              <div key={d.date} style={{ background: 'var(--dark3)', border: '1px solid var(--bd)', borderRadius: 7, padding: '10px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)', marginBottom: 4 }}>
                  {i === 0 ? 'TODAY' : DAY_LABELS[new Date(d.date + 'T00:00:00').getDay()].toUpperCase()}
                </div>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{desc.icon}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'white' }}>
                  {Math.round(d.temperatureMaxC)}° <span style={{ color: 'var(--muted)' }}>{Math.round(d.temperatureMinC)}°</span>
                </div>
                <div style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: '#60A5FA', marginTop: 3 }}>{d.precipitationSumMm.toFixed(1)}mm</div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

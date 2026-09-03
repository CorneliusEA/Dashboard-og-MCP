'use client'
import useSWR from 'swr'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const SITE_ID = '101561'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface DiversityRange {
  min: number
  max: number
  label: string
  rank: string
  open_ended: boolean
}

interface DiversityMetric {
  total: number
  shannon: { shannon: number; clusters: number; shannon_range: DiversityRange[] }
  simpson: { simpson: number; simpson_range: DiversityRange[] }
  evenness: { evenness: number; evenness_range: DiversityRange[] }
  species_richness: number
  hourly: number
  hourly_range: DiversityRange[]
}

interface XNaturaKpis {
  all_data: DiversityMetric
  alien_only: DiversityMetric
  native_only: DiversityMetric
  endemic_only: DiversityMetric
}

interface XNaturaResponse {
  source: 'live' | 'pending' | 'error'
  siteId?: string
  kpis?: XNaturaKpis
  message?: string
  error?: string
}

function rankFor(value: number, ranges: DiversityRange[]): { label: string; rank: string } | null {
  if (!ranges.length) return null
  const match = ranges.find((r) => value >= r.min && (r.open_ended || value < r.max))
  const chosen = match ?? ranges[ranges.length - 1]
  return { label: chosen.label.replace(/_/g, ' '), rank: chosen.rank }
}

const INDICATOR_SPECIES = [
  { name: 'Keel-billed toucan', status: 'Present', variant: 'g' as const },
  { name: 'Three-toed sloth', status: 'Present', variant: 'g' as const },
  { name: 'Morpho butterfly', status: 'Present', variant: 'g' as const },
  { name: 'Jaguar (apex)', status: 'Absent — corridor watch', variant: 'a' as const },
  { name: 'Harpy eagle', status: 'Absent', variant: 'r' as const },
]

export function XocoBiodiversity() {
  const { data, isLoading } = useSWR<XNaturaResponse>('/api/xoco/xnatura', fetcher, { refreshInterval: 3600_000 })

  const all = data?.kpis?.all_data
  const native = data?.kpis?.native_only
  const alien = data?.kpis?.alien_only
  const endemic = data?.kpis?.endemic_only

  const shannonRank = all ? rankFor(all.shannon.shannon, all.shannon.shannon_range) : null
  const simpsonRank = all ? rankFor(all.simpson.simpson, all.simpson.simpson_range) : null
  const evennessRank = all ? rankFor(all.evenness.evenness, all.evenness.evenness_range) : null
  const hourlyRank = all ? rankFor(all.hourly, all.hourly_range) : null

  const metrics = [
    { label: 'Total observations', value: all ? String(all.total) : '—', sub: 'all sensors · all-time' },
    { label: 'Species richness', value: all ? String(all.species_richness) : '—', sub: 'distinct species clusters' },
    { label: 'Shannon diversity', value: all ? all.shannon.shannon.toFixed(2) : '—', sub: shannonRank ? `${shannonRank.label} · ${shannonRank.rank}` : '—' },
    { label: 'Simpson index', value: all ? all.simpson.simpson.toFixed(2) : '—', sub: simpsonRank ? `${simpsonRank.label} · ${simpsonRank.rank}` : '—' },
    { label: 'Evenness', value: all ? all.evenness.evenness.toFixed(2) : '—', sub: evennessRank ? `${evennessRank.label} · ${evennessRank.rank}` : '—' },
    { label: 'Observation rate', value: all ? `${all.hourly.toFixed(2)}/hr` : '—', sub: hourlyRank ? `${hourlyRank.label} · ${hourlyRank.rank}` : '—' },
  ]

  return (
    <div>
      <div className="section-label">Gaian-Natura · Nature Monitor</div>
      <div className="section-title">Biodiversity — El Lago, Nicaragua</div>
      <div className="section-sub">Live sensor data from Gaian-Natura · site {SITE_ID}</div>

      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(157,255,81,.3)', background: 'var(--dark2)', color: '#9DFF51' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: data?.source === 'live' ? '#9DFF51' : '#FFB402', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          GAIAN-NATURA · {isLoading ? 'LOADING' : data?.source === 'live' ? 'LIVE DATA' : data?.source === 'error' ? 'API ERROR' : 'NOT CONFIGURED'}
        </div>
      </div>

      {/* Live KPIs from platform.3bee.com */}
      <div className="grid-3">
        {metrics.map((m, i) => (
          <div key={i} className="metric">
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Indicator species + native/alien breakdown */}
      <div className="grid-65">
        <Card title="Indicator species — watch list" sub="Manually curated example list, not sourced from the Gaian-Natura API">
          {INDICATOR_SPECIES.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < INDICATOR_SPECIES.length - 1 ? '1px solid var(--bd2)' : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.variant === 'g' ? 'var(--green)' : item.variant === 'a' ? '#FFB402' : 'var(--red)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, fontWeight: 500, color: 'white' }}>{item.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{item.status}</div>
              </div>
              <Pill variant={item.variant}>{item.variant === 'g' ? 'PRESENT' : item.variant === 'a' ? 'WATCH' : 'ABSENT'}</Pill>
            </div>
          ))}
        </Card>

        <Card title="Native / alien / endemic split" sub="Gaian-Natura observation classification">
          {data?.source === 'live' && native && alien && endemic ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { k: 'Native', v: native.total, color: 'var(--green)' },
                { k: 'Alien', v: alien.total, color: '#FFB402' },
                { k: 'Endemic', v: endemic.total, color: '#22D3EE' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd2)', fontSize: 11 }}>
                  <span style={{ color: 'var(--muted)' }}>{row.k} observations</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: row.color }}>{row.v}</span>
                </div>
              ))}
              <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4 }}>
                Media (camera-trap images/sounds) endpoint returns no items for this site yet — nothing to display until Gaian-Natura has media logged.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>
              {data?.source === 'pending' ? 'Gaian-Natura API key not configured.' : data?.source === 'error' ? `API error: ${data?.error ?? 'unknown'}` : 'Loading…'}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

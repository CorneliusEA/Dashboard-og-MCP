'use client'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const SITE_ID = '101561'
const OWNER = 'earth-surveillance'
const XNATURA_BASE = `https://www.3bee.com/en/owner/${OWNER}/monitoring/site/${SITE_ID}`

const WIDGETS = [
  { id: 'monitoring-kpis', label: 'Monitoring KPIs', height: 420 },
  { id: 'field-observations', label: 'Field Observations', height: 480 },
]

const INDICATOR_SPECIES = [
  { name: 'Keel-billed toucan', status: 'Present', variant: 'g' as const },
  { name: 'Three-toed sloth', status: 'Present', variant: 'g' as const },
  { name: 'Morpho butterfly', status: 'Present', variant: 'g' as const },
  { name: 'Jaguar (apex)', status: 'Absent — corridor watch', variant: 'a' as const },
  { name: 'Harpy eagle', status: 'Absent', variant: 'r' as const },
]

export function XocoBiodiversity() {
  return (
    <div>
      <div className="section-label">XNatura · 3Bee · Nature Monitor</div>
      <div className="section-title">Biodiversity — El Lago, Nicaragua</div>
      <div className="section-sub">Live sensor data from XNatura platform · acoustic + camera-trap + visual survey pipeline · site {SITE_ID}</div>

      {/* Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(157,255,81,.3)', background: 'var(--dark2)', color: '#9DFF51' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9DFF51', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          XNATURA · LIVE WIDGETS · 3BEE PLATFORM
        </div>
        <a
          href={`${XNATURA_BASE}/census/`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(157,255,81,.2)', background: 'transparent', color: '#9DFF51', textDecoration: 'none', cursor: 'pointer' }}
        >
          ↗ OPEN FULL PLATFORM
        </a>
      </div>

      {/* XNatura embedded widgets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {WIDGETS.map((w) => (
          <div key={w.id}>
            <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
              XNATURA · {w.label}
            </div>
            <iframe
              src={`${XNATURA_BASE}/widgets/${w.id}/?variant=dark`}
              style={{ width: '100%', minHeight: w.height, border: 'none', borderRadius: 8, display: 'block', background: 'var(--dark2)' }}
              loading="lazy"
              allow="fullscreen"
              title={`XNatura ${w.label}`}
            />
          </div>
        ))}
      </div>

      {/* Indicator species + REST API note */}
      <div className="grid-65">
        <Card title="Indicator species — watch list" sub="Field observations · XNatura census data">
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

        <Card title="REST API — status" sub="3Bee API · Bearer token required">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'rgba(157,255,81,.05)', border: '1px solid rgba(157,255,81,.15)', borderRadius: 7, padding: 12 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#9DFF51', marginBottom: 6 }}>ENDPOINT</div>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)', lineHeight: 1.6 }}>
                GET api.3bee.com/v1/sites/{SITE_ID}/kpis<br />
                Authorization: Bearer TOKEN
              </div>
            </div>
            <div style={{ background: 'rgba(255,180,2,.05)', border: '1px solid rgba(255,180,2,.2)', borderRadius: 7, padding: 12 }}>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: '#FFB402', marginBottom: 4 }}>⚠ PENDING</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>
                API token not yet configured. Request from 3Bee technical onboarding, then add <code style={{ fontFamily: 'var(--mono)', background: 'rgba(255,255,255,.05)', padding: '1px 4px', borderRadius: 3 }}>XNATURA_API_TOKEN</code> to Cloud Run env vars.
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>
              Available data: species KPIs, diversity index, habitat coverage, phenology, weather. Will replace widget iframes with native dashboard cards once token is active.
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

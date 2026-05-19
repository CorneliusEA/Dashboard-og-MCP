'use client'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const INDICATORS = [
  { name: 'Keel-billed toucan', status: 'Present', variant: 'g' as const },
  { name: 'Three-toed sloth', status: 'Present', variant: 'g' as const },
  { name: 'Morpho butterfly', status: 'Present', variant: 'g' as const },
  { name: 'Jaguar (apex)', status: 'Absent — corridor watch', variant: 'a' as const },
  { name: 'Harpy eagle', status: 'Absent', variant: 'r' as const },
]

export function XocoBiodiversity() {
  return (
    <div>
      <div className="section-label">XNatura API · Nature Monitor</div>
      <div className="section-title">Biodiversity — El Lago</div>
      <div className="section-sub">Species monitoring across birds, mammals and insects · composite biodiversity index · XNatura acoustic + visual survey pipeline</div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(34,211,238,.3)', background: 'var(--dark2)', color: '#22D3EE', marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22D3EE', display: 'inline-block' }} />
        SOURCE · XNATURA API · mock data · live API pending
      </div>

      <div className="grid-4">
        {[
          { label: 'Birds', value: '234', sub: 'species documented' },
          { label: 'Mammals', value: '18', sub: 'species documented' },
          { label: 'Insects', value: '62', sub: 'taxa identified' },
          { label: 'Biodiversity index', value: '74/100', sub: 'composite · 0–100' },
        ].map((m, i) => (
          <div key={i} className="metric g" style={{ borderLeft: '2px solid #22D3EE' }}>
            <div style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: '#22D3EE', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
            <div className="metric-value">{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-65">
        <div>
          <Card title="Species count by class" sub="XNatura combined acoustic, camera-trap and visual survey">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
              {[
                { label: 'Birds', value: 234, max: 234, color: '#22D3EE' },
                { label: 'Mammals', value: 18, max: 234, color: '#A78BFA' },
                { label: 'Insects', value: 62, max: 234, color: '#60A5FA' },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                    <span style={{ color: '#D1D5DB' }}>{item.label}</span>
                    <span style={{ fontFamily: 'var(--mono)', color: item.color }}>{item.value}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 2, height: 10, overflow: 'hidden' }}>
                    <div style={{ width: `${(item.value / item.max) * 100}%`, height: '100%', background: item.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 12 }}>Biodiversity index recovering as agroforestry canopy matures. Indicator-species absence is the main suppressor.</div>
          </Card>

          <Card title="Biodiversity index — trend" sub="Composite index · 6 periods">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
              {[58,61,64,67,70,74].map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', background: i === 5 ? '#22D3EE' : 'rgba(34,211,238,.3)', borderRadius: '2px 2px 0 0', height: `${(v/100)*100}%` }} />
                  <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title="Indicator species — watch list" sub="XNatura">
          {INDICATORS.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < INDICATORS.length - 1 ? '1px solid var(--bd2)' : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.variant === 'g' ? 'var(--green)' : item.variant === 'a' ? '#FFB402' : 'var(--red)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, fontWeight: 500, color: 'white' }}>{item.name}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{item.status}</div>
              </div>
              <Pill variant={item.variant}>{item.variant === 'g' ? 'PRESENT' : item.variant === 'a' ? 'WATCH' : 'ABSENT'}</Pill>
            </div>
          ))}
          <div style={{ background: 'rgba(34,211,238,.05)', border: '1px solid rgba(34,211,238,.15)', borderRadius: 7, padding: 12, marginTop: 12 }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5 }}>XNatura API credentials expected — live acoustic + camera-trap data will replace mock values automatically.</div>
          </div>
        </Card>
      </div>
    </div>
  )
}

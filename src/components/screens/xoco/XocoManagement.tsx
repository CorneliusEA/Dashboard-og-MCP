'use client'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

const ITEMS = [
  {
    color: '#FFB402', title: 'Risk — dry-season drought / fire window',
    meta: 'Elevated through April. Monitor soil water; pre-position irrigation.',
    status: 'ELEVATED', variant: 'a' as const,
    detail: 'Dec–Apr dry season · drought + fire exposure. Monitor PAW; pre-position irrigation on lotes 4 & 11.',
  },
  {
    color: '#FFB402', title: 'Disease — monilia pressure rising',
    meta: 'Early detections in lotes 6–8. Sanitary removal + shade pruning.',
    status: 'WATCH', variant: 'a' as const,
    detail: 'Humidity + canopy density raise monilia pressure. Sanitary pod removal; review shade pruning in affected lotes.',
  },
  {
    color: '#FFB402', title: 'Irrigation — PAW near trigger threshold',
    meta: 'Field-mean plant-available water approaching the 35% action level.',
    status: 'ACTION', variant: 'a' as const,
    detail: 'Seasonal PAW draw-down approaching threshold. Activate catchment irrigation on lotes with lowest PAW.',
  },
  {
    color: 'var(--green)', title: 'Minerals — nutrient status stable',
    meta: 'N, P, K, Mg within target ranges. Continue quarterly sampling.',
    status: 'STABLE', variant: 'g' as const,
    detail: 'Genízaro nitrogen fixation supporting N levels. No action required — continue quarterly sampling.',
  },
]

const LOTES = ['L1–5', 'L6–8', 'L9–11', 'L12–15', 'L16–18']
const DISEASE = [18, 64, 32, 28, 21]
const IRRIGATION = [40, 58, 46, 52, 38]

export function XocoManagement() {
  return (
    <div>
      <div className="section-label">Gaian-Earth Mapping API · Management</div>
      <div className="section-title">Management — Risk, Disease, Irrigation, Minerals</div>
      <div className="section-sub">Operational decision support from the Gaian-Earth Mapping management module · four areas Xoco acts on directly</div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(167,139,250,.3)', background: 'var(--dark2)', color: '#A78BFA', marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', display: 'inline-block' }} />
        SOURCE · GAIAN-EARTH MAPPING API · management module · mock data
      </div>

      <div className="grid-4">
        {[
          { label: 'Risk management', value: 'Elevated', sub: 'dry-season window', color: '#FFB402' },
          { label: 'Disease', value: 'Watch', sub: 'monilia pressure rising', color: '#FFB402' },
          { label: 'Irrigation', value: 'Action', sub: 'PAW near threshold', color: '#FFB402' },
          { label: 'Minerals', value: 'Stable', sub: 'within target ranges', color: 'var(--green)' },
        ].map((m, i) => (
          <div key={i} className="metric" style={{ borderLeft: `2px solid #A78BFA` }}>
            <div style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: '#A78BFA', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>{m.label}</div>
            <div className="metric-value" style={{ color: m.color, fontSize: 18 }}>{m.value}</div>
            <div className="metric-sub">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-65">
        <Card title="Active management items" sub="2 actionable">
          {ITEMS.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < ITEMS.length - 1 ? '1px solid var(--bd2)' : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, fontWeight: 500, color: 'white' }}>{item.title}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{item.meta}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>{item.detail}</div>
              </div>
              <Pill variant={item.variant}>{item.status}</Pill>
            </div>
          ))}
        </Card>

        <Card title="How management uses the feeds">
          {[
            { color: '#FFB402', text: 'Risk & irrigation read directly from Gaian-Soilsensor — plant-available water and EC drive the dry-season and irrigation flags.' },
            { color: '#A78BFA', text: 'Disease pressure correlates with Gaian-Soilsensor humidity and Gaian-Earth Mapping canopy-density layers — combined to score monilia risk per lote.' },
            { color: 'var(--green)', text: 'Minerals cross-checks Gaian-Soilsensor EC against periodic lab sampling — EC alone is a salinity proxy, not a full nutrient panel.' },
          ].map((item, i) => (
            <div key={i} style={{ background: 'var(--dark3)', borderLeft: `2px solid ${item.color}`, borderRadius: '0 6px 6px 0', padding: '10px 13px', fontSize: 11, lineHeight: 1.6, color: 'var(--txt)', marginBottom: 8 }}>
              {item.text}
            </div>
          ))}
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, lineHeight: 1.55 }}>The management module is where the three feeds converge into decisions — this is the tab Xoco&apos;s field team works from.</div>
        </Card>
      </div>

      <Card title="Disease & irrigation pressure by lote" sub="Higher bars indicate greater pressure — lotes 6–8 lead on both">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 120, padding: '8px 0' }}>
          {LOTES.map((lote, i) => (
            <div key={lote} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: 90 }}>
                <div style={{ flex: 1, background: 'rgba(248,70,11,.5)', borderRadius: '2px 2px 0 0', height: `${DISEASE[i]}%` }} />
                <div style={{ flex: 1, background: 'rgba(255,180,2,.5)', borderRadius: '2px 2px 0 0', height: `${IRRIGATION[i]}%` }} />
              </div>
              <span style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{lote}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: 9, color: 'rgba(248,70,11,.8)' }}>■ Disease</span>
          <span style={{ fontSize: 9, color: 'rgba(255,180,2,.8)' }}>■ Irrigation</span>
        </div>
      </Card>
    </div>
  )
}

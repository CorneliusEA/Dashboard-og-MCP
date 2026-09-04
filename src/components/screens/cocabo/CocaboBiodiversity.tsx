'use client'
import { Card } from '@/components/ui/Card'

export function CocaboBiodiversity() {
  return (
    <div>
      <div className="section-label">Gaian-Natura · Nature Monitor</div>
      <div className="section-title">Biodiversity — Bocas del Toro, Panama</div>
      <div className="section-sub">No biodiversity data source connected for COCABO yet</div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(220,38,38,.3)', background: 'var(--dark2)', color: '#DC2626', marginBottom: 18 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
        GAIAN-NATURA · NOT AVAILABLE
      </div>

      <Card title="No biodiversity monitoring set up for this site">
        <div style={{ fontSize: 11.5, color: 'var(--txt)', lineHeight: 1.6, marginBottom: 10 }}>
          Xoco Gourmet's biodiversity data comes from a 3Bee/XNatura camera-trap and acoustic monitoring site
          registered against that farm specifically. No equivalent site exists for COCABO — confirmed against the
          live 3Bee account: no site is registered for this estate.
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          To bring this online: a 3Bee monitoring site would need to be physically deployed and registered for
          COCABO, the same way it was for Xoco's El Lago farm.
        </div>
      </Card>
    </div>
  )
}

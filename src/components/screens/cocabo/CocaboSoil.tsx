'use client'
import { Card } from '@/components/ui/Card'

export function CocaboSoil() {
  return (
    <div>
      <div className="section-label">Gaian-Soilsensor · Sensor Network</div>
      <div className="section-title">Soil — Bocas del Toro, Panama</div>
      <div className="section-sub">No soil sensor network installed for COCABO yet</div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 9px', borderRadius: 4, border: '0.5px solid rgba(220,38,38,.3)', background: 'var(--dark2)', color: '#DC2626', marginBottom: 18 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }} />
        GAIAN-SOILSENSOR · NOT AVAILABLE
      </div>

      <Card title="No soil sensors deployed for this site">
        <div style={{ fontSize: 11.5, color: 'var(--txt)', lineHeight: 1.6, marginBottom: 10 }}>
          Xoco Gourmet's soil moisture/temperature data comes from physical in-ground sensors installed at El Lago
          (Finca del Lago), registered under that farm specifically. Confirmed against the live SoilSense
          account: no sites exist for COCABO.
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          To bring this online: SoilSense hardware would need to be physically installed across COCABO's plots,
          the same way it was for Xoco.
        </div>
      </Card>
    </div>
  )
}

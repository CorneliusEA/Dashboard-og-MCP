'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ClientCard {
  name: string
  subtitle: string
  location: string
  flag: string
  href: string
  status: string
  statusColor: string
  accentColor: string
  metrics: { label: string; value: string; color?: string }[]
  tags: string[]
  phase: string
}

const CLIENTS: ClientCard[] = [
  {
    name: 'COCABO',
    subtitle: 'Natural Capital Monitor',
    location: 'Bocas del Toro, Panama',
    flag: '🇵🇦',
    href: '/cocabo',
    status: 'PHASE 1 · ACTIVE',
    statusColor: 'var(--green)',
    accentColor: '#2ECC71',
    metrics: [
      { label: 'Farmers', value: '1,438' },
      { label: 'Area', value: '4,394 ha' },
      { label: 'Carbon reserve', value: '1.88M tCO₂e', color: 'var(--green)' },
      { label: 'EUDR status', value: 'Phase 1', color: '#D97706' },
    ],
    tags: ['EUDR', 'Carbon', 'E-Ledger', 'Biodiversity', 'Finance'],
    phase: 'Phase 1 — Discovery + EUDR Baseline',
  },
  {
    name: 'XOCO GOURMET',
    subtitle: 'Management Dashboard',
    location: 'El Lago, Nicaragua',
    flag: '🇳🇮',
    href: '/xoco',
    status: 'PILOT · ACTIVE',
    statusColor: '#9DFF51',
    accentColor: '#9DFF51',
    metrics: [
      { label: 'Site area', value: '95.4 ha' },
      { label: 'Carbon stock', value: '29k+ tCO₂e', color: '#9DFF51' },
      { label: 'Passports issued', value: '47', color: '#9DFF51' },
      { label: 'EUDR readiness', value: 'Live', color: '#9DFF51' },
    ],
    tags: ['Forsler', 'XNatura', 'SoilSense', 'EUDR', 'Carbon'],
    phase: 'Pilot — XNatura · SoilSense · Forsler',
  },
]

export default function Portal() {
  const [clock, setClock] = useState('--:--:--')
  const [cocaboCarbon, setCocaboCarbon] = useState<string | null>(null)
  const [xocoCarbon, setXocoCarbon] = useState<string | null>(null)

  useEffect(() => {
    const tick = () => setClock(new Date().toUTCString().split(' ')[4] + ' UTC')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetcher('/api/sentinel').then(d => {
      if (d?.totalCarbonTCO2e) setCocaboCarbon((d.totalCarbonTCO2e / 1_000_000).toFixed(2) + 'M tCO₂e')
    }).catch(() => {})
    fetcher('/api/xoco/carbon').then(d => {
      if (d?.totalCO2e) setXocoCarbon((d.totalCO2e / 1000).toFixed(1) + 'k tCO₂e')
    }).catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <div className="topbar">
        <span className="logo">EARTH SURVEILLANCE</span>
        <span className="logo-sep">/</span>
        <span className="logo-context">Client Portal</span>
        <div style={{ flex: 1 }} />
        <div className="topbar-right">
          <div className="live-dot" />
          <span className="live-label">LIVE</span>
          <span className="clock">{clock}</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '48px 48px 0', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--gd)', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 10 }}>
          Earth Surveillance · Natural Capital Intelligence
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, color: 'white', letterSpacing: '-.02em', marginBottom: 8 }}>
          Client Dashboards
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 40, maxWidth: 520, lineHeight: 1.6 }}>
          Live natural capital monitoring across all active pilots — carbon, biodiversity, EUDR compliance and traceability.
        </div>

        {/* Client cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, paddingBottom: 48 }}>
          {CLIENTS.map((client) => {
            const liveCarbon = client.href === '/cocabo' ? cocaboCarbon : xocoCarbon
            const displayMetrics = liveCarbon
              ? client.metrics.map(m => m.label === 'Carbon reserve' || m.label === 'Carbon stock' ? { ...m, value: liveCarbon } : m)
              : client.metrics

            return (
              <Link key={client.href} href={client.href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: 'var(--dark2)',
                    border: `1px solid var(--bd)`,
                    borderRadius: 14,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all .2s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = client.accentColor + '60'
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${client.accentColor}18`
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)'
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  {/* Color strip */}
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${client.accentColor}, ${client.accentColor}40)` }} />

                  {/* Header */}
                  <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid var(--bd2)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 18 }}>{client.flag}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: client.accentColor, letterSpacing: '.08em' }}>{client.name}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'white', fontWeight: 500, marginBottom: 2 }}>{client.subtitle}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)' }}>{client.location}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${client.accentColor}12`, border: `1px solid ${client.accentColor}30`, borderRadius: 4, padding: '3px 9px' }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: client.accentColor, animation: 'pulse 2s infinite' }} />
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: client.accentColor, letterSpacing: '.08em' }}>{client.status}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{client.phase}</div>
                  </div>

                  {/* Metrics grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    {displayMetrics.map((m, i) => (
                      <div key={i} style={{
                        padding: '14px 20px',
                        borderBottom: i < 2 ? '1px solid var(--bd2)' : 'none',
                        borderRight: i % 2 === 0 ? '1px solid var(--bd2)' : 'none',
                      }}>
                        <div style={{ fontSize: 8.5, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 5 }}>{m.label}</div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 600, color: m.color ?? 'white' }}>{m.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{ padding: '14px 22px', borderTop: '1px solid var(--bd2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {client.tags.map(tag => (
                        <span key={tag} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, padding: '2px 7px', borderRadius: 3, background: 'rgba(255,255,255,.05)', border: '1px solid var(--bd)', color: 'var(--muted)' }}>{tag}</span>
                      ))}
                    </div>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: client.accentColor, display: 'flex', alignItems: 'center', gap: 5 }}>
                      Open →
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Footer note */}
        <div style={{ borderTop: '1px solid var(--bd2)', paddingTop: 20, paddingBottom: 32, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          <span>EARTH SURVEILLANCE · Natural Capital Intelligence Platform</span>
          <span>Carbon data live from Sentinel-2 · GPS data live from Forsler</span>
        </div>
      </div>
    </div>
  )
}

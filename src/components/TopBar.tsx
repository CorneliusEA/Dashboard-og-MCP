'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Tab = 'overview' | 'eudr' | 'carbon' | 'eledger' | 'biodiversity' | 'finance'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'eudr', label: 'EUDR Compliance' },
  { id: 'carbon', label: 'Carbon Reserve' },
  { id: 'eledger', label: 'E-Ledger' },
  { id: 'biodiversity', label: 'Biodiversity' },
  { id: 'finance', label: 'Finance' },
]

interface TopBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function TopBar({ activeTab, onTabChange }: TopBarProps) {
  const [clock, setClock] = useState('--:--:--')

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Panama' }) + ' PAN')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="topbar">
      <Link href="/" style={{ textDecoration: 'none' }}>
        <img src="/es-logo.svg" alt="Earth Surveillance" style={{ height: 24, width: 'auto', marginRight: 16, cursor: 'pointer' }} />
      </Link>
      <span className="logo-sep">/</span>
      <span className="logo-context">COCABO · Bocas del Toro, Panama</span>
      <div className="nav-tabs">
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`nav-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>
      <div className="topbar-right">
        <span className="phase-badge">PHASE 1 · PRE-DISCOVERY</span>
        <div className="live-dot" />
        <span className="live-label">LIVE</span>
        <span className="clock">{clock}</span>
      </div>
    </div>
  )
}

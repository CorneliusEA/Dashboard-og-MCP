'use client'
import { useEffect, useState, useCallback } from 'react'
import type { XocoTab } from '@/components/XocoSidebar'

type CocaboTab = 'overview' | 'eudr' | 'carbon' | 'eledger' | 'biodiversity' | 'finance'
export type Client = 'cocabo' | 'xoco'

const COCABO_TABS: { id: CocaboTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'eudr', label: 'EUDR Compliance' },
  { id: 'carbon', label: 'Carbon Reserve' },
  { id: 'eledger', label: 'E-Ledger' },
  { id: 'biodiversity', label: 'Biodiversity' },
  { id: 'finance', label: 'Finance' },
]

interface TopBarProps {
  activeTab: CocaboTab | XocoTab
  onTabChange: (tab: CocaboTab) => void
  client: Client
  onClientChange: (c: Client) => void
  isAdmin: boolean
}

export function TopBar({ activeTab, onTabChange, client, onClientChange, isAdmin }: TopBarProps) {
  const [clock, setClock] = useState('--:--:--')
  const [logoClicks, setLogoClicks] = useState(0)

  useEffect(() => {
    const tz = client === 'xoco' ? 'America/Managua' : 'America/Panama'
    const suffix = client === 'xoco' ? 'NIC' : 'PAN'
    const tick = () => setClock(new Date().toLocaleTimeString('en-GB', { timeZone: tz }) + ' ' + suffix)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [client])

  // Triple-click logo activates admin mode
  const handleLogoClick = useCallback(() => {
    setLogoClicks(n => {
      const next = n + 1
      if (next >= 3) {
        localStorage.setItem('es_staff', '1')
        window.dispatchEvent(new Event('es_staff'))
        setLogoClicks(0)
        return 0
      }
      setTimeout(() => setLogoClicks(0), 800)
      return next
    })
  }, [])

  const contextLabel = client === 'cocabo'
    ? 'COCABO · Bocas del Toro, Panama'
    : 'XOCO GOURMET · El Lago, Nicaragua'

  const phaseBadge = client === 'cocabo' ? 'PHASE 1 · PRE-DISCOVERY' : 'PILOT · MANAGEMENT'

  return (
    <div className="topbar">
      <span className="logo" onClick={handleLogoClick} style={{ cursor: 'default', userSelect: 'none' }}>EARTH SURVEILLANCE</span>
      <span className="logo-sep">/</span>
      {isAdmin ? (
        <select
          value={client}
          onChange={e => onClientChange(e.target.value as Client)}
          style={{
            background: 'rgba(255,255,255,.06)', border: '1px solid var(--bd)', borderRadius: 4,
            color: client === 'xoco' ? '#9DFF51' : 'var(--cacao-light)', fontFamily: 'var(--mono)',
            fontSize: 10, padding: '2px 8px', letterSpacing: '.06em', marginRight: 24, cursor: 'pointer',
          }}
        >
          <option value="cocabo">COCABO · Panama</option>
          <option value="xoco">XOCO GOURMET · Nicaragua</option>
        </select>
      ) : (
        <span className="logo-context">{contextLabel}</span>
      )}

      {client === 'cocabo' && (
        <div className="nav-tabs">
          {COCABO_TABS.map((t) => (
            <div
              key={t.id}
              className={`nav-tab${activeTab === t.id ? ' active' : ''}`}
              onClick={() => onTabChange(t.id as CocaboTab)}
            >
              {t.label}
            </div>
          ))}
        </div>
      )}

      {client === 'xoco' && (
        <div className="nav-tabs" style={{ pointerEvents: 'none' }}>
          <div className="nav-tab active" style={{ color: '#9DFF51', borderBottomColor: '#9DFF51' }}>
            XOCO MANAGEMENT DASHBOARD
          </div>
        </div>
      )}

      <div className="topbar-right">
        <span className="phase-badge" style={client === 'xoco' ? { background: 'rgba(157,255,81,.08)', borderColor: 'rgba(157,255,81,.25)', color: '#9DFF51' } : {}}>
          {phaseBadge}
        </span>
        <div className="live-dot" style={client === 'xoco' ? { background: '#9DFF51' } : {}} />
        <span className="live-label" style={client === 'xoco' ? { color: '#9DFF51' } : {}}>LIVE</span>
        <span className="clock">{clock}</span>
      </div>
    </div>
  )
}

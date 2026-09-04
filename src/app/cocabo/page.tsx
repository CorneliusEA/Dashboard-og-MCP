'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CocaboSidebar, type CocaboTab } from '@/components/CocaboSidebar'
import { Overview } from '@/components/screens/Overview'
import { CocaboBiodiversity } from '@/components/screens/cocabo/CocaboBiodiversity'
import { CocaboSoil } from '@/components/screens/cocabo/CocaboSoil'
import { CocaboWeather } from '@/components/screens/cocabo/CocaboWeather'
import { Carbon } from '@/components/screens/Carbon'
import { CocaboSiteLayers } from '@/components/screens/cocabo/CocaboSiteLayers'
import { EUDR } from '@/components/screens/EUDR'
import { ELedger } from '@/components/screens/ELedger'
import { Finance } from '@/components/screens/Finance'

const SCREENS: Record<CocaboTab, React.ReactNode> = {
  overview: <Overview />,
  biodiversity: <CocaboBiodiversity />,
  soil: <CocaboSoil />,
  weather: <CocaboWeather />,
  inventory: <Carbon />,
  layers: <CocaboSiteLayers />,
  eudr: <EUDR />,
  eledger: <ELedger />,
  finance: <Finance />,
}

function CocaboTopBar() {
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
        <img src="/es-logo.svg" alt="Earth Surveillance" style={{ height: 16, width: 'auto', marginRight: 16, cursor: 'pointer' }} />
      </Link>
      <span className="logo-sep">/</span>
      <span className="logo-context" style={{ color: 'var(--green)' }}>COCABO · Bocas del Toro, Panama</span>
      <div className="nav-tabs">
        <div className="nav-tab active" style={{ color: 'var(--green)', borderBottomColor: 'var(--green)', pointerEvents: 'none' }}>
          NATURAL CAPITAL MONITOR
        </div>
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

export default function CocaboDashboard() {
  const [activeTab, setActiveTab] = useState<CocaboTab>('overview')

  return (
    <>
      <CocaboTopBar />
      <div className="xoco-body">
        <CocaboSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="xoco-screens">
          <div className="screen">{SCREENS[activeTab]}</div>
        </div>
      </div>
    </>
  )
}

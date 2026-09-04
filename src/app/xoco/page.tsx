'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { XocoSidebar, type XocoTab } from '@/components/XocoSidebar'
import { XocoOverview } from '@/components/screens/xoco/XocoOverview'
import { XocoBiodiversity } from '@/components/screens/xoco/XocoBiodiversity'
import { XocoSoil } from '@/components/screens/xoco/XocoSoil'
import { XocoWeather } from '@/components/screens/xoco/XocoWeather'
import { XocoInventory } from '@/components/screens/xoco/XocoInventory'
import { XocoSiteLayers } from '@/components/screens/xoco/XocoSiteLayers'
import { XocoManagement } from '@/components/screens/xoco/XocoManagement'
import { XocoEUDR } from '@/components/screens/xoco/XocoEUDR'

const SCREENS: Record<XocoTab, React.ReactNode> = {
  overview: <XocoOverview />,
  biodiversity: <XocoBiodiversity />,
  soil: <XocoSoil />,
  weather: <XocoWeather />,
  inventory: <XocoInventory />,
  layers: <XocoSiteLayers />,
  management: <XocoManagement />,
  eudr: <XocoEUDR />,
}

function XocoTopBar() {
  const [clock, setClock] = useState('--:--:--')

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString('en-GB', { timeZone: 'America/Managua' }) + ' NIC')
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
      <span className="logo-context" style={{ color: '#9DFF51' }}>XOCO GOURMET · El Lago, Nicaragua</span>
      <div className="nav-tabs">
        <div className="nav-tab active" style={{ color: '#9DFF51', borderBottomColor: '#9DFF51', pointerEvents: 'none' }}>
          MANAGEMENT DASHBOARD
        </div>
      </div>
      <div className="topbar-right">
        <span className="phase-badge" style={{ background: 'rgba(157,255,81,.08)', borderColor: 'rgba(157,255,81,.25)', color: '#9DFF51' }}>
          PILOT · ACTIVE
        </span>
        <div className="live-dot" style={{ background: '#9DFF51' }} />
        <span className="live-label" style={{ color: '#9DFF51' }}>LIVE</span>
        <span className="clock">{clock}</span>
      </div>
    </div>
  )
}

export default function XocoDashboard() {
  const [activeTab, setActiveTab] = useState<XocoTab>('overview')

  return (
    <>
      <XocoTopBar />
      <div className="xoco-body">
        <XocoSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="xoco-screens">
          <div className="screen">{SCREENS[activeTab]}</div>
        </div>
      </div>
    </>
  )
}

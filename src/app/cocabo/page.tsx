'use client'
import { useState } from 'react'
import { TopBar } from '@/components/TopBar'
import { Overview } from '@/components/screens/Overview'
import { EUDR } from '@/components/screens/EUDR'
import { Carbon } from '@/components/screens/Carbon'
import { ELedger } from '@/components/screens/ELedger'
import { Biodiversity } from '@/components/screens/Biodiversity'
import { Finance } from '@/components/screens/Finance'

type Tab = 'overview' | 'eudr' | 'carbon' | 'eledger' | 'biodiversity' | 'finance'

const SCREENS: Record<Tab, React.ReactNode> = {
  overview: <Overview />,
  eudr: <EUDR />,
  carbon: <Carbon />,
  eledger: <ELedger />,
  biodiversity: <Biodiversity />,
  finance: <Finance />,
}

export default function CocaboDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <>
      <TopBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="screens">
        <div className="screen">{SCREENS[activeTab]}</div>
      </div>
    </>
  )
}

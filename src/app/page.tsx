'use client'
import { useState, useEffect } from 'react'
import { TopBar, type Client } from '@/components/TopBar'
import { XocoSidebar, type XocoTab } from '@/components/XocoSidebar'
import { Overview } from '@/components/screens/Overview'
import { EUDR } from '@/components/screens/EUDR'
import { Carbon } from '@/components/screens/Carbon'
import { ELedger } from '@/components/screens/ELedger'
import { Biodiversity } from '@/components/screens/Biodiversity'
import { Finance } from '@/components/screens/Finance'
import { XocoOverview } from '@/components/screens/xoco/XocoOverview'
import { XocoBiodiversity } from '@/components/screens/xoco/XocoBiodiversity'
import { XocoSoil } from '@/components/screens/xoco/XocoSoil'
import { XocoInventory } from '@/components/screens/xoco/XocoInventory'
import { XocoSiteLayers } from '@/components/screens/xoco/XocoSiteLayers'
import { XocoManagement } from '@/components/screens/xoco/XocoManagement'
import { XocoEUDR } from '@/components/screens/xoco/XocoEUDR'

type CocaboTab = 'overview' | 'eudr' | 'carbon' | 'eledger' | 'biodiversity' | 'finance'

const COCABO_SCREENS: Record<CocaboTab, React.ReactNode> = {
  overview: <Overview />,
  eudr: <EUDR />,
  carbon: <Carbon />,
  eledger: <ELedger />,
  biodiversity: <Biodiversity />,
  finance: <Finance />,
}

const XOCO_SCREENS: Record<XocoTab, React.ReactNode> = {
  overview: <XocoOverview />,
  biodiversity: <XocoBiodiversity />,
  soil: <XocoSoil />,
  inventory: <XocoInventory />,
  layers: <XocoSiteLayers />,
  management: <XocoManagement />,
  eudr: <XocoEUDR />,
}

export default function Dashboard() {
  const [cocaboTab, setCocaboTab] = useState<CocaboTab>('overview')
  const [xocoTab, setXocoTab] = useState<XocoTab>('overview')
  const [client, setClient] = useState<Client>('cocabo')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('es_staff') === '1') setIsAdmin(true)
    const savedClient = localStorage.getItem('es_client') as Client | null
    if (savedClient === 'xoco' || savedClient === 'cocabo') setClient(savedClient)

    const onStaff = () => setIsAdmin(true)
    window.addEventListener('es_staff', onStaff)
    return () => window.removeEventListener('es_staff', onStaff)
  }, [])

  const handleClientChange = (c: Client) => {
    setClient(c)
    localStorage.setItem('es_client', c)
  }

  const activeTab = client === 'cocabo' ? cocaboTab : xocoTab

  return (
    <>
      <TopBar
        activeTab={activeTab}
        onTabChange={setCocaboTab}
        client={client}
        onClientChange={handleClientChange}
        isAdmin={isAdmin}
      />
      {client === 'cocabo' ? (
        <div className="screens">
          <div className="screen">{COCABO_SCREENS[cocaboTab]}</div>
        </div>
      ) : (
        <div className="xoco-body">
          <XocoSidebar activeTab={xocoTab} onTabChange={setXocoTab} />
          <div className="xoco-screens">
            <div className="screen">{XOCO_SCREENS[xocoTab]}</div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

export type CocaboTab = 'overview' | 'biodiversity' | 'soil' | 'weather' | 'inventory' | 'layers' | 'eudr' | 'eledger' | 'finance'

interface Props {
  activeTab: CocaboTab
  onTabChange: (tab: CocaboTab) => void
}

const ITEMS: { tab: CocaboTab; label: string; section?: string; color: string; badge?: string; badgeClass?: string }[] = [
  { tab: 'overview',     label: 'Overview',          section: 'Pilot',              color: 'var(--green)', badge: 'Live',   badgeClass: 'g' },
  { tab: 'biodiversity', label: 'Biodiversity',      section: 'Gaian-Natura',       color: '#22D3EE',      badge: 'N/A',    badgeClass: 'r' },
  { tab: 'soil',         label: 'Soil sensors',      section: 'Gaian-Soilsensor',   color: '#FFB402',      badge: 'N/A',    badgeClass: 'r' },
  { tab: 'weather',      label: 'Weather',           section: 'Weather',            color: '#60A5FA',      badge: 'Live',   badgeClass: 'g' },
  { tab: 'inventory',    label: 'Inventory & carbon', section: 'Gaian-Earth Mapping', color: '#A78BFA',    badge: 'OK',     badgeClass: 'g' },
  { tab: 'layers',       label: 'Site layers',       color: '#A78BFA',              badge: '2',    badgeClass: 'g' },
  { tab: 'eudr',         label: 'EUDR',              section: 'Compliance',         color: '#60A5FA',      badge: 'Phase 1', badgeClass: 'a' },
  { tab: 'eledger',      label: 'E-Ledger',          color: '#60A5FA',              badge: 'OK',     badgeClass: 'g' },
  { tab: 'finance',      label: 'Finance',           color: '#60A5FA',              badge: undefined },
]

export function CocaboSidebar({ activeTab, onTabChange }: Props) {
  let lastSection = ''
  return (
    <div className="xoco-sidebar">
      {ITEMS.map((item) => {
        const showSection = item.section && item.section !== lastSection
        if (item.section) lastSection = item.section
        return (
          <div key={item.tab}>
            {showSection && <div className="xoco-sb-section">{item.section}</div>}
            <div
              className={`xoco-sb-item${activeTab === item.tab ? ' active' : ''}`}
              onClick={() => onTabChange(item.tab)}
            >
              <div className="xoco-sb-dot" style={{ background: item.color }} />
              <span>{item.label}</span>
              {item.badge && (
                <span className={`xoco-sb-badge ${item.badgeClass}`}>{item.badge}</span>
              )}
            </div>
          </div>
        )
      })}

      <div className="xoco-sb-meta">
        <div className="xoco-sb-meta-k">Client</div>
        <div className="xoco-sb-meta-v">COCABO R.L.</div>
        <div className="xoco-sb-meta-k">Pilot site</div>
        <div className="xoco-sb-meta-v">Bocas del Toro · Panama · 4,394 ha</div>
        <div className="xoco-sb-meta-k">Data feeds</div>
        <div className="xoco-sb-meta-v">Sentinel-2 · Gaian-Earth Mapping</div>
      </div>
    </div>
  )
}

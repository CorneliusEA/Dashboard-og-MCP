'use client'

export type XocoTab = 'overview' | 'biodiversity' | 'soil' | 'inventory' | 'layers' | 'management' | 'eudr'

interface Props {
  activeTab: XocoTab
  onTabChange: (tab: XocoTab) => void
}

const ITEMS: { tab: XocoTab; label: string; section?: string; color: string; badge?: string; badgeClass?: string }[] = [
  { tab: 'overview',     label: 'Overview',          section: 'Pilot',         color: 'var(--green)',   badge: 'Live',  badgeClass: 'g' },
  { tab: 'biodiversity', label: 'Biodiversity',       section: 'XNatura',       color: '#22D3EE',        badge: 'OK',    badgeClass: 'g' },
  { tab: 'soil',         label: 'Soil sensors',       section: 'SoilSense',     color: '#FFB402',        badge: '1⚠',   badgeClass: 'a' },
  { tab: 'inventory',    label: 'Inventory & carbon', section: 'Forsler',       color: '#A78BFA',        badge: 'OK',    badgeClass: 'g' },
  { tab: 'layers',       label: 'Site layers',        color: '#A78BFA',        badge: '3',    badgeClass: 'g' },
  { tab: 'management',   label: 'Management',         color: '#A78BFA',        badge: '2⚠',  badgeClass: 'a' },
  { tab: 'eudr',         label: 'EUDR',               section: 'Compliance',   color: '#60A5FA',        badge: 'Ready', badgeClass: 'g' },
]

export function XocoSidebar({ activeTab, onTabChange }: Props) {
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
        <div className="xoco-sb-meta-v">Xoco Gourmet ApS</div>
        <div className="xoco-sb-meta-k">Pilot site</div>
        <div className="xoco-sb-meta-v">El Lago · Nicaragua · 95.4 ha</div>
        <div className="xoco-sb-meta-k">Data feeds</div>
        <div className="xoco-sb-meta-v">XNatura · SoilSense · Forsler</div>
      </div>
    </div>
  )
}

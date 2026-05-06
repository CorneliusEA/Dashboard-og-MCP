'use client'
import useSWR from 'swr'
import { Bar, PolarArea } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  RadialLinearScale, ArcElement, Tooltip, Legend,
} from 'chart.js'
import type { BiodiversityMetrics } from '@/lib/types'
import { Metric } from '@/components/ui/Metric'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

ChartJS.register(CategoryScale, LinearScale, BarElement, RadialLinearScale, ArcElement, Tooltip, Legend)

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function Biodiversity() {
  const { data, isLoading } = useSWR<BiodiversityMetrics>('/api/biodiversity', fetcher, {
    refreshInterval: 60_000,
  })

  if (isLoading || !data) {
    return <div style={{ padding: 40, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>Loading...</div>
  }

  const barData = {
    labels: ['Cacao + Forest', 'Cacao Only', 'Forest Only', 'Migratory (cacao)'],
    datasets: [{
      label: 'Bird species',
      data: [data.inCacaoAndForest, data.cacaoOnly, data.forestOnly, data.migratoryInCacao],
      backgroundColor: ['rgba(46,204,113,.6)', 'rgba(167,139,250,.6)', 'rgba(96,165,250,.6)', 'rgba(217,119,6,.6)'],
      borderColor: ['#2ECC71', '#A78BFA', '#60A5FA', '#D97706'],
      borderWidth: 1,
      borderRadius: 4,
    }],
  }

  const polarData = {
    labels: ['In both habitats', 'Cacao exclusive', 'Forest exclusive', 'Migratory (cacao)'],
    datasets: [{
      data: [data.inCacaoAndForest, data.cacaoOnly, data.forestOnly, data.migratoryInCacao],
      backgroundColor: ['rgba(46,204,113,.35)', 'rgba(167,139,250,.35)', 'rgba(96,165,250,.35)', 'rgba(217,119,6,.35)'],
      borderColor: ['#2ECC71', '#A78BFA', '#60A5FA', '#D97706'],
      borderWidth: 1,
    }],
  }

  const chartBase = { responsive: true, maintainAspectRatio: false }

  return (
    <div>
      <div className="section-label">BIODIVERSITY MODULE</div>
      <div className="section-title">COCABO as a Biodiversity Reserve</div>
      <div className="section-sub">234 bird species recorded across cacao + forest habitats · UNESCO La Amistad buffer zone · Bocas del Toro</div>

      <div className="grid-4">
        <Metric color="g" label="Total Bird Species" value={String(data.totalBirdSpecies)} sub="Recorded across all habitats" delta="↑ Exceptionally high diversity" deltaDir="up" />
        <Metric color="b" label="In Cacao + Forest" value={String(data.inCacaoAndForest)} sub="Species using both habitats" delta="↑ Cross-habitat utility" deltaDir="up" />
        <Metric color="p" label="Cacao-Only Species" value={String(data.cacaoOnly)} sub="Exclusive to cacao agroforestry" delta="↑ Cacao as primary habitat" deltaDir="up" />
        <Metric color="a" label="Migratory (Cacao Only)" value={String(data.migratoryInCacao)} sub="North American migratory birds" delta="↑ International conservation value" deltaDir="up" />
      </div>

      <div className="grid-53">
        <div>
          <Card title="Bird Species Distribution" sub="Cacao agroforestry as independent biodiversity habitat">
            <div className="chart-wrap-lg">
              <Bar
                data={barData}
                options={{
                  ...chartBase,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6B7A85', font: { size: 9 } } },
                    y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6B7A85', font: { size: 9 } }, max: 120 },
                  },
                }}
              />
            </div>
          </Card>

          <Card title="UNESCO La Amistad Context">
            {[
              { icon: '🌍', label: 'UNESCO World Heritage Site', value: 'BUFFER ZONE', color: 'g' },
              { icon: '🌿', label: 'Largest nature reserve C.A.', value: 'La Amistad', color: '' },
              { icon: '🔬', label: 'Carbon stock study', value: 'Somarriba 2013', color: '' },
              { icon: '👥', label: 'Indigenous farmers', value: '95% Ngöbe+Naso', color: '' },
            ].map((item, i) => (
              <div key={i} className="mini-stat">
                <div className="ms-icon">{item.icon}</div>
                <div className="ms-label">{item.label}</div>
                <div className={`ms-val${item.color ? ' ' + item.color : ''}`}>{item.value}</div>
              </div>
            ))}
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(255,255,255,.03)', borderRadius: 7 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'white', marginBottom: 4 }}>Key Finding</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                Canopy cover is the <strong style={{ color: 'white' }}>primary driver</strong> of bird diversity. COCABO's certified organic shade-grown agroforestry management directly produces this outcome — making biodiversity a verifiable, manageable asset.
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card title="EBAN — European Biodiversity Accounting Norm">
            <div style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.2)', borderRadius: 7, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#A78BFA', marginBottom: 6 }}>🦋 Emerging Market Opportunity</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                An EarthSurveillance acoustic monitoring layer would quantify COCABO's biodiversity as a <strong style={{ color: 'white' }}>tradeable biodiversity unit</strong> under EBAN — the emerging European standard.
              </div>
            </div>
            {[
              { label: 'Acoustic monitoring layer', sub: 'Phase 3 deliverable', pill: <Pill variant="p">PLANNED</Pill> },
              { label: 'Canopy cover % measurement', sub: 'Sentinel-2 LAI · continuous', pill: <Pill variant="g">PHASE 1</Pill> },
              { label: 'Biodiversity unit issuance', sub: 'Post-pilot · EBAN compliant', pill: <Pill variant="a">FUTURE</Pill> },
              { label: 'CSRD biodiversity disclosure', sub: 'EU taxonomy alignment', pill: <Pill variant="b">PHASE 3</Pill> },
            ].map((row, i) => (
              <div key={i} className="val-row">
                <div className="val-label">{row.label}<small>{row.sub}</small></div>
                {row.pill}
              </div>
            ))}
          </Card>

          <Card title="Habitat Value Summary">
            <div className="chart-wrap">
              <PolarArea
                data={polarData}
                options={{
                  ...chartBase,
                  plugins: { legend: { position: 'right', labels: { font: { size: 9 }, boxWidth: 10, color: '#9CA3AF' } } },
                  scales: { r: { ticks: { display: false }, grid: { color: 'rgba(255,255,255,.06)' } } },
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
              {data.forestOnly} species found <em>only</em> in forest · {data.cacaoOnly} <em>only</em> in cacao
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

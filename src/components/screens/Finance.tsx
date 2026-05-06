'use client'
import useSWR from 'swr'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js'
import type { FinanceMetrics } from '@/lib/types'
import { Metric } from '@/components/ui/Metric'
import { Card } from '@/components/ui/Card'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmtM(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  return '$' + (n / 1_000).toFixed(0) + 'k'
}

export function Finance() {
  const { data, isLoading } = useSWR<FinanceMetrics>('/api/finance', fetcher, {
    refreshInterval: 60_000,
  })

  if (isLoading || !data) {
    return <div style={{ padding: 40, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>Loading...</div>
  }

  const barData = {
    labels: ['Today', 'Phase 1\n(EUDR+E-Ledger)', 'Phase 2\n(Carbon Credits)', 'Phase 3\n(Full stack)'],
    datasets: [
      { label: 'Cacao revenue', data: [data.annualRevenueUSD, data.annualRevenueUSD, data.annualRevenueUSD, data.annualRevenueUSD], backgroundColor: 'rgba(46,204,113,.55)', borderColor: '#2ECC71', borderWidth: 1, borderRadius: 3 },
      { label: 'Carbon credits', data: [0, 0, data.carbonLow, (data.carbonLow + data.carbonHigh) / 2], backgroundColor: 'rgba(96,165,250,.45)', borderColor: '#60A5FA', borderWidth: 1, borderRadius: 3 },
      { label: 'CBAM / premium', data: [0, 0, 0, data.cbamPotentialLow], backgroundColor: 'rgba(167,139,250,.4)', borderColor: '#A78BFA', borderWidth: 1, borderRadius: 3 },
    ],
  }

  return (
    <div>
      <div className="section-label">FINANCE + DFI MODULE</div>
      <div className="section-title">Green Capital Mobilisation</div>
      <div className="section-sub">NDF · IFU · Nordic pension funds · Verra VCS pathway · CBAM 2028 readiness</div>

      <div className="grid-4">
        <Metric color="g" label="Carbon Credit Potential" value="$1M+" sub="/yr · Verra VCS · post-pilot" delta="↑ 21,000–42,000 tCO₂e/yr" deltaDir="up" />
        <Metric color="b" label="DFI Relationships" value={String(data.dfiRelationships)} sub="Nordic DFIs · NDF/IFU pending" delta="↑ IAF + IDB Invest prior" deltaDir="up" />
        <Metric color="a" label="CBAM Readiness" value={String(data.cbamReadinessYear)} sub="EU Carbon Border Adj. Mechanism" delta="↑ 3 years to mandatory" deltaDir="up" />
        <Metric color="g" label="Pilot Cost vs. Revenue" value="0.4%" sub={`EUR ${(data.pilotCostEUR/1000).toFixed(0)}k / $${(data.annualRevenueUSD/1000).toFixed(0)}k annual revenue`} delta="↑ Minimal cost, massive unlock" deltaDir="up" />
      </div>

      <div className="grid-53">
        <div>
          <Card title="Full Natural Capital Value Stack" sub="All revenue streams — current vs. unlocked">
            <div className="chart-wrap-lg" style={{ height: 200 }}>
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top', labels: { font: { size: 9 }, boxWidth: 10, color: '#9CA3AF' } } },
                  scales: {
                    x: { stacked: true, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6B7A85', font: { size: 9 } } },
                    y: { stacked: true, grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6B7A85', font: { size: 9 }, callback: (v) => '$' + (Number(v) / 1000).toFixed(0) + 'k' } },
                  },
                }}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              {[
                { label: 'Current cacao revenue', sub: '$120k/month · certified organic', value: fmtM(data.annualRevenueUSD) + '/yr', color: 'g' },
                { label: 'Carbon credits (Verra VCS)', sub: `${(21000).toLocaleString()}–${(42000).toLocaleString()} tCO₂e/yr · $15–25/t`, value: `${fmtM(data.carbonLow)}–${fmtM(data.carbonHigh)}/yr`, color: 'b' },
                { label: 'CBAM premium (EU ETS proxy)', sub: '$60/t · 2028+ mandatory', value: `${fmtM(data.cbamPotentialLow)}–${fmtM(data.cbamPotentialHigh)}/yr`, color: 'p' },
                { label: 'Biodiversity units (EBAN)', sub: 'Acoustic monitoring · post-pilot', value: 'TBD · Phase 3', color: 'a' },
                { label: 'E-Ledger premium per kg', sub: 'Net sink certification · buyer value', value: '€9k–€36k/yr', color: 'g' },
              ].map((row, i) => (
                <div key={i} className="val-row">
                  <div className="val-label">{row.label}<small>{row.sub}</small></div>
                  <div className={`val-num ${row.color}`}>{row.value}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Nordic DFI Target Network">
            {[
              { icon: '🇳🇴', label: 'NDF · Nordic Development Fund', value: 'To Connect', color: 'a' },
              { icon: '🇩🇰', label: 'IFU · Investment Fund for Developing', value: 'To Connect', color: 'a' },
              { icon: '🏦', label: 'Nordic pension funds', value: 'To Connect', color: 'a' },
              { icon: '✅', label: 'IAF · Inter-American Foundation', value: 'Prior relationship', color: 'g' },
              { icon: '✅', label: 'IDB Invest', value: 'Prior relationship', color: 'g' },
            ].map((item, i) => (
              <div key={i} className="mini-stat">
                <div className="ms-icon">{item.icon}</div>
                <div className="ms-label">{item.label}</div>
                <div className={`ms-val ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </Card>

          <Card title="Pilot Investment vs. Unlock">
            <div className="inv-row" style={{ background: 'rgba(46,204,113,.04)', borderRadius: '6px 6px 0 0' }}>
              <div className="inv-phase">Phase 1</div>
              <div className="inv-detail">Pre-Discovery · EUDR baseline · no obligation</div>
              <div className="inv-cost" style={{ color: 'var(--green)' }}>FREE</div>
            </div>
            <div className="inv-row">
              <div className="inv-phase">Phase 2–3</div>
              <div className="inv-detail">Carbon + Verra + Board package · 50% pilot discount</div>
              <div className="inv-cost" style={{ color: '#60A5FA' }}>€{data.pilotCostEUR.toLocaleString()}/yr</div>
            </div>
            <div className="inv-row" style={{ background: 'rgba(46,204,113,.02)' }}>
              <div className="inv-phase">Unlocks</div>
              <div className="inv-detail">Carbon credits + EUDR + DFI + E-Ledger</div>
              <div className="inv-cost" style={{ color: 'var(--green)' }}>$1M+/yr</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,.02)' }}>
              <div style={{ fontSize: 9.5, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
                For a cooperative earning $120k/month, the pilot investment is 0.4% of annual revenue
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

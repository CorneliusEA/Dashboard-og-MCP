'use client'
import useSWR from 'swr'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js'
import type { CarbonMetrics } from '@/lib/types'
import { Metric } from '@/components/ui/Metric'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function fmt(n: number) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000) return '$' + (n / 1_000).toFixed(0) + 'k'
  return '$' + n
}

export function Carbon() {
  const { data, isLoading } = useSWR<CarbonMetrics>('/api/carbon', fetcher, {
    refreshInterval: 60_000,
  })

  if (isLoading || !data) {
    return <div style={{ padding: 40, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>Loading...</div>
  }

  const barData = {
    labels: data.scenarios.map((s) => s.label),
    datasets: [
      {
        label: `Low seq. (${(data.annualSeqLowT / 1000).toFixed(0)}k t)`,
        data: data.scenarios.map((s) => s.lowSeqRevenue),
        backgroundColor: 'rgba(46,204,113,.5)',
        borderColor: '#2ECC71',
        borderWidth: 1,
        borderRadius: 3,
      },
      {
        label: `High seq. (${(data.annualSeqHighT / 1000).toFixed(0)}k t)`,
        data: data.scenarios.map((s) => s.highSeqRevenue),
        backgroundColor: 'rgba(96,165,250,.3)',
        borderColor: '#60A5FA',
        borderWidth: 1,
        borderRadius: 3,
      },
    ],
  }

  const doughnutData = {
    labels: ['Current cacao ($1.44M)', 'Carbon low ($315k)', 'Carbon high gap ($735k)', 'CBAM potential ($1.26M)'],
    datasets: [{
      data: [1_440_000, 315_000, 735_000, 1_260_000],
      backgroundColor: ['rgba(46,204,113,.7)', 'rgba(96,165,250,.5)', 'rgba(167,139,250,.4)', 'rgba(217,119,6,.4)'],
      borderColor: ['#2ECC71', '#60A5FA', '#A78BFA', '#D97706'],
      borderWidth: 1,
    }],
  }

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { font: { size: 9 }, boxWidth: 10, color: '#9CA3AF' } },
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6B7A85', font: { size: 9 } } },
      y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#6B7A85', font: { size: 9 }, callback: (v: number | string) => '$' + (Number(v) / 1000).toFixed(0) + 'k' } },
    },
  }

  return (
    <div>
      <div className="section-label">CARBON RESERVE</div>
      <div className="section-title">Carbon Stock + Sequestration Model</div>
      <div className="section-sub">Somarriba 2013 · 117 tC/ha organic cacao agroforestry · 4,394 ha · UNESCO La Amistad buffer zone</div>

      <div className="grid-4">
        <Metric color="g" label="Carbon Reserve" value="1.88M" sub="tCO₂e stored · 117 tC/ha avg" delta="↑ Largest non-monetised asset" deltaDir="up" />
        <Metric color="b" label="Annual Sequestration" value={`${(data.annualSeqLowT/1000).toFixed(0)}k–${(data.annualSeqHighT/1000).toFixed(0)}k`} sub="tCO₂e/yr · conservative–high" delta="↑ Verified by satellite LAI" deltaDir="up" />
        <Metric color="g" label="Tradeable Potential (low)" value={fmt(data.tradeablePotentialLow)} sub="/yr · $15/t VCM floor" delta="↑ Verra VCS eligible post-pilot" deltaDir="up" />
        <Metric color="p" label="Tradeable Potential (high)" value={fmt(data.tradeablePotentialHigh)} sub="/yr · $25/t premium VCM" delta="↑ Nature-based premium" deltaDir="up" />
      </div>

      <div className="grid-65">
        <div>
          <Card title="Carbon Value — Three Market Scenarios">
            <div className="chart-wrap-lg">
              <Bar data={barData} options={chartOpts} />
            </div>
          </Card>

          <Card title="Carbon Stock by Price Scenario (Full Reserve)">
            {[
              { label: 'VCM voluntary · $15/t', sub: 'Current floor for nature-based credits', value: fmt(data.reserveTCO2e * 15), color: 'g' },
              { label: 'CSRD offset market · €15/t', sub: 'EU corporate sustainability reporting', value: fmt(data.reserveTCO2e * 15), color: 'b' },
              { label: 'EU ETS proxy · $60/t', sub: 'CBAM 2028+ benchmark', value: fmt(data.reserveTCO2e * 60), color: 'p' },
              { label: 'Annualised sequestration (low)', sub: `${(data.annualSeqLowT/1000).toFixed(0)},000 tCO₂e/yr · $15/t`, value: fmt(data.annualSeqLowT * 15), color: 'g' },
              { label: 'Annualised sequestration (high)', sub: `${(data.annualSeqHighT/1000).toFixed(0)},000 tCO₂e/yr · $25/t`, value: fmt(data.annualSeqHighT * 25), color: 'g' },
            ].map((row, i) => (
              <div key={i} className="val-row">
                <div className="val-label">{row.label}<small>{row.sub}</small></div>
                <div className={`val-num ${row.color}`}>{row.value}</div>
              </div>
            ))}
          </Card>
        </div>

        <div>
          <Card title="Carbon Credit Pathway">
            {[
              { step: '1', label: 'EUDR Compliance', sub: 'Prerequisite for Verra VCS eligibility', pill: <Pill variant="a">PHASE 1</Pill> },
              { step: '2', label: 'Biomass Carbon Model', sub: 'Somarriba 2013 · field validation', pill: <Pill variant="a">PHASE 2</Pill> },
              { step: '3', label: 'Verra VCS PDD', sub: 'Project Design Document submitted', pill: <Pill variant="c">PHASE 3</Pill> },
              { step: '4', label: 'Third-Party Verification', sub: 'VVB audit · credit issuance', pill: <Pill variant="c">PHASE 3</Pill> },
              { step: '5', label: 'Carbon Credits Issued', sub: '21,000–42,000 tCO₂e/yr tradeable', pill: <Pill variant="c">POST-PILOT</Pill> },
            ].map((item) => (
              <div key={item.step} className="val-row">
                <div className="val-label">
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)', marginRight: 8 }}>{item.step}.</span>
                  {item.label}
                  <small>{item.sub}</small>
                </div>
                {item.pill}
              </div>
            ))}
          </Card>

          <Card title="COCABO Carbon vs. Annual Revenue">
            <div className="chart-wrap">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right', labels: { font: { size: 9 }, boxWidth: 10, color: '#9CA3AF' } },
                    tooltip: { callbacks: { label: (ctx) => ' $' + (Number(ctx.raw) / 1000).toFixed(0) + 'k/yr' } },
                  },
                }}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

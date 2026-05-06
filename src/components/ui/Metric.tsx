type Color = 'g' | 'a' | 'r' | 'b' | 'p' | 'c'

interface MetricProps {
  label: string
  value: string
  sub?: string
  delta?: string
  deltaDir?: 'up' | 'dn'
  color?: Color
}

export function Metric({ label, value, sub, delta, deltaDir = 'up', color }: MetricProps) {
  return (
    <div className={`metric${color ? ' ' + color : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
      {delta && <div className={`metric-delta ${deltaDir}`}>{delta}</div>}
    </div>
  )
}

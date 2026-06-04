interface CardProps {
  title: string
  sub?: string
  children: React.ReactNode
  right?: React.ReactNode
  style?: React.CSSProperties
}

export function Card({ title, sub, children, right, style }: CardProps) {
  return (
    <div className="card" style={style}>
      <div className="card-head">
        <span className="card-title">{title}</span>
        {sub && <span className="card-sub">{sub}</span>}
        {right}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

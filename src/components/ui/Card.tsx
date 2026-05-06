interface CardProps {
  title: string
  sub?: string
  children: React.ReactNode
  right?: React.ReactNode
}

export function Card({ title, sub, children, right }: CardProps) {
  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">{title}</span>
        {sub && <span className="card-sub">{sub}</span>}
        {right}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

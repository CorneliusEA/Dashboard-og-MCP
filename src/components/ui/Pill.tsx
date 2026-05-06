type PillVariant = 'g' | 'a' | 'r' | 'b' | 'p' | 't' | 'c'

interface PillProps {
  variant: PillVariant
  children: React.ReactNode
}

export function Pill({ variant, children }: PillProps) {
  return <span className={`pill pill-${variant}`}>{children}</span>
}

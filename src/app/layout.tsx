import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EarthSurveillance — COCABO Pilot Monitor',
  description: 'COCABO Natural Capital Monitor · 1,438 farmers · 4,394 ha · Bocas del Toro, Panama',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Earth Surveillance — Natural Capital Intelligence',
  description: 'Natural capital monitoring across carbon, biodiversity, EUDR compliance and traceability.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

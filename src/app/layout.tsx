import type { Metadata } from 'next'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'Earth Surveillance — Natural Capital Intelligence',
  description: 'Natural capital monitoring across carbon, biodiversity, EUDR compliance and traceability.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

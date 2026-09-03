import { NextResponse } from 'next/server'
import { fetchLandCoverImage, BBOXES } from '@/lib/sentinel'

export const revalidate = 3600

export async function GET() {
  try {
    const png = await fetchLandCoverImage(BBOXES.xoco)
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('Land-cover image error:', err)
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}

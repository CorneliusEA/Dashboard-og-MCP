import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    const access = (token?.access as string[]) ?? []

    const hasAll = access.includes('*')

    if (pathname.startsWith('/admin') && !hasAll) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    if (pathname.startsWith('/cocabo') && !hasAll && !access.includes('cocabo')) {
      return NextResponse.redirect(new URL('/login?error=access', req.url))
    }
    if (pathname.startsWith('/xoco') && !hasAll && !access.includes('xoco')) {
      return NextResponse.redirect(new URL('/login?error=access', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: '/login' },
  }
)

// Protect dashboard routes — portal (/) is public
export const config = {
  matcher: ['/admin/:path*', '/cocabo/:path*', '/xoco/:path*'],
}

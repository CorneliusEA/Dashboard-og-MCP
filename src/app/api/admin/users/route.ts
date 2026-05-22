import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllUsers, createUser } from '@/lib/userStore'

function isAdmin(session: { user?: { access?: string[] } } | null) {
  return session?.user && (session.user as { access: string[] }).access?.includes('*')
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const users = await getAllUsers()
  return NextResponse.json(users.map(u => ({ ...u, passwordHash: undefined })))
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  if (!body.email || !body.password || !body.name) {
    return NextResponse.json({ error: 'email, name and password required' }, { status: 400 })
  }
  const user = await createUser({ email: body.email, name: body.name, password: body.password, access: body.access ?? [] })
  return NextResponse.json({ ...user, passwordHash: undefined })
}

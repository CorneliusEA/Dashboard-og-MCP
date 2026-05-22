import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateUser, deleteUser } from '@/lib/userStore'

function isAdmin(session: { user?: { access?: string[] } } | null) {
  return session?.user && (session.user as { access: string[] }).access?.includes('*')
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  await updateUser(params.id, body)
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  await deleteUser(params.id)
  return NextResponse.json({ ok: true })
}

import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export interface StoredUser {
  id: string
  email: string
  name: string
  passwordHash: string
  access: string[]   // ['cocabo'], ['xoco'], ['*'] for all
  createdAt: string
  updatedAt: string
}

const COL = 'users'

export async function getAllUsers(): Promise<StoredUser[]> {
  const snap = await db.collection(COL).orderBy('createdAt').get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as StoredUser))
}

export async function getUserByEmail(email: string): Promise<StoredUser | null> {
  const snap = await db.collection(COL).where('email', '==', email.toLowerCase()).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { id: doc.id, ...doc.data() } as StoredUser
}

export async function getUserById(id: string): Promise<StoredUser | null> {
  const doc = await db.collection(COL).doc(id).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as StoredUser
}

export async function createUser(data: {
  email: string
  name: string
  password: string
  access: string[]
}): Promise<StoredUser> {
  const now = new Date().toISOString()
  const passwordHash = await bcrypt.hash(data.password, 10)
  const ref = await db.collection(COL).add({
    email: data.email.toLowerCase(),
    name: data.name,
    passwordHash,
    access: data.access,
    createdAt: now,
    updatedAt: now,
  })
  const doc = await ref.get()
  return { id: doc.id, ...doc.data() } as StoredUser
}

export async function updateUser(id: string, data: {
  email?: string
  name?: string
  password?: string
  access?: string[]
}): Promise<void> {
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (data.email) update.email = data.email.toLowerCase()
  if (data.name) update.name = data.name
  if (data.access) update.access = data.access
  if (data.password) update.passwordHash = await bcrypt.hash(data.password, 10)
  await db.collection(COL).doc(id).update(update)
}

export async function deleteUser(id: string): Promise<void> {
  await db.collection(COL).doc(id).delete()
}

// Seeds initial users from the static list if Firestore is empty
export async function seedIfEmpty(): Promise<void> {
  const snap = await db.collection(COL).limit(1).get()
  if (!snap.empty) return

  const { USERS } = await import('@/lib/users')
  const now = new Date().toISOString()
  const batch = db.batch()
  for (const u of USERS) {
    const ref = db.collection(COL).doc(u.id)
    batch.set(ref, {
      email: u.email.toLowerCase(),
      name: u.name,
      passwordHash: u.passwordHash,
      access: u.access,
      createdAt: now,
      updatedAt: now,
    })
  }
  await batch.commit()
}

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getUserByEmail, seedIfEmpty } from '@/lib/userStore'
import { USERS } from '@/lib/users'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Try Firestore first; fall back to static list if unavailable
        let user: { id: string; email: string; name: string; passwordHash: string; access: string[] } | null = null
        try {
          await seedIfEmpty()
          user = await getUserByEmail(credentials.email)
        } catch (err) {
          console.warn('Firestore unavailable, falling back to static users:', err)
          const staticUser = USERS.find(u => u.email.toLowerCase() === credentials.email.toLowerCase())
          user = staticUser ?? null
        }

        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, access: user.access }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.access = (user as any).access
        token.userId = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { access: string[] }).access = token.access as string[]
        ;(session.user as { id: string }).id = token.userId as string
      }
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}

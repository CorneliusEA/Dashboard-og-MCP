'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const from = searchParams.get('from') ?? '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.ok) {
      router.push(from)
    } else {
      setError('Wrong email or password')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--dark)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--sans)',
    }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 500, color: 'var(--green)', letterSpacing: '.14em', marginBottom: 6 }}>
            EARTH SURVEILLANCE
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>
            NATURAL CAPITAL INTELLIGENCE
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--dark2)', border: '1px solid var(--bd)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ borderTop: '2px solid var(--green)', background: 'var(--dark3)', padding: '16px 24px', borderBottom: '1px solid var(--bd2)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>Sign in</div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>Access your dashboard</div>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 9.5, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={{
                  width: '100%', background: 'var(--dark)', border: '1px solid var(--bd)',
                  borderRadius: 6, padding: '9px 12px', fontSize: 13, color: 'white',
                  fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(46,204,113,.4)')}
                onBlur={e => (e.target.style.borderColor = 'var(--bd)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 9.5, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', background: 'var(--dark)', border: '1px solid var(--bd)',
                  borderRadius: 6, padding: '9px 12px', fontSize: 13, color: 'white',
                  fontFamily: 'var(--sans)', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(46,204,113,.4)')}
                onBlur={e => (e.target.style.borderColor = 'var(--bd)')}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#F87171' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? 'rgba(46,204,113,.3)' : 'var(--green)', color: '#000',
                border: 'none', borderRadius: 6, padding: '10px', fontSize: 13,
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--sans)', transition: 'all .15s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          Contact admin@earthsurveillance.com for access
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  email: string
  name: string
  access: string[]
  createdAt: string
  updatedAt: string
}

const DASHBOARDS = [
  { id: 'cocabo', label: 'COCABO', color: '#2ECC71', flag: '🇵🇦' },
  { id: 'xoco',   label: 'XOCO Gourmet', color: '#9DFF51', flag: '🇳🇮' },
]

const ALL = '*'

function AccessBadge({ access }: { access: string[] }) {
  if (access.includes(ALL)) return (
    <span style={{ fontFamily: 'var(--mono)', fontSize: 8.5, padding: '2px 7px', borderRadius: 3, background: 'rgba(46,204,113,.12)', color: '#2ECC71', border: '1px solid rgba(46,204,113,.3)' }}>ALL</span>
  )
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {DASHBOARDS.filter(d => access.includes(d.id)).map(d => (
        <span key={d.id} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, padding: '2px 7px', borderRadius: 3, background: 'rgba(255,255,255,.06)', color: d.color, border: `1px solid ${d.color}40` }}>
          {d.flag} {d.label}
        </span>
      ))}
      {access.length === 0 && <span style={{ fontSize: 10, color: 'var(--muted)' }}>No access</span>}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--dark2)', border: '1px solid var(--bd)', borderRadius: 12, width: '100%', maxWidth: 440, overflow: 'hidden' }}>
        <div style={{ background: 'var(--dark3)', padding: '14px 20px', borderBottom: '1px solid var(--bd2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 9.5, fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--dark)', border: '1px solid var(--bd)', borderRadius: 6,
  padding: '9px 12px', fontSize: 13, color: 'white', fontFamily: 'var(--sans)',
  outline: 'none', boxSizing: 'border-box',
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<User | null>(null)
  const [form, setForm] = useState({ email: '', name: '', password: '', access: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const userAccess = (session?.user as { access?: string[] })?.access ?? []
  const isAdmin = userAccess.includes('*')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?from=/admin')
    if (status === 'authenticated' && !isAdmin) router.push('/')
  }, [status, isAdmin, router])

  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/admin/users').then(r => r.json()).then(setUsers).finally(() => setLoading(false))
  }, [isAdmin])

  function openAdd() {
    setForm({ email: '', name: '', password: '', access: [] })
    setError('')
    setModal('add')
  }

  function openEdit(u: User) {
    setSelected(u)
    setForm({ email: u.email, name: u.name, password: '', access: [...u.access] })
    setError('')
    setModal('edit')
  }

  function openDelete(u: User) {
    setSelected(u)
    setModal('delete')
  }

  function toggleAccess(id: string) {
    setForm(f => ({
      ...f,
      access: id === ALL
        ? (f.access.includes(ALL) ? [] : [ALL])
        : f.access.includes(id)
          ? f.access.filter(a => a !== id)
          : [...f.access.filter(a => a !== ALL), id],
    }))
  }

  async function handleAdd() {
    setSaving(true); setError('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { setError('Could not create user'); return }
    const u = await res.json()
    setUsers(prev => [...prev, u])
    setModal(null)
  }

  async function handleEdit() {
    if (!selected) return
    setSaving(true); setError('')
    const body: Record<string, unknown> = { email: form.email, name: form.name, access: form.access }
    if (form.password) body.password = form.password
    const res = await fetch(`/api/admin/users/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) { setError('Could not update user'); return }
    setUsers(prev => prev.map(u => u.id === selected.id ? { ...u, ...body, access: form.access } : u))
    setModal(null)
  }

  async function handleDelete() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/admin/users/${selected.id}`, { method: 'DELETE' })
    setSaving(false)
    setUsers(prev => prev.filter(u => u.id !== selected.id))
    setModal(null)
  }

  if (status === 'loading' || loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>
      Loading...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', fontFamily: 'var(--sans)' }}>

      {/* Topbar */}
      <div className="topbar">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span className="logo" style={{ cursor: 'pointer' }}>EARTH SURVEILLANCE</span>
        </Link>
        <span className="logo-sep">/</span>
        <span className="logo-context" style={{ color: '#60A5FA' }}>Admin · User Management</span>
        <div style={{ flex: 1 }} />
        <div className="topbar-right">
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{session?.user?.email}</span>
          <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--bd)', borderRadius: 4, color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 9.5, padding: '3px 10px', cursor: 'pointer', letterSpacing: '.06em' }}>
            SIGN OUT
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: '#1A8A4A', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 6 }}>Admin Panel</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'white', marginBottom: 4 }}>User Management</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{users.length} users · control who can access which dashboard</div>
          </div>
          <button
            onClick={openAdd}
            style={{ background: 'var(--green)', color: '#000', border: 'none', borderRadius: 7, padding: '10px 20px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--sans)' }}
          >
            + Add user
          </button>
        </div>

        {/* Dashboard legend */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {DASHBOARDS.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--dark2)', border: '1px solid var(--bd)', borderRadius: 7, padding: '8px 14px' }}>
              <span>{d.flag}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: d.color, letterSpacing: '.06em' }}>{d.label}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>/{d.id}</span>
            </div>
          ))}
        </div>

        {/* Users table */}
        <div style={{ background: 'var(--dark2)', border: '1px solid var(--bd)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: 'var(--dark3)', padding: '10px 18px', borderBottom: '1px solid var(--bd2)', display: 'grid', gridTemplateColumns: '2fr 2fr 3fr 1fr', gap: 10 }}>
            {['Name', 'Email', 'Dashboard access', ''].map((h, i) => (
              <div key={i} style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>

          {users.map((u, i) => (
            <div key={u.id} style={{ padding: '14px 18px', borderBottom: i < users.length - 1 ? '1px solid var(--bd2)' : 'none', display: 'grid', gridTemplateColumns: '2fr 2fr 3fr 1fr', gap: 10, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'white' }}>{u.name}</div>
                <div style={{ fontSize: 9.5, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>ID: {u.id.slice(0, 8)}</div>
              </div>
              <div style={{ fontSize: 11.5, color: '#D1D5DB' }}>{u.email}</div>
              <AccessBadge access={u.access} />
              <div style={{ display: 'flex', gap: 7, justifyContent: 'flex-end' }}>
                <button onClick={() => openEdit(u)} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid var(--bd)', borderRadius: 4, color: 'var(--muted)', fontSize: 10, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)' }}>Edit</button>
                <button onClick={() => openDelete(u)} style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 4, color: '#F87171', fontSize: 10, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)' }}>Delete</button>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>No users yet</div>
          )}
        </div>
      </div>

      {/* Add modal */}
      {modal === 'add' && (
        <Modal title="Add user" onClose={() => setModal(null)}>
          <Field label="Name"><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. COCABO Admin" /></Field>
          <Field label="Email"><input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" /></Field>
          <Field label="Password"><input style={inputStyle} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" /></Field>
          <Field label="Dashboard access">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ id: ALL, label: 'All dashboards (admin)', flag: '🌍', color: '#2ECC71' }, ...DASHBOARDS.map(d => ({ ...d }))].map(d => (
                <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', background: form.access.includes(d.id) ? 'rgba(255,255,255,.05)' : 'transparent', borderRadius: 6, border: `1px solid ${form.access.includes(d.id) ? 'rgba(255,255,255,.1)' : 'transparent'}` }}>
                  <input type="checkbox" checked={form.access.includes(d.id)} onChange={() => toggleAccess(d.id)} style={{ accentColor: d.color }} />
                  <span style={{ fontSize: 14 }}>{d.flag}</span>
                  <span style={{ fontSize: 12, color: form.access.includes(d.id) ? d.color : '#D1D5DB' }}>{d.label}</span>
                </label>
              ))}
            </div>
          </Field>
          {error && <div style={{ fontSize: 11, color: '#F87171', marginBottom: 12 }}>{error}</div>}
          <button onClick={handleAdd} disabled={saving} style={{ width: '100%', background: 'var(--green)', color: '#000', border: 'none', borderRadius: 6, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Creating...' : 'Create user'}
          </button>
        </Modal>
      )}

      {/* Edit modal */}
      {modal === 'edit' && selected && (
        <Modal title={`Edit — ${selected.name}`} onClose={() => setModal(null)}>
          <Field label="Name"><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Email"><input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="New password (leave blank to keep current)"><input style={inputStyle} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current" /></Field>
          <Field label="Dashboard access">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ id: ALL, label: 'All dashboards (admin)', flag: '🌍', color: '#2ECC71' }, ...DASHBOARDS.map(d => ({ ...d }))].map(d => (
                <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', background: form.access.includes(d.id) ? 'rgba(255,255,255,.05)' : 'transparent', borderRadius: 6, border: `1px solid ${form.access.includes(d.id) ? 'rgba(255,255,255,.1)' : 'transparent'}` }}>
                  <input type="checkbox" checked={form.access.includes(d.id)} onChange={() => toggleAccess(d.id)} style={{ accentColor: d.color }} />
                  <span style={{ fontSize: 14 }}>{d.flag}</span>
                  <span style={{ fontSize: 12, color: form.access.includes(d.id) ? d.color : '#D1D5DB' }}>{d.label}</span>
                </label>
              ))}
            </div>
          </Field>
          {error && <div style={{ fontSize: 11, color: '#F87171', marginBottom: 12 }}>{error}</div>}
          <button onClick={handleEdit} disabled={saving} style={{ width: '100%', background: '#60A5FA', color: '#000', border: 'none', borderRadius: 6, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </Modal>
      )}

      {/* Delete modal */}
      {modal === 'delete' && selected && (
        <Modal title="Delete user" onClose={() => setModal(null)}>
          <div style={{ fontSize: 13, color: '#D1D5DB', marginBottom: 20, lineHeight: 1.6 }}>
            Are you sure you want to delete <strong style={{ color: 'white' }}>{selected.name}</strong> ({selected.email})?<br />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>This cannot be undone.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid var(--bd)', borderRadius: 6, padding: '10px', fontSize: 12, color: '#D1D5DB', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleDelete} disabled={saving} style={{ flex: 1, background: 'rgba(220,38,38,.8)', border: 'none', borderRadius: 6, padding: '10px', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer' }}>
              {saving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

type Link = {
  id: number
  token: string
  amount: number
  description: string
  guestName: string | null
  guestEmail: string | null
  notes: string | null
  status: 'open' | 'paid' | 'cancelled'
  paidRef: string | null
  paidAt: string | null
  paidTotal: number | null
  createdAt: string
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }
const money = (n: number) => `TOP$ ${n.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Tongatapu', day: 'numeric', month: 'short', year: 'numeric' })

const BLANK = { amount: '', description: '', guestName: '', guestEmail: '', notes: '' }

export default function AdminPaymentsClient() {
  const [links, setLinks] = useState<Link[]>([])
  const [origin, setOrigin] = useState('')
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    let current = true
    fetch('/api/admin/payment-links')
      .then(r => r.json())
      .then(data => {
        if (!current) return
        if (Array.isArray(data)) setLinks(data)
        setOrigin(window.location.origin)
      })
    return () => { current = false }
  }, [])

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    } catch {
      window.prompt('Copy this link:', text)
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(''); setError('')
    const res = await fetch('/api/admin/payment-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    })
    const data = await res.json()
    if (res.ok) {
      setLinks(data)
      setForm(BLANK)
      setMsg('✓ Payment link created. Copy it from the list below and send it to your guest.')
    } else {
      setError(data.error ?? 'Could not create the link.')
    }
    setSaving(false)
  }

  async function setStatus(id: number, action: 'cancel' | 'reopen') {
    const res = await fetch('/api/admin/payment-links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    if (res.ok) setLinks(await res.json())
  }

  const generalUrl = `${origin}/pay`

  return (
    <>
      <div className="admin-page-header"><h1>Payment Links</h1></div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ background: 'white', borderRadius: 16, padding: 28, border: '1px solid var(--border)', marginBottom: 24 }}>
        <h3 style={{ marginBottom: 8 }}>General Payment Page</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 16 }}>
          Anyone can use this page to pay any amount and say what it&apos;s for. Payments appear under Bookings as &quot;Payment&quot;.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ background: 'var(--foam)', padding: '8px 12px', borderRadius: 8, fontSize: '0.88rem' }}>{generalUrl}</code>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => copy(generalUrl, 'general')}>
            {copied === 'general' ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>
      </div>

      <form onSubmit={create} style={{ background: 'white', borderRadius: 16, padding: 28, border: '1px solid var(--border)', marginBottom: 32 }}>
        <h3 style={{ marginBottom: 8 }}>Create a Payment Link</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 20 }}>
          For a set amount, such as a balance or a custom trip. Each link can be paid once.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div className="form-group">
            <label>Amount (TOP$) *</label>
            <input type="number" min={1} step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} placeholder="520" />
          </div>
          <div className="form-group">
            <label>What it&apos;s for * (the guest sees this)</label>
            <input value={form.description} maxLength={250} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} placeholder="Private charter balance, 14 Feb" />
          </div>
          <div className="form-group">
            <label>Guest name</label>
            <input value={form.guestName} onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))} style={inputStyle} placeholder="Optional, fills in for them" />
          </div>
          <div className="form-group">
            <label>Guest email</label>
            <input type="email" value={form.guestEmail} onChange={e => setForm(f => ({ ...f, guestEmail: e.target.value }))} style={inputStyle} placeholder="Optional, fills in for them" />
          </div>
        </div>
        <div className="form-group">
          <label>Staff notes (not shown to the guest)</label>
          <input value={form.notes} maxLength={250} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Payment Link'}</button>
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr><th>Created</th><th>For</th><th>Guest</th><th>Amount</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {links.map(l => {
              const url = `${origin}/pay/${l.token}`
              return (
                <tr key={l.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{shortDate(l.createdAt)}</td>
                  <td>
                    {l.description}
                    {l.notes && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{l.notes}</div>}
                  </td>
                  <td>{l.guestName ?? '—'}{l.guestEmail && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{l.guestEmail}</div>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{money(l.amount)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {l.status === 'paid' ? (
                      <>
                        <span className="status-badge confirmed">Paid</span>
                        <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                          <a href={`/admin/bookings?search=${l.paidRef}`} style={{ color: 'var(--ocean-deep)', fontWeight: 600 }}>{l.paidRef}</a>
                          {l.paidAt && ` · ${shortDate(l.paidAt)}`}
                        </div>
                      </>
                    ) : l.status === 'cancelled'
                      ? <span className="status-badge cancelled">Cancelled</span>
                      : <span className="status-badge pending">Waiting for payment</span>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {l.status === 'open' && (
                      <>
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => copy(url, `l${l.id}`)}>
                          {copied === `l${l.id}` ? 'Copied ✓' : 'Copy link'}
                        </button>{' '}
                        <button type="button" onClick={() => setStatus(l.id, 'cancel')}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
                          Cancel
                        </button>
                      </>
                    )}
                    {l.status === 'cancelled' && (
                      <button type="button" onClick={() => setStatus(l.id, 'reopen')}
                        style={{ background: 'none', border: 'none', color: 'var(--ocean-deep)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
                        Reopen
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {links.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No payment links yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

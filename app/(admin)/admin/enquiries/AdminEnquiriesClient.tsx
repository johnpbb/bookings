'use client'

import { useState } from 'react'
import type { Enquiry } from '@prisma/client'

const STATUSES = ['new', 'contacted', 'confirmed', 'declined']

export default function AdminEnquiriesClient({ initialEnquiries, tourNames }: { initialEnquiries: Enquiry[], tourNames: Record<string, string> }) {
  const [enquiries, setEnquiries] = useState(initialEnquiries)
  const [selected, setSelected]   = useState<Enquiry | null>(null)
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [filter, setFilter]       = useState('')

  const filtered = enquiries.filter(e => !filter || e.status === filter)

  async function updateEnquiry(id: number, updates: Partial<Enquiry>) {
    setLoading(true)
    await fetch('/api/admin/enquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
    setEnquiries(es => es.map(e => e.id === id ? { ...e, ...updates } : e))
    setLoading(false)
  }

  async function saveNotes() {
    if (!selected) return
    await updateEnquiry(selected.id, { adminNotes: notes as any })
    setSelected(prev => prev ? { ...prev, adminNotes: notes } : prev)
  }

  return (
    <>
      <div className="admin-page-header"><h1>Enquiries</h1></div>

      <div style={{ marginBottom: 20 }}>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: '8px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.88rem' }}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr><th>Guest</th><th>Tour</th><th>Dates</th><th>Group</th><th>Submitted</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{e.guestName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{e.guestEmail}</div>
                </td>
                <td>{tourNames[e.tourId] ?? e.tourId}</td>
                <td style={{ fontSize: '0.82rem' }}>{e.preferredDates ?? '—'}</td>
                <td>{e.groupSize ?? '—'}</td>
                <td style={{ fontSize: '0.82rem' }}>{new Date(e.createdAt).toLocaleDateString('en-NZ')}</td>
                <td>
                  <select value={e.status} disabled={loading}
                    onChange={ev => updateEnquiry(e.id, { status: ev.target.value as any })}
                    style={{ fontSize: '0.8rem', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6 }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>
                  <button className="btn btn-sm" style={{ background: 'var(--foam)', border: '1px solid var(--border)', color: 'var(--ocean-deep)' }}
                    onClick={() => { setSelected(e); setNotes(e.adminNotes ?? '') }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No enquiries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 20 }}>{tourNames[selected.tourId]} — {selected.guestName}</h2>
            {[
              ['Email', selected.guestEmail],
              ['Phone', selected.guestPhone ?? '—'],
              ['Group Size', selected.groupSize ?? '—'],
              ['Preferred Dates', selected.preferredDates ?? '—'],
              ['Message', selected.message ?? '—'],
              ['Whale Add-on', selected.whaleAddon ? 'Yes ✓' : 'No'],
              ['Submitted', new Date(selected.createdAt).toLocaleString('en-NZ')],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '10px 0', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)', width: 140, flexShrink: 0 }}>{k}</span>
                <span style={{ whiteSpace: 'pre-wrap' }}>{String(v)}</span>
              </div>
            ))}

            <div style={{ marginTop: 24 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Admin Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="btn btn-primary" onClick={saveNotes} disabled={loading}>Save Notes</button>
              <a href={`mailto:${selected.guestEmail}`} className="btn btn-outline">Reply via Email</a>
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

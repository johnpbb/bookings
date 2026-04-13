'use client'

import { useState } from 'react'
import type { Booking, BookingDate } from '@prisma/client'

type BookingWithDates = Booking & { bookingDates: BookingDate[] }

const VESSELS = ['mv_ika_nui', 'mv_huelo', 'hele_kosi']
const STATUSES = ['', 'pending_payment', 'confirmed', 'cancelled', 'refunded']
const REFUND_METHODS = ['egate', 'manual', 'none']

export default function AdminBookingsClient({ initialBookings, tourNames }: { initialBookings: BookingWithDates[], tourNames: Record<string, string> }) {
  const [bookings, setBookings] = useState(initialBookings)
  const [filter, setFilter]     = useState({ status: '', tour: '' })
  const [selected, setSelected] = useState<BookingWithDates | null>(null)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')

  // Cancel modal state
  const [cancelReason, setCancelReason] = useState('')
  const [refundMethod, setRefundMethod] = useState('none')
  const [showCancel, setShowCancel]     = useState(false)

  const filtered = bookings.filter(b =>
    (!filter.status || b.status === filter.status) &&
    (!filter.tour   || b.tourId === filter.tour)
  )

  async function assignVessel(bookingId: number, vessel: string) {
    setLoading(true)
    await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookingId, action: 'assign_vessel', assignedVessel: vessel || null }),
    })
    setBookings(bs => bs.map(b => b.id === bookingId ? { ...b, assignedVessel: vessel || null } : b))
    setLoading(false)
  }

  async function submitCancel() {
    if (!selected) return
    setLoading(true)
    const res = await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, action: 'cancel', cancelReason, refundMethod }),
    })
    const data = await res.json()
    if (data.success) {
      setBookings(bs => bs.map(b => b.id === selected.id ? { ...b, status: 'cancelled' } : b))
      setMsg(`Booking cancelled. Refund: TOP$ ${data.refundAmount?.toFixed(2) ?? 0}`)
      setShowCancel(false)
      setSelected(null)
    }
    setLoading(false)
  }

  function exportCsv() {
    const rows = [
      ['Ref','Guest','Email','Tour','Dates','Guests','Amount','Status','Vessel'],
      ...filtered.map(b => [
        b.reference, b.guestName, b.guestEmail,
        tourNames[b.tourId] ?? b.tourId,
        b.bookingDates.map(bd => bd.tourDate.toString().slice(0,10)).join('; '),
        b.numGuests, Number(b.amountTop).toFixed(2),
        b.status, b.assignedVessel ?? '',
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bookings.csv'; a.click()
  }

  return (
    <>
      <div className="admin-page-header">
        <h1>Bookings</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      {msg && <div className="alert alert-success" style={{ marginBottom: 20 }}>{msg}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          style={{ padding: '8px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.88rem' }}>
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.tour} onChange={e => setFilter(f => ({ ...f, tour: e.target.value }))}
          style={{ padding: '8px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.88rem' }}>
          <option value="">All tours</option>
          {Object.entries(tourNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', alignSelf: 'center' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ref</th><th>Guest</th><th>Tour</th><th>Date(s)</th>
              <th>Guests</th><th>Amount</th><th>Status</th><th>Vessel</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.82rem' }}>{b.reference}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{b.guestName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.guestEmail}</div>
                </td>
                <td>{tourNames[b.tourId] ?? b.tourId}</td>
                <td style={{ fontSize: '0.82rem' }}>{b.bookingDates.map(bd => bd.tourDate.toString().slice(0,10)).join(', ')}</td>
                <td>{b.numGuests}</td>
                <td>TOP$ {Number(b.amountTop).toFixed(0)}</td>
                <td><span className={`status-badge ${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                <td>
                  <select value={b.assignedVessel ?? ''} disabled={loading}
                    onChange={e => assignVessel(b.id, e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6 }}>
                    <option value="">Unassigned</option>
                    {VESSELS.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                  </select>
                </td>
                <td>
                  <button className="btn btn-sm" style={{ background: 'var(--foam)', color: 'var(--ocean-deep)', border: '1px solid var(--border)' }}
                    onClick={() => setSelected(b)}>
                    Details
                  </button>
                  {b.status === 'confirmed' && (
                    <button className="btn btn-sm btn-coral" style={{ marginLeft: 6 }}
                      onClick={() => { setSelected(b); setShowCancel(true) }}>
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No bookings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && !showCancel && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24,
        }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 20 }}>{selected.reference}</h2>
            {[
              ['Guest', selected.guestName],
              ['Email', selected.guestEmail],
              ['Phone', selected.guestPhone ?? '—'],
              ['Tour', tourNames[selected.tourId]],
              ['Dates', selected.bookingDates.map(bd => bd.tourDate.toString().slice(0,10)).join(', ')],
              ['Guests', selected.numGuests],
              ['Amount', `TOP$ ${Number(selected.amountTop).toFixed(2)}`],
              ['Promo', selected.promoCode ?? '—'],
              ['Discount', selected.discountTop ? `TOP$ ${Number(selected.discountTop).toFixed(2)}` : '—'],
              ['Status', selected.status],
              ['eGate Order', selected.egateOrderId ?? '—'],
              ['Special Requests', selected.specialRequests ?? '—'],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '10px 0', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)', width: 140, flexShrink: 0 }}>{k}</span>
                <span>{String(v)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              {selected.status === 'confirmed' && (
                <button className="btn btn-coral" onClick={() => setShowCancel(true)}>Cancel Booking</button>
              )}
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24,
        }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 480, width: '100%' }}>
            <h2 style={{ marginBottom: 8 }}>Cancel Booking</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.9rem' }}>
              {selected.reference} — {selected.guestName}
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Reason for Cancellation
              </label>
              <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="Enter reason..." rows={3}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Refund Method
              </label>
              <select value={refundMethod} onChange={e => setRefundMethod(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }}>
                <option value="egate">Automated (ANZ eGate API)</option>
                <option value="manual">Manual (I will process separately)</option>
                <option value="none">No Refund</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-coral" onClick={submitCancel} disabled={loading}>
                {loading ? 'Processing...' : 'Confirm Cancel'}
              </button>
              <button className="btn btn-outline" onClick={() => { setShowCancel(false); setSelected(null) }}>
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

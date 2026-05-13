'use client'

import { useState, useEffect } from 'react'
import type { Booking, BookingDate } from '@prisma/client'
import type { OnlineTour } from '@/lib/tours'

type BookingWithDates = Booking & { bookingDates: BookingDate[] }
type Surcharge = { enabled: boolean; type: 'fixed' | 'percentage'; amount: number }

function calcTourPrice(tour: OnlineTour, numGuests: number): number {
  if (tour.id === 'island_reef') {
    const ppp = numGuests >= 5 ? (tour.reefPriceLarge ?? 320) : (tour.reefPriceSmall ?? 400)
    return ppp * numGuests
  }
  return (tour.pricePerPerson ?? 0) * numGuests
}

function applyTourSurcharge(subtotal: number, surcharge: Surcharge): number {
  if (!surcharge.enabled || surcharge.amount <= 0) return subtotal
  const fee = surcharge.type === 'percentage'
    ? Math.round(subtotal * surcharge.amount / 100 * 100) / 100
    : surcharge.amount
  return subtotal + fee
}

const VESSELS = ['mv_ika_nui', 'mv_huelo', 'hele_kosi']
const STATUSES = ['', 'pending_payment', 'confirmed', 'cancelled', 'refunded']
const REFUND_METHODS = ['egate', 'manual', 'none']

// Safely extract YYYY-MM-DD from any date representation
function toInputDate(d: unknown): string {
  if (!d) return ''
  const match = String(d).match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : ''
}

export default function AdminBookingsClient({
  initialBookings,
  tourNames,
  onlineTours = [],
  surcharge = { enabled: false, type: 'percentage', amount: 0 },
  initialSearch = '',
}: {
  initialBookings: BookingWithDates[]
  tourNames: Record<string, string>
  onlineTours?: OnlineTour[]
  surcharge?: Surcharge
  initialSearch?: string
}) {
  const [bookings, setBookings] = useState(initialBookings)
  const [filter, setFilter]     = useState({ status: '', tour: '' })
  const [selected, setSelected] = useState<BookingWithDates | null>(null)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')

  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialBookings.length >= 500)
  const [loadingMore, setLoadingMore] = useState(false)

  async function loadMore() {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const res = await fetch(`/api/admin/bookings?page=${nextPage}&limit=500`)
      const data = await res.json()
      if (data.bookings && data.bookings.length > 0) {
        const newBookings = data.bookings.map((b: any) => ({
          ...b,
          amountTop: Number(b.amountTop),
          discountTop: b.discountTop ? Number(b.discountTop) : null,
          refundAmountTop: b.refundAmountTop ? Number(b.refundAmountTop) : null,
        }))
        setBookings(prev => {
          // Prevent duplicates by checking IDs
          const existingIds = new Set(prev.map(p => p.id))
          const filteredNew = newBookings.filter((nb: any) => !existingIds.has(nb.id))
          return [...prev, ...filteredNew]
        })
        setPage(nextPage)
        if (data.bookings.length < 500) {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (err) {
      alert('Failed to load more bookings')
    } finally {
      setLoadingMore(false)
    }
  }

  // Cancel modal state
  const [cancelReason, setCancelReason] = useState('')
  const [refundMethod, setRefundMethod] = useState('none')
  const [showCancel, setShowCancel]     = useState(false)

  // Edit state
  const [editDetails, setEditDetails] = useState({ guestName: '', guestEmail: '', guestPhone: '' })
  const [editDates, setEditDates]     = useState<string[]>([])
  const [adminNotes, setAdminNotes]   = useState('')
  const [editSection, setEditSection] = useState<'details' | 'dates' | null>(null)
  const [editMsg, setEditMsg]         = useState('')

  async function patchBooking(payload: Record<string, unknown>) {
    const res = await fetch('/api/admin/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      console.error('Non-JSON response:', text)
      return { error: `Server error (${res.status})` }
    }
  }

  // Search & Sort states
  const [search, setSearch] = useState(initialSearch)
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'createdAt' | 'name', direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'asc' })

  // Manual booking modal state
  const [showAddManual, setShowAddManual] = useState(false)
  const [manualForm, setManualForm] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    tourId: '',
    dates: [''],
    numGuests: 1,
    amountTop: '',
    assignedVessel: '',
    specialRequests: ''
  })
  const [amountAutoCalc, setAmountAutoCalc] = useState('')

  useEffect(() => {
    if (!manualForm.tourId) { setAmountAutoCalc(''); return }
    const tour = onlineTours.find(t => t.id === manualForm.tourId)
    if (!tour) { setAmountAutoCalc(''); return }
    const subtotal = calcTourPrice(tour, manualForm.numGuests)
    const total = applyTourSurcharge(subtotal, surcharge)
    const label = surcharge.enabled && surcharge.amount > 0
      ? `TOP$ ${subtotal.toFixed(2)} + ${surcharge.type === 'percentage' ? `${surcharge.amount}%` : `TOP$ ${surcharge.amount}`} surcharge = TOP$ ${total.toFixed(2)}`
      : `TOP$ ${total.toFixed(2)}`
    setAmountAutoCalc(label)
    setManualForm(f => ({ ...f, amountTop: total.toFixed(2) }))
  }, [manualForm.tourId, manualForm.numGuests])

  const filtered = bookings.filter(b => {
    if (filter.status && b.status !== filter.status) return false
    if (filter.tour   && b.tourId !== filter.tour)   return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.guestName.toLowerCase().includes(q) ||
      b.guestEmail.toLowerCase().includes(q) ||
      b.reference.toLowerCase().includes(q) ||
      b.bookingDates.some(bd => bd.tourDate.toString().slice(0, 10).includes(q))
    )
  })

  const getEarliestDate = (b: BookingWithDates) => {
    if (!b.bookingDates || b.bookingDates.length === 0) return 0
    return Math.min(...b.bookingDates.map(bd => new Date(bd.tourDate).getTime()))
  }

  const sortedBookings = [...filtered].sort((a, b) => {
    if (!sortConfig) return 0
    const { key, direction } = sortConfig

    let valA: any
    let valB: any

    if (key === 'date') {
      valA = getEarliestDate(a)
      valB = getEarliestDate(b)
    } else if (key === 'name') {
      valA = a.guestName.toLowerCase()
      valB = b.guestName.toLowerCase()
    } else {
      valA = new Date(a.createdAt).getTime()
      valB = new Date(b.createdAt).getTime()
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1
    if (valA > valB) return direction === 'asc' ? 1 : -1
    return 0
  })

  async function submitManualBooking() {
    setLoading(true)
    try {
      const cleanDates = manualForm.dates.filter(Boolean)
      if (cleanDates.length === 0) {
        alert('Please select at least one date.')
        setLoading(false)
        return
      }
      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          dates: cleanDates
        }),
      })
      const data = await res.json()
      if (data.success) {
        setBookings(bs => [data.booking, ...bs])
        setMsg(`Manual booking created successfully for ${manualForm.guestName}.`)
        setShowAddManual(false)
        setManualForm({
          guestName: '',
          guestEmail: '',
          guestPhone: '',
          tourId: '',
          dates: [''],
          numGuests: 1,
          amountTop: '',
          assignedVessel: '',
          specialRequests: ''
        })
      } else {
        alert(data.error || 'Failed to create manual booking.')
      }
    } catch (err) {
      alert('Network error creating manual booking.')
    } finally {
      setLoading(false)
    }
  }

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
        b.bookingDates.map(bd => toInputDate(bd.tourDate)).join('; '),
        b.numGuests, Number(b.amountTop).toFixed(2),
        b.status, b.assignedVessel ?? '',
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bookings.csv'; a.click()
  }

  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)

    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      if (lines.length <= 1) {
        alert('CSV is empty or missing data rows.')
        setLoading(false)
        return
      }

      const parseCsvLine = (line: string) => {
        const result = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result.map(r => r.replace(/^"|"$/g, ''))
      }

      const headers = parseCsvLine(lines[0])
      const guestIndex = headers.indexOf('Guest')
      const emailIndex = headers.indexOf('Email')
      const tourIndex = headers.indexOf('Tour')
      const datesIndex = headers.indexOf('Dates')
      const guestsIndex = headers.indexOf('Guests')
      const amountIndex = headers.indexOf('Amount')
      const vesselIndex = headers.indexOf('Vessel')

      const rows = lines.slice(1)
      let importedCount = 0
      let errors: string[] = []

      for (const row of rows) {
        const values = parseCsvLine(row)
        if (values.length < 3) continue

        const guestName = guestIndex !== -1 ? values[guestIndex] : ''
        const guestEmail = emailIndex !== -1 ? values[emailIndex] : ''
        const tourNameString = tourIndex !== -1 ? values[tourIndex] : ''
        const datesString = datesIndex !== -1 ? values[datesIndex] : ''
        const numGuests = guestsIndex !== -1 ? (parseInt(values[guestsIndex], 10) || 1) : 1
        const amountTop = amountIndex !== -1 ? (parseFloat(values[amountIndex]) || 0) : 0
        const assignedVessel = vesselIndex !== -1 ? values[vesselIndex] : ''

        const tourId = Object.entries(tourNames).find(([k, v]) => v === tourNameString)?.[0] || tourNameString
        const dates = datesString ? datesString.split(/[;,\n|]+/).map(d => d.trim()).filter(Boolean) : []
        const formattedDates = dates.map(d => {
          // Handle DD/MM/YYYY format
          const ddmmyyyy = d.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
          if (ddmmyyyy) {
            const [, day, month, year] = ddmmyyyy
            d = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }
          const parsed = new Date(d)
          if (isNaN(parsed.getTime())) return null
          return parsed.toISOString().slice(0, 10)
        }).filter(Boolean) as string[]

        const reasons = []
        if (!guestName) reasons.push('Guest Name')
        if (!guestEmail) reasons.push('Guest Email')
        if (!tourId) reasons.push(`Tour [Expected: ${Object.values(tourNames).join(' or ')}]`)
        if (formattedDates.length === 0) reasons.push('Dates [Expected: DD/MM/YYYY]')

        if (reasons.length > 0) {
          errors.push(`Row skipped for ${guestName || 'Unnamed'}: Missing/Invalid ${reasons.join(', ')}`)
          continue
        }

        const res = await fetch('/api/admin/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestName,
            guestEmail,
            tourId,
            dates: formattedDates,
            numGuests,
            amountTop,
            assignedVessel
          })
        })

        const data = await res.json()
        if (data.success) {
          setBookings(bs => [data.booking, ...bs])
          importedCount++
        } else {
          errors.push(`Error on row (${guestName}): ${data.error}`)
        }
      }

      let completionMsg = `Successfully imported ${importedCount} bookings.`
      if (errors.length > 0) {
        completionMsg += `\nErrors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`
      }
      alert(completionMsg)
    } catch (err) {
      alert('Failed to parse or process CSV.')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <>
      <div className="admin-page-header">
        <h1>Bookings</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            Import CSV
            <input type="file" accept=".csv" onChange={importCsv} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-outline btn-sm" onClick={exportCsv}>Export CSV</button>
          <button className="btn btn-sm" style={{ background: 'var(--ocean-deep)', color: 'white' }} onClick={() => { setShowAddManual(true); setAmountAutoCalc('') }}>
            + Create Manual Booking
          </button>
        </div>
      </div>

      {msg && <div className="alert alert-success" style={{ marginBottom: 20 }}>{msg}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Search ref, name, email, date (2026-08-15)..."
          value={search} 
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.88rem', minWidth: 220 }}
        />
        <select 
          value={sortConfig ? `${sortConfig.key}-${sortConfig.direction}` : ''} 
          onChange={e => {
            if (!e.target.value) setSortConfig(null)
            else {
              const [key, direction] = e.target.value.split('-') as [any, any]
              setSortConfig({ key, direction })
            }
          }}
          style={{ padding: '8px 14px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.88rem' }}>
          <option value="date-asc">Sort: Earliest Date (First)</option>
          <option value="date-desc">Sort: Earliest Date (Last)</option>
          <option value="name-asc">Sort: Name (A-Z)</option>
          <option value="name-desc">Sort: Name (Z-A)</option>
          <option value="createdAt-desc">Sort: Newest Booked</option>
          <option value="createdAt-asc">Sort: Oldest Booked</option>
        </select>
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
            {sortedBookings.map(b => (
              <tr key={b.id}>
                <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.82rem' }}>{b.reference}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{b.guestName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.guestEmail}</div>
                </td>
                <td>{tourNames[b.tourId] ?? b.tourId}</td>
                <td style={{ fontSize: '0.82rem' }}>
                  {b.bookingDates.length > 0
                    ? b.bookingDates.map(bd => {
                        const d = toInputDate(bd.tourDate)
                        return d ? new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
                      }).join(', ')
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>
                  }
                </td>
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
                    onClick={() => { setSelected(b); setAdminNotes((b as any).adminNotes ?? ''); setEditSection(null); setEditMsg('') }}>
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

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 24 }}>
          <button className="btn btn-outline" onClick={loadMore} disabled={loadingMore} style={{ minWidth: 200 }}>
            {loadingMore ? 'Loading...' : 'Load More Bookings'}
          </button>
        </div>
      )}

      {/* Detail modal */}
      {selected && !showCancel && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24,
        }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 600, width: '100%', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>{selected.reference}</h2>
              <span className={`status-badge ${selected.status}`}>{selected.status.replace('_', ' ')}</span>
            </div>

            {editMsg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{editMsg}</div>}

            {/* Read-only booking info */}
            {[
              ['Tour', tourNames[selected.tourId] ?? selected.tourId],
              ['Guests', String(selected.numGuests)],
              ['Amount', `TOP$ ${Number(selected.amountTop).toFixed(2)}`],
              ['Promo', selected.promoCode ?? '—'],
              ['Discount', selected.discountTop ? `TOP$ ${Number(selected.discountTop).toFixed(2)}` : '—'],
              ['eGate Order', selected.egateOrderId ?? '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '8px 0', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)', width: 130, flexShrink: 0 }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}

            {/* Special Requests */}
            {selected.specialRequests && (
              <div style={{ borderBottom: '1px solid var(--border)', padding: '8px 0', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Special Requests</span>
                <span style={{ whiteSpace: 'pre-wrap' }}>{selected.specialRequests}</span>
              </div>
            )}

            {/* ── Guest Details ── */}
            <div style={{ marginTop: 20, padding: '16px', background: 'var(--foam)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Guest Details</span>
                {editSection !== 'details' && (
                  <button className="btn btn-sm btn-outline" style={{ fontSize: '0.78rem', padding: '3px 10px' }}
                    onClick={() => {
                      setEditDetails({ guestName: selected.guestName, guestEmail: selected.guestEmail, guestPhone: selected.guestPhone ?? '' })
                      setEditSection('details')
                      setEditMsg('')
                    }}>
                    Edit
                  </button>
                )}
              </div>
              {editSection === 'details' ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div><label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Full Name</label>
                    <input value={editDetails.guestName} onChange={e => setEditDetails(d => ({ ...d, guestName: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.9rem', marginTop: 2 }} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Email</label>
                      <input value={editDetails.guestEmail} onChange={e => setEditDetails(d => ({ ...d, guestEmail: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.9rem', marginTop: 2 }} /></div>
                    <div><label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Phone</label>
                      <input value={editDetails.guestPhone} onChange={e => setEditDetails(d => ({ ...d, guestPhone: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.9rem', marginTop: 2 }} /></div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button className="btn btn-primary btn-sm" disabled={loading} onClick={async () => {
                      setLoading(true)
                      const data = await patchBooking({ id: selected.id, action: 'edit_details', ...editDetails })
                      if (data.success) {
                        setSelected(data.booking)
                        setBookings(bs => bs.map(b => b.id === selected.id ? data.booking : b))
                        setEditMsg('✓ Guest details updated.')
                      } else {
                        setEditMsg(`Error: ${data.error}`)
                      }
                      setEditSection(null); setLoading(false)
                    }}>{loading ? 'Saving...' : 'Save Details'}</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditSection(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.88rem', display: 'grid', gap: 4 }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Name: </span>{selected.guestName}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Email: </span>{selected.guestEmail}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Phone: </span>{selected.guestPhone ?? '—'}</div>
                </div>
              )}
            </div>

            {/* ── Dates ── */}
            <div style={{ marginTop: 12, padding: '16px', background: 'var(--foam)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Booking Dates</span>
                {editSection !== 'dates' && (
                  <button className="btn btn-sm btn-outline" style={{ fontSize: '0.78rem', padding: '3px 10px' }}
                    onClick={() => {
                      setEditDates(selected.bookingDates.map(bd => toInputDate(bd.tourDate)))
                      setEditSection('dates')
                      setEditMsg('')
                    }}>
                    Change Dates
                  </button>
                )}
              </div>
              {editSection === 'dates' ? (
                <div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                    Seats on the old dates will be released and reserved on the new dates automatically.
                  </p>
                  {editDates.map((d, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input type="date" value={d} onChange={e => setEditDates(ds => ds.map((x, j) => j === i ? e.target.value : x))}
                        style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.9rem' }} />
                      {editDates.length > 1 && (
                        <button className="btn btn-sm btn-coral" style={{ padding: '0 10px' }}
                          onClick={() => setEditDates(ds => ds.filter((_, j) => j !== i))}>✕</button>
                      )}
                    </div>
                  ))}
                  <button className="btn btn-outline btn-sm" style={{ marginBottom: 12 }}
                    onClick={() => setEditDates(ds => [...ds, ''])}>+ Add Date</button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" disabled={loading || editDates.some(d => !d)} onClick={async () => {
                      setLoading(true)
                      const data = await patchBooking({ id: selected.id, action: 'change_dates', newDates: editDates })
                      if (data.success) {
                        setSelected(data.booking)
                        setBookings(bs => bs.map(b => b.id === selected.id ? data.booking : b))
                        setEditMsg('✓ Dates updated.')
                      } else {
                        setEditMsg(`Error: ${data.error}`)
                      }
                      setEditSection(null); setLoading(false)
                    }}>{loading ? 'Saving...' : 'Save Dates'}</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditSection(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.88rem' }}>
                  {selected.bookingDates.map(bd => (
                    <div key={bd.id}>{new Date(bd.tourDate).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Admin Notes ── */}
            <div style={{ marginTop: 12, padding: '16px', background: 'var(--foam)', borderRadius: 10 }}>
              <label style={{ fontWeight: 600, fontSize: '0.88rem', display: 'block', marginBottom: 8 }}>Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                rows={3} placeholder="Internal notes — not visible to the guest..."
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '0.88rem', resize: 'vertical' }}
              />
              <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} disabled={loading} onClick={async () => {
                setLoading(true)
                const data = await patchBooking({ id: selected.id, action: 'update_notes', adminNotes })
                if (data.success) {
                  setSelected(data.booking)
                  setBookings(bs => bs.map(b => b.id === selected.id ? data.booking : b))
                  setEditMsg('✓ Notes saved.')
                } else {
                  setEditMsg(`Error: ${data.error}`)
                }
                setLoading(false)
              }}>{loading ? 'Saving...' : 'Save Notes'}</button>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              {selected.status === 'confirmed' && (
                <button className="btn btn-coral" onClick={() => setShowCancel(true)}>Cancel Booking</button>
              )}
              <button className="btn btn-outline" onClick={() => { setSelected(null); setEditSection(null); setEditMsg('') }}>Close</button>
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
      {/* Add Manual Booking modal */}
      {showAddManual && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24,
        }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 20 }}>Create Manual Booking</h2>
            
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Guest Name
                </label>
                <input type="text" value={manualForm.guestName} 
                  onChange={e => setManualForm(f => ({ ...f, guestName: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Guest Email
                  </label>
                  <input type="email" value={manualForm.guestEmail} 
                    onChange={e => setManualForm(f => ({ ...f, guestEmail: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Guest Phone
                  </label>
                  <input type="text" value={manualForm.guestPhone} 
                    onChange={e => setManualForm(f => ({ ...f, guestPhone: e.target.value }))}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Tour Type
                </label>
                <select value={manualForm.tourId} 
                  onChange={e => setManualForm(f => ({ ...f, tourId: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }}>
                  <option value="">Select a tour...</option>
                  {Object.entries(tourNames).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Date(s)
                </label>
                {manualForm.dates.map((d, index) => (
                  <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input type="date" value={d} 
                      onChange={e => setManualForm(f => {
                        const next = [...f.dates]
                        next[index] = e.target.value
                        return { ...f, dates: next }
                      })}
                      style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }} />
                    {manualForm.dates.length > 1 && (
                      <button type="button" className="btn btn-coral" style={{ padding: '0 12px' }}
                        onClick={() => setManualForm(f => ({ ...f, dates: f.dates.filter((_, i) => i !== index) }))}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => setManualForm(f => ({ ...f, dates: [...f.dates, ''] }))}>
                  + Add Date
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Guests
                  </label>
                  <input type="number" min={1} value={manualForm.numGuests} 
                    onChange={e => setManualForm(f => ({ ...f, numGuests: parseInt(e.target.value, 10) || 1 }))}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Amount (TOP$)
                  </label>
                  <input type="text" placeholder="e.g. 1850" value={manualForm.amountTop}
                    onChange={e => { setManualForm(f => ({ ...f, amountTop: e.target.value })); setAmountAutoCalc('') }}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }} />
                  {amountAutoCalc && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--ocean-bright)', marginTop: 4 }}>
                      Auto-calculated: {amountAutoCalc}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Vessel Assignment
                </label>
                <select value={manualForm.assignedVessel} 
                  onChange={e => setManualForm(f => ({ ...f, assignedVessel: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem' }}>
                  <option value="">Unassigned</option>
                  {VESSELS.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Special Requests
                </label>
                <textarea value={manualForm.specialRequests} 
                  onChange={e => setManualForm(f => ({ ...f, specialRequests: e.target.value }))}
                  rows={2}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-primary" onClick={submitManualBooking} disabled={loading}>
                {loading ? 'Saving...' : 'Create Booking'}
              </button>
              <button className="btn btn-outline" onClick={() => setShowAddManual(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

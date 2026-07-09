'use client'

import { useState } from 'react'

type BookingDetail = {
  id: number
  reference: string
  guestName: string
  numGuests: number
  status: string
  assignedVessel: string | null
  tourId: string
}

type BookingDateWithBooking = {
  id: number
  bookingId: number
  operatingDayId: number
  tourDate: Date | string
  seatsReserved: number
  booking: BookingDetail
}

type DayRow = {
  id: number
  operatingDate: Date | string
  totalSeats: number
  seatsHeld: number
  seatsBooked: number
  charterVessel: string | null
  isFullyBlocked: boolean
  bookingDates?: BookingDateWithBooking[]
}

const VESSEL_NAMES: Record<string, string> = {
  mv_ika_nui: 'MV Ika Nui',
  mv_huelo: 'MV Huelo',
  hele_kosi: 'Hele Kosi',
}

export default function AdminOperatingDaysClient({ 
  initialDays,
  tourNames = {},
}: { 
  initialDays: DayRow[]
  tourNames?: Record<string, string>
}) {
  const [days, setDays]       = useState(initialDays)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const [error, setError]     = useState('')
  const [selectedDay, setSelectedDay] = useState<DayRow | null>(null)

  // Bulk generate form
  const [genStart, setGenStart] = useState('2026-07-01')
  const [genEnd, setGenEnd]     = useState('2026-10-31')

  async function bulkGenerate() {
    setLoading(true); setMsg(''); setError('')
    const res = await fetch('/api/admin/operating-days', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_generate', seasonStart: genStart, seasonEnd: genEnd }),
    })
    const data = await res.json()
    if (data.created !== undefined) {
      setMsg(`✓ Created ${data.created} operating days (Mon–Sat, excluding holidays)`)
      // Refresh list
      const refreshed = await fetch(`/api/admin/operating-days?from=${genStart}&to=${genEnd}`)
      setDays(await refreshed.json())
    } else {
      setError(data.error ?? 'Error generating days.')
    }
    setLoading(false)
  }

  async function deleteDate(date: string) {
    if (!confirm(`Delete ${date} from the operating calendar? This cannot be undone.`)) return
    setLoading(true)
    await fetch('/api/admin/operating-days', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_date', date }),
    })
    setDays(ds => ds.filter(d => new Date(d.operatingDate).toISOString().slice(0, 10) !== date))
    setLoading(false)
  }

  async function setCharterBlock(date: string, vessel: string, isFullyBlocked: boolean) {
    setLoading(true)
    await fetch('/api/admin/operating-days', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_charter', date, charterVessel: vessel || null, isFullyBlocked }),
    })
    setDays(ds => ds.map(d => {
      const dStr = new Date(d.operatingDate).toISOString().slice(0, 10)
      if (dStr !== date) return d
      return {
        ...d,
        charterVessel: vessel || null,
        isFullyBlocked,
        totalSeats: isFullyBlocked ? 16 : vessel ? 8 : 16,
      }
    }))
    setLoading(false)
  }

  const activeDay = selectedDay ? days.find(d => d.id === selectedDay.id) : null

  return (
    <>
      <div className="admin-page-header">
        <h1>Season Calendar</h1>
      </div>

      {msg   && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Bulk generate */}
      <div style={{ background: 'white', borderRadius: 16, padding: 28, border: '1px solid var(--border)', marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16 }}>Bulk Generate Season Dates</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 20 }}>
          Creates Mon–Sat entries for the full season, excluding Sundays, Easter Sunday, and Christmas Day.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Season Start</label>
            <input type="date" value={genStart} onChange={e => setGenStart(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Season End</label>
            <input type="date" value={genEnd} onChange={e => setGenEnd(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8 }} />
          </div>
          <button className="btn btn-primary" onClick={bulkGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Season'}
          </button>
        </div>
      </div>

      {/* Days table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th><th>Total Seats</th><th>Held</th><th>Booked</th><th>Available</th><th>Charter</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {days.map(d => {
              const dateStr = new Date(d.operatingDate).toISOString().slice(0, 10)
              const available = d.totalSeats - d.seatsHeld - d.seatsBooked
              return (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>
                    <span
                      style={{ color: 'var(--ocean-deep)', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => setSelectedDay(d)}
                      title="Click to view bookings for this date"
                    >
                      {new Date(d.operatingDate).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Tongatapu', weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </td>
                  <td>{d.totalSeats}</td>
                  <td>{d.seatsHeld}</td>
                  <td>{d.seatsBooked}</td>
                  <td>
                    <span className={`avail-pill ${available <= 0 ? 'full' : available <= 4 ? 'partial' : 'open'}`}>
                      {available <= 0 ? 'Full' : `${available} free`}
                    </span>
                  </td>
                  <td>
                    <select
                      value={d.isFullyBlocked ? 'both' : d.charterVessel ?? ''}
                      disabled={loading}
                      onChange={e => {
                        const v = e.target.value
                        setCharterBlock(dateStr, v === 'both' ? '' : v, v === 'both')
                      }}
                      style={{ fontSize: '0.8rem', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6 }}
                    >
                      <option value="">No charter</option>
                      <option value="mv_ika_nui">MV Ika Nui chartered (8 seats remain)</option>
                      <option value="mv_huelo">MV Huelo chartered (8 seats remain)</option>
                      <option value="both">Both chartered (FULLY BLOCKED)</option>
                    </select>
                  </td>
                  <td>
                    {d.isFullyBlocked
                      ? <span className="status-badge cancelled">Blocked</span>
                      : d.charterVessel
                      ? <span className="status-badge pending">Charter</span>
                      : <span className="status-badge confirmed">Open</span>
                    }
                  </td>
                  <td>
                    <button
                      onClick={() => deleteDate(dateStr)}
                      disabled={loading}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 6px' }}
                      title="Delete this date from the calendar"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
            {days.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                No operating days yet. Use "Generate Season" above to create them.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Date Bookings Details Modal */}
      {activeDay && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24,
        }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 700, width: '100%', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>
                Bookings for {new Date(activeDay.operatingDate).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Tongatapu', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </h2>
              <button 
                onClick={() => setSelectedDay(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            {/* Summary details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24, padding: 16, background: 'var(--foam)', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Capacity</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{activeDay.totalSeats} seats</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Held</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{activeDay.seatsHeld}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Booked</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{activeDay.seatsBooked}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Available</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: (activeDay.totalSeats - activeDay.seatsHeld - activeDay.seatsBooked) <= 0 ? 'var(--error)' : 'inherit' }}>
                  {activeDay.totalSeats - activeDay.seatsHeld - activeDay.seatsBooked}
                </div>
              </div>
            </div>

            {/* Bookings List */}
            <div>
              <h3 style={{ marginBottom: 12, fontSize: '1.1rem' }}>Active Bookings & Holds</h3>
              {(() => {
                const activeBookingDates = activeDay.bookingDates?.filter(
                  bd => bd.booking.status === 'confirmed' || bd.booking.status === 'pending_payment'
                ) || []

                if (activeBookingDates.length === 0) {
                  return (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 8 }}>
                      No active bookings or holds for this day.
                    </div>
                  )
                }

                return (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ boxShadow: 'none', borderRadius: 8 }}>
                      <thead>
                        <tr>
                          <th>Ref</th>
                          <th>Guest</th>
                          <th>Guests</th>
                          <th>Tour</th>
                          <th>Vessel</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeBookingDates.map(bd => {
                          const b = bd.booking
                          const badgeClass = b.status === 'pending_payment' ? 'pending' : b.status
                          const vesselLabel = b.assignedVessel 
                            ? (VESSEL_NAMES[b.assignedVessel] || b.assignedVessel) 
                            : 'Unassigned'
                          return (
                            <tr key={bd.id}>
                              <td>
                                <a 
                                  href={`/admin/bookings?search=${b.reference}`}
                                  style={{ fontWeight: 600, color: 'var(--ocean-deep)', textDecoration: 'underline' }}
                                  title="View booking in admin panel"
                                >
                                  {b.reference}
                                </a>
                              </td>
                              <td>{b.guestName}</td>
                              <td>{b.numGuests}</td>
                              <td>{tourNames[b.tourId] ?? b.tourId}</td>
                              <td style={{ fontStyle: b.assignedVessel ? 'normal' : 'italic', color: b.assignedVessel ? 'inherit' : 'var(--text-muted)' }}>
                                {vesselLabel}
                              </td>
                              <td>
                                <span className={`status-badge ${badgeClass}`}>
                                  {b.status.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-outline" onClick={() => setSelectedDay(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

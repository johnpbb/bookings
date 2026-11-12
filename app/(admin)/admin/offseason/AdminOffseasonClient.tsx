'use client'

import { useCallback, useEffect, useState } from 'react'
import { BOAT_LABELS, OFFSEASON_CALENDARS, type CalendarId } from '@/lib/offseason'

type Booking = { reference: string; guestName: string; numGuests: number; status: string }
type Slot = { blocked: boolean; total: number; held: number; booked: number; bookings: Booking[] }
type Day = { date: string } & Partial<Record<CalendarId, Slot>>

const WEEKDAYS = [
  { n: 1, label: 'Mon' }, { n: 2, label: 'Tue' }, { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' }, { n: 5, label: 'Fri' }, { n: 6, label: 'Sat' },
]
const ALL_WEEKDAYS = WEEKDAYS.map((d) => d.n)

const TARGETS: { value: string; label: string; calendars: CalendarId[] }[] = [
  { value: 'boat_one', label: 'Boat One: Reef & Outer Island Adventure', calendars: ['reef'] },
  { value: 'boat_two', label: 'Boat Two: both charters', calendars: ['charter_island', 'charter_fishing'] },
  { value: 'charter_island', label: 'Boat Two: Private Charter only', calendars: ['charter_island'] },
  { value: 'charter_fishing', label: 'Boat Two: Game Fishing Charter only', calendars: ['charter_fishing'] },
]

const inputStyle: React.CSSProperties = { padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8 }
const fieldLabel: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7)
}

function formatDay(date: string): string {
  return new Date(date).toLocaleDateString('en-NZ', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
}

function formatMonth(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString('en-NZ', { timeZone: 'UTC', month: 'long', year: 'numeric' })
}

function slotStatus(id: CalendarId, slot: Slot): { text: string; badge: string } {
  if (slot.blocked) return { text: 'Enquire only', badge: 'pending' }
  const taken = slot.booked + slot.held
  if (id === 'reef') return taken >= slot.total ? { text: 'Full', badge: 'cancelled' } : { text: `${taken} of ${slot.total} seats`, badge: 'confirmed' }
  return taken > 0 ? { text: 'Booked', badge: 'cancelled' } : { text: 'Open', badge: 'confirmed' }
}

export default function AdminOffseasonClient() {
  const [month, setMonth] = useState(thisMonth)
  const [days, setDays] = useState<Day[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [boatFilter, setBoatFilter] = useState('')

  const [target, setTarget] = useState(TARGETS[0].value)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [weekdays, setWeekdays] = useState<number[]>(ALL_WEEKDAYS)

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/offseason?month=${month}`)
    const data = await res.json()
    if (Array.isArray(data)) setDays(data)
    else setError(data.error ?? 'Could not load the calendar.')
    setLoading(false)
  }, [month])

  useEffect(() => {
    let current = true
    fetch(`/api/admin/offseason?month=${month}`)
      .then((res) => res.json())
      .then((data) => {
        if (!current) return
        if (Array.isArray(data)) setDays(data)
        else setError(data.error ?? 'Could not load the calendar.')
        setLoading(false)
      })
    return () => { current = false }
  }, [month])

  async function save(calendars: CalendarId[], rangeFrom: string, rangeTo: string, days: number[], blocked: boolean) {
    setSaving(true); setMsg(''); setError('')
    const res = await fetch('/api/admin/offseason', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ calendars, from: rangeFrom, to: rangeTo, weekdays: days, blocked }),
    })
    const data = await res.json()
    if (res.ok) {
      const warning = data.withBookings > 0
        ? ` ${data.withBookings} of those already ${data.withBookings === 1 ? 'has a booking' : 'have bookings'}, which stay in place.`
        : ''
      setMsg(`✓ ${data.updated} ${data.updated === 1 ? 'entry' : 'entries'} ${blocked ? 'set to Enquire only' : 'opened for booking'}.${warning}`)
      await load()
    } else {
      setError(data.error ?? 'Could not save.')
    }
    setSaving(false)
  }

  function bulk(blocked: boolean) {
    const chosen = TARGETS.find((t) => t.value === target)!
    save(chosen.calendars, from, to, weekdays, blocked)
  }

  const columns = OFFSEASON_CALENDARS.filter((c) => !boatFilter || c.boat === boatFilter)

  return (
    <>
      <div className="admin-page-header"><h1>Island &amp; Fishing Calendar</h1></div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ background: 'white', borderRadius: 16, padding: 28, border: '1px solid var(--border)', marginBottom: 32 }}>
        <h3 style={{ marginBottom: 8 }}>Block or Open Dates</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 20 }}>
          Blocked dates show guests an &quot;Enquire&quot; option instead of &quot;Sold out&quot;. Whale season bookings are not affected.
        </p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <label style={fieldLabel}>Boat</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} style={inputStyle}>
              {TARGETS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={fieldLabel}>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={fieldLabel}>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          {WEEKDAYS.map((d) => (
            <label key={d.n} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}>
              <input type="checkbox" checked={weekdays.includes(d.n)}
                onChange={(e) => setWeekdays((w) => e.target.checked ? [...w, d.n] : w.filter((x) => x !== d.n))} />
              {d.label}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" disabled={saving} onClick={() => bulk(true)}>Block (Enquire only)</button>
          <button className="btn btn-outline" disabled={saving} onClick={() => bulk(false)}>Open for Booking</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <button className="btn btn-outline btn-sm" onClick={() => setMonth((m) => shiftMonth(m, -1))}>←</button>
        <h3 style={{ margin: 0, minWidth: 170, textAlign: 'center' }}>{formatMonth(month)}</h3>
        <button className="btn btn-outline btn-sm" onClick={() => setMonth((m) => shiftMonth(m, 1))}>→</button>
        <select value={boatFilter} onChange={(e) => setBoatFilter(e.target.value)} style={inputStyle}>
          <option value="">Both boats</option>
          <option value="boat_one">{BOAT_LABELS.boat_one}</option>
          <option value="boat_two">{BOAT_LABELS.boat_two}</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              {columns.map((c) => <th key={c.id}>{BOAT_LABELS[c.boat]}: {c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date}>
                <td style={{ fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{formatDay(day.date)}</td>
                {columns.map((c) => {
                  const slot = day[c.id]
                  if (!slot) return <td key={c.id} style={{ color: 'var(--text-muted)' }}>—</td>
                  const status = slotStatus(c.id, slot)
                  return (
                    <td key={c.id} style={{ verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={`status-badge ${status.badge}`}>{status.text}</span>
                        <button
                          disabled={saving}
                          onClick={() => save([c.id], day.date, day.date, ALL_WEEKDAYS, !slot.blocked)}
                          style={{ background: 'none', border: 'none', color: 'var(--ocean-deep)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', padding: 0 }}
                        >
                          {slot.blocked ? 'Open' : 'Block'}
                        </button>
                      </div>
                      {slot.bookings.map((b) => (
                        <div key={b.reference} style={{ fontSize: '0.8rem', marginTop: 6 }}>
                          <a href={`/admin/bookings?search=${b.reference}`} style={{ color: 'var(--ocean-deep)', fontWeight: 600 }}>{b.reference}</a>
                          {' '}{b.guestName} ({b.numGuests}){b.status === 'pending_payment' ? ', paying' : ''}
                        </div>
                      ))}
                    </td>
                  )
                })}
              </tr>
            ))}
            {!loading && days.length === 0 && (
              <tr><td colSpan={columns.length + 1} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No dates set up for this month.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

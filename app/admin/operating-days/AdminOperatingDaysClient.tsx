'use client'

import { useState } from 'react'

type DayRow = {
  id: number
  operatingDate: Date | string
  totalSeats: number
  seatsHeld: number
  seatsBooked: number
  charterVessel: string | null
  isFullyBlocked: boolean
}

export default function AdminOperatingDaysClient({ initialDays }: { initialDays: DayRow[] }) {
  const [days, setDays]       = useState(initialDays)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const [error, setError]     = useState('')

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
              <th>Date</th><th>Total Seats</th><th>Held</th><th>Booked</th><th>Available</th><th>Charter</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {days.map(d => {
              const dateStr = new Date(d.operatingDate).toISOString().slice(0, 10)
              const available = d.totalSeats - d.seatsHeld - d.seatsBooked
              return (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>
                    {new Date(d.operatingDate).toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' })}
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
    </>
  )
}

'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { EnquiryTour } from '@/lib/tours'

function isWhaleSeasonNow(): boolean {
  const m = new Date().getMonth() + 1
  return m >= 7 && m <= 10
}

function isWhaleSeasonNow(): boolean {
  const m = new Date().getMonth() + 1
  return m >= 7 && m <= 10
}

export default function EnquiryClient({ tour }: { tour: EnquiryTour }) {
  const router = useRouter()
  const tourId = tour.id

  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [groupSize, setGroupSize] = useState('')
  const [dates, setDates]         = useState('')
  const [message, setMessage]     = useState('')
  const [whaleAddon, setWhaleAddon] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')

  if (!tour) return <div className="booking-shell"><p>Tour not found.</p></div>

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId, guestName: name, guestEmail: email, guestPhone: phone,
          groupSize: groupSize ? parseInt(groupSize, 10) : null,
          preferredDates: dates, message, whaleAddon,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error ?? 'Failed to submit enquiry.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="result-card success" style={{ margin: '80px auto' }}>
        <span className="result-icon">✉️</span>
        <h1>Enquiry Received!</h1>
        <p>Thanks <strong>{name}</strong> — we'll be in touch within 24 hours.</p>
        <p style={{ marginTop: 8 }}>Keep an eye on your inbox at <strong>{email}</strong>.</p>
        <a href="/" className="btn btn-primary" style={{ marginTop: 32, display: 'inline-flex' }}>View All Tours</a>
      </div>
    )
  }

  return (
    <div className="booking-shell">
      <div style={{ marginBottom: 32 }}>
        <a href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>← All tours</a>
        <h1 style={{ marginTop: 8 }}>{tour.emoji} {tour.name}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{tourId === 'island_charter' ? 'TOP$ 2,400 (up to 10 people)' : tourId === 'game_fishing' ? 'TOP$ 1,600 (up to 4 people)' : 'Pricing on application'}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="step-card">
        <h2 style={{ marginBottom: 8 }}>Make an Enquiry</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '0.9rem' }}>
          Fill in the form below and we'll get back to you within 24 hours to confirm availability and arrange payment.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+64 21 234 5678" />
            </div>
            <div className="form-group">
              <label>Group Size</label>
              <input type="number" min={1} max={30} value={groupSize} onChange={e => setGroupSize(e.target.value)} placeholder="e.g. 4" />
            </div>
          </div>
          <div className="form-group">
            <label>Preferred Date(s)</label>
            <input value={dates} onChange={e => setDates(e.target.value)} placeholder="e.g. 15 August 2026 or any week in September" />
          </div>
          <div className="form-group">
            <label>Message / Special Requirements</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Tell us about your group, any special requirements, or questions you have." />
          </div>

          {/* Whale watch add-on — island charter only, in season */}
          {tour.id === 'island_charter' && isWhaleSeasonNow() && (
            <div className="checkbox-group" style={{ marginBottom: 24 }}>
              <input type="checkbox" id="whale-addon" checked={whaleAddon} onChange={e => setWhaleAddon(e.target.checked)} />
              <label htmlFor="whale-addon" style={{ fontSize: '0.88rem', fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>
                🐋 Add a Whale Watch experience (+TOP$ 600) — subject to whale watch boat availability.
                Our team will confirm when we respond to your enquiry.
              </label>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Enquiry →'}
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

interface Booking {
  reference: string
  tourId: string
  status: string
  guestName: string
  numGuests: number
  amountTop: string
  bookingDates: Array<{ tourDate: string }>
  tourName?: string
}

const TOUR_NAMES: Record<string, string> = {
  whale_day_trip: 'Ultimate Day Trip',
  whale_3day: '3-Day Special',
  whale_5day: '5-Day Special',
  island_reef: 'Outer Reef Excursion',
}

function ResultContent() {
  const params = useSearchParams()
  const orderId = params.get('order_id')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!orderId) { setNotFound(true); setLoading(false); return }

    // Poll for booking status — ANZ callback may take a moment
    let attempts = 0
    const poll = async () => {
      try {
        const res = await fetch(`/api/booking/by-order?order_id=${encodeURIComponent(orderId)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status !== 'pending_payment' || attempts >= 8) {
            setBooking(data)
            setLoading(false)
            return
          }
        }
      } catch { /* ignore */ }
      attempts++
      if (attempts < 8) setTimeout(poll, 2000)
      else { setNotFound(true); setLoading(false) }
    }

    setTimeout(poll, 1500) // give ANZ callback a head start
  }, [orderId])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Confirming your payment…</p>
      </div>
    )
  }

  if (notFound || !booking) {
    return (
      <div className="result-card failure">
        <span className="result-icon">❌</span>
        <h1>Payment Unsuccessful</h1>
        <p>Your payment could not be confirmed. No charge has been made.</p>
        <p>Your seat hold has been released.</p>
        <a href="/" className="btn btn-primary" style={{ marginTop: 32, display: 'inline-flex' }}>Try Again</a>
      </div>
    )
  }

  const isSuccess = booking.status === 'confirmed'

  if (!isSuccess) {
    return (
      <div className="result-card failure">
        <span className="result-icon">❌</span>
        <h1>Payment Not Completed</h1>
        <p>Your booking was not confirmed. No charge has been made.</p>
        <p>Your seat hold has been released.</p>
        <a href="/" className="btn btn-primary" style={{ marginTop: 32, display: 'inline-flex' }}>Try Again</a>
      </div>
    )
  }

  const dates = booking.bookingDates
    .map(bd => new Date(bd.tourDate).toLocaleDateString('en-NZ', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))

  return (
    <div className="result-card success">
      <span className="result-icon">🐋</span>
      <h1>Booking Confirmed!</h1>
      <p>Kia orana <strong>{booking.guestName}</strong> — we can't wait to welcome you!</p>
      <p style={{ marginTop: 8 }}>A confirmation email is on its way to you.</p>

      <div className="result-ref">{booking.reference}</div>

      <div style={{ background: 'var(--foam)', borderRadius: 'var(--radius-md)', padding: '20px 24px', marginBottom: 24, textAlign: 'left' }}>
        <div style={{ fontSize: '0.88rem', display: 'grid', gap: 10 }}>
          <div><strong>Tour:</strong> {booking.tourName ?? booking.tourId}</div>
          <div><strong>Date{dates.length > 1 ? 's' : ''}:</strong>
            <ul style={{ marginTop: 4, paddingLeft: 20 }}>
              {dates.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
          <div><strong>Guests:</strong> {booking.numGuests}</div>
          <div><strong>Total Paid:</strong> TOP$ {Number(booking.amountTop).toFixed(2)}</div>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        View our <a href="https://tahitonga.com/terms-conditions/">cancellation policy</a>.
        Questions? <a href="mailto:info@tahitonga.com">info@tahitonga.com</a>
      </p>

      <a href="/" className="btn btn-outline" style={{ marginTop: 28, display: 'inline-flex' }}>
        View All Tours
      </a>
    </div>
  )
}

export default function BookingResultPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
      </div>
    }>
      <ResultContent />
    </Suspense>
  )
}

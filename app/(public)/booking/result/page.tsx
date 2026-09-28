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
  resultState?: 'confirmed' | 'failed' | 'ambiguous' | 'paid_unplaced'
}


function ResultContent() {
  const params = useSearchParams()
  const orderId = params.get('order_id')
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!orderId) { setNotFound(true); setLoading(false); return }

    // Poll for booking status — ANZ can take a little while to confirm. If it still hasn't
    // resolved when we give up, show the "still confirming" state — never "no charge made".
    const MAX_ATTEMPTS = 15
    let attempts = 0
    let last: Booking | null = null
    const poll = async () => {
      try {
        const res = await fetch(`/api/booking/by-order?order_id=${encodeURIComponent(orderId)}`, { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          last = data
          if (data.status !== 'pending_payment') {
            setBooking(data)
            setLoading(false)
            return
          }
        }
      } catch { /* ignore */ }
      attempts++
      if (attempts < MAX_ATTEMPTS) setTimeout(poll, 2000)
      else {
        if (last) setBooking({ ...(last as Booking), resultState: 'ambiguous' })
        else setNotFound(true)
        setLoading(false)
      }
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
        <span className="result-icon">⏳</span>
        <h1>We Couldn't Check Your Booking</h1>
        <p>We weren't able to load your payment status just now. If a charge went through, your booking will be confirmed automatically — please check your email (including spam) in a few minutes.</p>
        <p><strong>Please don't submit a new booking yet.</strong> If you don't hear from us within 30 minutes, contact us at <a href="mailto:info@tahitonga.com">info@tahitonga.com</a>.</p>
        <a href="/" className="btn btn-primary" style={{ marginTop: 32, display: 'inline-flex' }}>Back to Home</a>
      </div>
    )
  }

  const isSuccess = booking.status === 'confirmed'
  const isAmbiguous = booking.resultState === 'ambiguous'

  if (booking.resultState === 'paid_unplaced') {
    return (
      <div className="result-card failure">
        <span className="result-icon">📩</span>
        <h1>Payment Received — We'll Be in Touch</h1>
        <p>We've received your payment for booking <strong>{booking.reference}</strong>, but your seat hold had expired and those seats have since been taken.</p>
        <p>Our team has been notified and will contact you shortly to arrange alternative dates or a full refund. <strong>Please don't submit a new booking.</strong></p>
        <p>Questions? <a href="mailto:info@tahitonga.com">info@tahitonga.com</a></p>
      </div>
    )
  }

  if (!isSuccess) {
    return (
      <div className="result-card failure">
        <span className="result-icon">{isAmbiguous ? '⏳' : '❌'}</span>
        <h1>{isAmbiguous ? 'Still Confirming Your Payment' : 'Payment Not Completed'}</h1>
        {isAmbiguous ? (
          <>
            <p>We couldn't confirm your payment status in time. If a charge went through, your booking will be confirmed automatically shortly — please check your email (including spam) in a few minutes.</p>
            <p><strong>Please don't submit a new booking yet.</strong> If you don't hear from us within 30 minutes, contact us with your details before trying again.</p>
          </>
        ) : (
          <>
            <p>Your booking was not confirmed. No charge has been made.</p>
            <p>Your seat hold has been released.</p>
          </>
        )}
        <a href="/" className="btn btn-primary" style={{ marginTop: 32, display: 'inline-flex' }}>{isAmbiguous ? 'Back to Home' : 'Try Again'}</a>
      </div>
    )
  }

  const dates = booking.bookingDates
    .map(bd => new Date(bd.tourDate).toLocaleDateString('en-NZ', { timeZone: 'Pacific/Tongatapu', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }))

  return (
    <div className="result-card success">
      <span className="result-icon">🐋</span>
      <h1>Booking Confirmed!</h1>
      <p>Malo e lelei <strong>{booking.guestName}</strong> — we can't wait to welcome you!</p>
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

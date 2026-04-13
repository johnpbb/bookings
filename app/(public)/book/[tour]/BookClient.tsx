'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Script from 'next/script'

import { OnlineTour } from '@/lib/tours'

type PromoResult = { valid: boolean; discount?: number; code?: string; error?: string }

function calcPrice(tour: OnlineTour, numGuests: number): number {
  if (tour.id === 'island_reef') {
    return numGuests >= 5 ? (tour.reefPriceLarge || 320) * numGuests : (tour.reefPriceSmall || 400) * numGuests
  }
  return (tour.pricePerPerson ?? 0) * numGuests
}

export default function BookClient({ tour }: { tour: OnlineTour }) {
  const router = useRouter()
  const tourId = tour.id

  const [step, setStep] = useState(0)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [availability, setAvailability] = useState<{ available: string[]; partial: string[]; unavailable: string[] } | null>(null)
  const [maxSeats, setMaxSeats] = useState<number>(16)

  // Step 2: guest details
  const [guestName, setGuestName]     = useState('')
  const [guestEmail, setGuestEmail]   = useState('')
  const [guestPhone, setGuestPhone]   = useState('')
  const [numGuests, setNumGuests]     = useState(1)
  const [specialReqs, setSpecialReqs] = useState('')
  const [tcAccepted, setTcAccepted]   = useState(false)

  // Step 3: review + promo
  const [promoInput, setPromoInput]   = useState('')
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null)
  const [verifyingPromo, setVerifyingPromo] = useState(false)

  // Hold + payment
  const [bookingId, setBookingId]         = useState<number | null>(null)
  const [bookingRef, setBookingRef]       = useState('')
  const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null)
  const [countdown, setCountdown]         = useState('')
  const [countdownUrgent, setCountdownUrgent] = useState(false)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')

  // ── Load availability for Flatpickr ──────────────────────────────────────
  useEffect(() => {
    fetch('/api/availability?mode=upcoming&days=365')
      .then(r => r.json())
      .then(setAvailability)
      .catch(console.error)
  }, [])

  // ── Flatpickr init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 0 || typeof window === 'undefined' || !availability) return
    const fp = (window as any).flatpickr
    if (!fp) return

    const enabledDates = [...(availability.available ?? []), ...(availability.partial ?? [])]

    const instance = fp('#date-picker', {
      mode: tour.dateCount > 1 ? 'multiple' : 'single',
      minDate: 'today',
      enable: enabledDates,
      dateFormat: 'Y-m-d',
      disableMobile: false,
      onReady(_: unknown, __: unknown, fpSelf: any) {
        // Mark partial dates
        fpSelf.config.enable.forEach((d: string) => {
          if (availability.partial?.includes(d)) {
            const el = fpSelf.calendarContainer?.querySelector(`[aria-label*="${d}"]`)
            if (el) el.classList.add('partial-availability')
          }
        })
      },
      onChange(dates: Date[], dateStr: string, fpInstance: any) {
        const strs = dates.map(d => fpInstance.formatDate(d, 'Y-m-d'))
        setSelectedDates(strs)
        setError('')

        // Enforce required date count
        if (tour.dateCount > 1 && dates.length > tour.dateCount) {
          fpInstance.setDate(strs.slice(-tour.dateCount), false)
        }

        // Fetch min seats across selected dates
        if (strs.length > 0) {
          fetch(`/api/availability?mode=upcoming&days=365`)
            .then(() => {
              // Estimate from loaded availability — the min seats calc needs a separate endpoint
              // For now set a reasonable default
              setMaxSeats(16)
            })
        }
      },
    })

    return () => { try { instance.destroy() } catch { /* ignore */ } }
  }, [step, availability, tour.dateCount])

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!holdExpiresAt) return
    const interval = setInterval(() => {
      const diff = holdExpiresAt.getTime() - Date.now()
      if (diff <= 0) {
        setCountdown('00:00')
        clearInterval(interval)
        setError('Your hold has expired. Please start again.')
        return
      }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      setCountdownUrgent(diff < 5 * 60 * 1000)
    }, 1000)
    return () => clearInterval(interval)
  }, [holdExpiresAt])



  // ── Derived price ─────────────────────────────────────────────────────────
  const baseAmount    = calcPrice(tour, numGuests)
  const promoDiscount = (promoResult?.valid ? promoResult.discount ?? 0 : 0)
  const finalAmount   = Math.max(0, baseAmount - promoDiscount)

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleNext() {
    setError('')
    if (step === 0) {
      if (selectedDates.length !== tour.dateCount) {
        setError(`Please select exactly ${tour.dateCount} date${tour.dateCount > 1 ? 's' : ''}.`)
        return
      }
    }
    if (step === 1) {
      if (!guestName.trim()) { setError('Please enter your name.'); return }
      if (!guestEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { setError('Please enter a valid email address.'); return }
      if (!tcAccepted) { setError('Please accept the cancellation policy to continue.'); return }
    }
    setStep(s => s + 1)
  }

  async function validatePromo() {
    if (!promoInput.trim()) return
    setVerifyingPromo(true)
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim(), tourId, dates: selectedDates }),
      })
      const data: PromoResult = await res.json()
      setPromoResult(data)
    } catch {
      setPromoResult({ valid: false, error: 'Could not verify promo code.' })
    } finally {
      setVerifyingPromo(false)
    }
  }

  async function placeHold() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/booking/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId, dates: selectedDates, numGuests,
          guestName: guestName.trim(), guestEmail: guestEmail.trim(),
          guestPhone: guestPhone.trim(), specialRequests: specialReqs.trim(),
          promoCode: promoResult?.valid ? promoInput.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? 'Could not place hold. Please try again.')
        if (data.unavailableDates) {
          setError(`Some dates are no longer available: ${data.unavailableDates.join(', ')}. Please select different dates.`)
          setStep(0)
        }
        return
      }
      setBookingId(data.bookingId)
      setBookingRef(data.bookingRef)
      setHoldExpiresAt(new Date(data.holdExpiresAt))
      setStep(3) // go to payment step
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function initiatePayment() {
    if (!bookingId) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/egate/redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!data.sessionId) {
        setError(data.error ?? 'Payment initiation failed.')
        setLoading(false)
        return
      }

      const Checkout = (window as any).Checkout
      if (!Checkout) {
        setError('Payment gateway network error. Please disable adblockers or try again.')
        setLoading(false)
        return
      }

      Checkout.configure({
        session: { id: data.sessionId },
      })
      Checkout.showPaymentPage()
    } catch {
      setError('Could not connect to payment gateway.')
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (!tour) return null

  return (
    <div className="booking-shell">
      <Script src="https://anzegate.gateway.mastercard.com/static/checkout/checkout.min.js" strategy="lazyOnload" />

      {/* Page title */}
      <div style={{ marginBottom: 32 }}>
        <a href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>← All tours</a>
        <h1 style={{ marginTop: 8, fontSize: '1.8rem' }}>
          {tour.emoji} {tour.name}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{tour.perNote}</p>
      </div>

      {/* Step indicator */}
      <div className="step-indicator">
        {['Dates', 'Details', 'Review', 'Pay'].map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? '1' : 'initial' }}>
            <div className={`step-indicator__item ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              <div className="step-indicator__num">{i < step ? '✓' : i + 1}</div>
              <span className="sm-hidden">{label}</span>
            </div>
            {i < 3 && <div className="step-indicator__line" />}
          </div>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 24 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── STEP 0: Date selection ── */}
      {step === 0 && (
        <div className="step-card">
          <h2 style={{ marginBottom: 16 }}>Choose Your Date{tour.dateCount > 1 ? 's' : ''}</h2>
          {tour.dateCount > 1 && (
            <div className="date-hint">
              Select <strong>{tour.dateCount} dates</strong> — they can be non-consecutive.
              Dates with limited availability are highlighted.
            </div>
          )}
          <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span className="avail-pill open">● Available</span>
            <span className="avail-pill partial">● Filling up</span>
            <span className="avail-pill full">● Full / unavailable</span>
          </div>
          <input id="date-picker" placeholder="Click to choose dates..." readOnly
            style={{ width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.95rem', cursor: 'pointer', background: 'var(--foam)' }}
          />
          {selectedDates.length > 0 && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--foam)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem' }}>
              <strong>Selected:</strong> {selectedDates.map(d => new Date(d).toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' })).join(', ')}
              {selectedDates.length === tour.dateCount && (
                <span style={{ marginLeft: 8, color: 'var(--success)' }}>✓</span>
              )}
            </div>
          )}
          <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-lg" onClick={handleNext}
              disabled={selectedDates.length !== tour.dateCount}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Guest details ── */}
      {step === 1 && (
        <div className="step-card">
          <h2 style={{ marginBottom: 24 }}>Your Details</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Phone (int'l format)</label>
              <input value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+64 21 234 5678" />
            </div>
            <div className="form-group">
              <label>Number of Guests *</label>
              <select value={numGuests} onChange={e => setNumGuests(parseInt(e.target.value, 10))}>
                {Array.from({ length: Math.min(maxSeats, 16) }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Special Requests</label>
            <textarea value={specialReqs} onChange={e => setSpecialReqs(e.target.value)}
              placeholder="Dietary requirements, accessibility needs, etc." />
          </div>
          <div className="checkbox-group" style={{ marginBottom: 24 }}>
            <input type="checkbox" id="tc" checked={tcAccepted} onChange={e => setTcAccepted(e.target.checked)} />
            <label htmlFor="tc" style={{ fontSize: '0.88rem', fontWeight: 'normal', textTransform: 'none', letterSpacing: 0 }}>
              I have read and accept Tahi Tonga's{' '}
              <a href="https://tahitonga.com/terms-conditions/" target="_blank" rel="noreferrer">
                Cancellation Policy
              </a>
              . I understand that bookings are subject to weather and whale watch conditions.
            </label>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
            <button className="btn btn-outline" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-primary btn-lg" onClick={handleNext}>Continue →</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Review + promo + hold ── */}
      {step === 2 && (
        <div className="step-card">
          <h2 style={{ marginBottom: 24 }}>Review Your Booking</h2>

          {/* Booking summary */}
          <div style={{ background: 'var(--foam)', borderRadius: 'var(--radius-md)', padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tour</span>
              <span style={{ fontWeight: 600 }}>{tour.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>Date{selectedDates.length > 1 ? 's' : ''}</span>
              <span>{selectedDates.map(d => new Date(d).toLocaleDateString('en-NZ', { weekday: 'short', month: 'short', day: 'numeric' })).join(', ')}</span>
              <span style={{ color: 'var(--text-muted)' }}>Guest Name</span>
              <span>{guestName}</span>
              <span style={{ color: 'var(--text-muted)' }}>Email</span>
              <span>{guestEmail}</span>
              <span style={{ color: 'var(--text-muted)' }}>Guests</span>
              <span>{numGuests}</span>
            </div>
          </div>

          {/* Promo code */}
          <div className="promo-row">
            <input
              placeholder="Promo code (optional)"
              value={promoInput}
              onChange={e => { setPromoInput(e.target.value); setPromoResult(null) }}
              onKeyDown={e => e.key === 'Enter' && validatePromo()}
            />
            <button className="btn btn-outline" onClick={validatePromo} disabled={verifyingPromo || !promoInput.trim()}>
              {verifyingPromo ? 'Checking...' : 'Apply'}
            </button>
          </div>

          {promoResult && (
            <div className={`promo-result ${promoResult.valid ? 'valid' : 'invalid'}`}>
              {promoResult.valid
                ? `✓ Code applied — TOP$ ${promoResult.discount?.toFixed(2)} discount`
                : `✗ ${promoResult.error}`
              }
            </div>
          )}

          {/* Price summary */}
          <div className="price-summary">
            <div className="price-row">
              <span>{numGuests} guest{numGuests > 1 ? 's' : ''} × {tour.id === 'island_reef' ? `TOP$ ${numGuests >= 5 ? (tour.reefPriceLarge || 320) : (tour.reefPriceSmall || 400)}pp` : `TOP$ ${tour.pricePerPerson}`}</span>
              <span>TOP$ {baseAmount.toFixed(2)}</span>
            </div>
            {promoResult?.valid && (
              <div className="price-row discount">
                <span>Promo ({promoResult.code})</span>
                <span>−TOP$ {promoDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="price-row total">
              <span>Total Due</span>
              <span>TOP$ {finalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginBottom: 24 }}>
            🔒 A 20-minute seat hold will be placed when you proceed. Complete payment before the timer expires.
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary btn-lg" onClick={placeHold} disabled={loading}>
              {loading ? 'Placing hold...' : `Hold Seats & Pay →`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Payment ── */}
      {step === 3 && bookingId && (
        <div className="step-card">
          <h2 style={{ marginBottom: 24 }}>Complete Payment</h2>

          {holdExpiresAt && (
            <div className={`countdown-bar ${countdownUrgent ? 'urgent' : ''}`}>
              <span className="countdown-bar__icon">⏱</span>
              <span className="countdown-bar__text">Seats held — complete payment before time runs out</span>
              <span className="countdown-bar__time">{countdown}</span>
            </div>
          )}

          <div className="price-summary">
            <div className="price-row">
              <span>Booking Reference</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{bookingRef}</span>
            </div>
            <div className="price-row">
              <span>Tour</span>
              <span>{tour.name}</span>
            </div>
            <div className="price-row">
              <span>Guests</span>
              <span>{numGuests}</span>
            </div>
            <div className="price-row total">
              <span>Amount to Pay</span>
              <span>TOP$ {finalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginBottom: 24 }}>
            💳 You will be redirected to ANZ eGate for secure payment in Tongan Paʻanga (TOP).
          </div>

          <button className="btn btn-primary btn-lg btn-full" onClick={initiatePayment} disabled={loading}>
            {loading ? 'Connecting to payment...' : `Pay TOP$ ${finalAmount.toFixed(2)} Securely →`}
          </button>


        </div>
      )}
    </div>
  )
}

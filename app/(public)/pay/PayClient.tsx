'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { MAX_PAYMENT_TOP, MIN_PAYMENT_TOP } from '@/lib/paymentContent'

export type Surcharge = { enabled: boolean; label: string; type: 'fixed' | 'percentage'; amount: number }

export type FixedPayment = { token: string; amount: number; description: string; guestName: string; guestEmail: string }

function surchargeOn(subtotal: number, s: Surcharge): number {
  if (!s.enabled || s.amount <= 0 || subtotal <= 0) return 0
  return s.type === 'percentage' ? Math.round(subtotal * s.amount / 100 * 100) / 100 : s.amount
}

const money = (n: number) => `TOP$ ${n.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function PayClient({ surcharge, fixed }: { surcharge: Surcharge; fixed?: FixedPayment }) {
  const router = useRouter()
  const [amountInput, setAmountInput] = useState('')
  const [description, setDescription] = useState('')
  const [guestName, setGuestName] = useState(fixed?.guestName ?? '')
  const [guestEmail, setGuestEmail] = useState(fixed?.guestEmail ?? '')
  const [guestPhone, setGuestPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const amount = fixed ? fixed.amount : Math.round((parseFloat(amountInput) || 0) * 100) / 100
  const fee = surchargeOn(amount, surcharge)
  const total = amount + fee

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!fixed) {
      if (!(amount >= MIN_PAYMENT_TOP && amount <= MAX_PAYMENT_TOP)) { setError(`Please enter an amount between TOP$ ${MIN_PAYMENT_TOP} and TOP$ ${MAX_PAYMENT_TOP.toLocaleString('en-NZ')}.`); return }
      if (!description.trim()) { setError('Please tell us what the payment is for.'); return }
    }
    if (!guestName.trim()) { setError('Please enter your name.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) { setError('Please enter a valid email address.'); return }

    setLoading(true)
    try {
      const start = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fixed
          ? { token: fixed.token, guestName, guestEmail, guestPhone }
          : { amount, description, guestName, guestEmail, guestPhone }),
      }).then(r => r.json())
      if (!start.success) { setError(start.error ?? 'Could not start the payment.'); setLoading(false); return }

      const session = await fetch('/api/egate/redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: start.bookingId }),
      }).then(r => r.json())
      if (session.alreadyPaid && session.orderId) {
        router.push(`/booking/result?order_id=${encodeURIComponent(session.orderId)}`)
        return
      }
      if (!session.sessionId) { setError(session.error ?? 'Could not connect to the payment gateway.'); setLoading(false); return }

      const Checkout = (window as unknown as { Checkout?: { configure: (c: unknown) => void; showPaymentPage: () => void } }).Checkout
      if (!Checkout) { setError('Payment gateway network error. Please disable adblockers or try again.'); setLoading(false); return }
      Checkout.configure({ session: { id: session.sessionId } })
      Checkout.showPaymentPage()
    } catch {
      setError('Could not connect to the payment gateway. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="booking-shell">
      <Script src="https://anzegate.gateway.mastercard.com/static/checkout/checkout.min.js" strategy="lazyOnload" />

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ marginTop: 8, fontSize: '1.8rem' }}>Make a Payment</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Secure card payment to Tahi Tonga in Tongan Paʻanga (TOP), processed by ANZ eGate.
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>⚠️ {error}</div>}

      <form className="step-card" onSubmit={pay}>
        {fixed ? (
          <div style={{ background: 'var(--foam)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Payment for</div>
            <div style={{ fontWeight: 600 }}>{fixed.description}</div>
          </div>
        ) : (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="amount">Amount (TOP$) *</label>
              <input id="amount" type="number" inputMode="decimal" min={MIN_PAYMENT_TOP} max={MAX_PAYMENT_TOP} step="0.01"
                value={amountInput} onChange={e => setAmountInput(e.target.value)} placeholder="e.g. 520" />
            </div>
            <div className="form-group">
              <label htmlFor="description">What is this payment for? *</label>
              <input id="description" value={description} maxLength={250} onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Balance for whale trip on 12 August" />
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input id="name" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input id="email" type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="jane@example.com" />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone (int&apos;l format)</label>
          <input id="phone" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+64 21 234 5678" />
        </div>

        <div className="price-summary">
          <div className="price-row">
            <span>Payment</span>
            <span>{money(amount)}</span>
          </div>
          {fee > 0 && (
            <div className="price-row">
              <span>{surcharge.label}</span>
              <span>{money(fee)}</span>
            </div>
          )}
          <div className="price-row total">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '16px 0 24px' }}>
          You&apos;ll be taken to ANZ&apos;s secure page to enter your card details, and we&apos;ll email you a receipt.
        </p>

        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
          {loading ? 'Connecting to ANZ…' : `Pay ${money(total)} Securely →`}
        </button>
      </form>
    </div>
  )
}

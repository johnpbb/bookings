import { NextRequest, NextResponse } from 'next/server'
import { validateCallback } from '@/lib/egate'
import { confirmBooking, releaseHold, getBookingByEgateOrder } from '@/lib/booking'

/**
 * ANZ eGate payment callback.
 * ANZ POSTs form-encoded data to this endpoint after a payment attempt.
 * We validate the HMAC signature before processing anything.
 */
export async function POST(req: NextRequest) {
  try {
    const text = await req.text()
    const postData = Object.fromEntries(new URLSearchParams(text))

    // ── Validate HMAC ──────────────────────────────────────────────────────
    const validation = await validateCallback(postData)

    if (!validation.valid) {
      console.error('[egate/callback] HMAC validation failed:', validation.error)
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
    }

    const orderId = validation.orderId!
    const txnRef  = validation.txnRef ?? ''

    // ── Idempotency guard ──────────────────────────────────────────────────
    const existing = await getBookingByEgateOrder(orderId)
    if (!existing) {
      console.error(`[egate/callback] No booking found for order ${orderId}`)
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    }

    if (['confirmed', 'cancelled', 'refunded'].includes(existing.status)) {
      // Duplicate callback — already processed
      console.log(`[egate/callback] Duplicate callback for ${orderId} — already ${existing.status}`)
      return NextResponse.json({ status: existing.status })
    }

    // ── Process result ─────────────────────────────────────────────────────
    if (validation.success) {
      await confirmBooking(existing.id, orderId, txnRef)
      return NextResponse.json({ status: 'confirmed' })
    } else {
      await releaseHold(existing.id, `payment_${postData['result'] ?? 'failed'}`.toLowerCase())
      return NextResponse.json({ status: 'cancelled' })
    }
  } catch (err) {
    console.error('[egate/callback] Error:', err)
    return NextResponse.json({ error: 'Callback processing error.' }, { status: 500 })
  }
}

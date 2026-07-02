import { NextRequest, NextResponse } from 'next/server'
import { getBookingByEgateOrder, resolvePendingPayment } from '@/lib/booking'
import { getOnlineTour, getEnquiryTour } from '@/lib/tours'

// Distinguishes "genuinely failed" (safe to tell the customer no charge was made) from
// "still unconfirmed" (a charge may have gone through — don't encourage resubmission).
function computeResultState(b: { status: string; cancelReason: string | null }): 'confirmed' | 'failed' | 'ambiguous' {
  if (b.status === 'confirmed') return 'confirmed'
  if (b.status === 'cancelled' && b.cancelReason === 'payment_unconfirmed') return 'ambiguous'
  if (b.status === 'cancelled') return 'failed' // hold_expired (never reached gateway) or payment_failed
  return 'ambiguous' // still pending_payment
}

// GET /api/booking/by-order?order_id=TT-42-ABCD1234
// Polled by result page after user is redirected from Mastercard.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('order_id')

  if (!orderId) {
    return NextResponse.json({ error: 'Missing order_id.' }, { status: 400 })
  }

  // Always sync latest status from Mastercard Gateway to clear holds or confirm
  let currentBooking = await getBookingByEgateOrder(orderId)
  if (!currentBooking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  if (currentBooking.status === 'pending_payment') {
    await resolvePendingPayment(currentBooking)
    // Fetch fresh state after updates
    currentBooking = await getBookingByEgateOrder(orderId)
  }

  if (!currentBooking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  const resultState = computeResultState(currentBooking)

  // Strip sensitive fields
  const { egateTxnRef: _txn, ipAddress: _ip, cancelReason: _cr, ...safe } = currentBooking as typeof currentBooking & {
    egateTxnRef?: string; ipAddress?: string; cancelReason?: string
  }

  const oTour = await getOnlineTour(currentBooking.tourId)
  const eTour = await getEnquiryTour(currentBooking.tourId)

  return NextResponse.json({ ...safe, resultState, tourName: oTour?.name || eTour?.name })
}

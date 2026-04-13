import { NextRequest, NextResponse } from 'next/server'
import { getBookingByEgateOrder } from '@/lib/booking'
import { verifyPaymentOrder } from '@/lib/egate'

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
    const vResult = await verifyPaymentOrder(orderId)
    if (vResult.success && vResult.status === 'CAPTURED') {
      const { confirmBooking } = await import('@/lib/booking')
      await confirmBooking(currentBooking.id, orderId, vResult.txnRef ?? '')
    } else if (vResult.status === 'FAILED') {
      const { releaseHold } = await import('@/lib/booking')
      await releaseHold(currentBooking.id, 'payment_failed')
    }
    // Fetch fresh state after updates
    currentBooking = await getBookingByEgateOrder(orderId)
  }

  if (!currentBooking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  // Strip sensitive fields
  const { egateTxnRef: _txn, ipAddress: _ip, cancelReason: _cr, ...safe } = currentBooking as typeof currentBooking & {
    egateTxnRef?: string; ipAddress?: string; cancelReason?: string
  }

  return NextResponse.json(safe)
}

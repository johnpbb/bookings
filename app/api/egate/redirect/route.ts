import { NextRequest, NextResponse } from 'next/server'
import { buildPaymentSession, verifyPaymentOrder } from '@/lib/egate'
import { getBooking, extendHold, confirmBooking } from '@/lib/booking'

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json() as { bookingId: number }

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId.' }, { status: 400 })
    }

    const booking = await getBooking(bookingId)
    if (!booking || booking.status !== 'pending_payment') {
      return NextResponse.json({ error: 'This booking is no longer active — your seat hold has been released. Please start again.' }, { status: 410 })
    }

    // Retrying payment on a booking that already reached ANZ: make sure it isn't already
    // paid before opening a second checkout for the same order.
    if (booking.egateOrderId) {
      const v = await verifyPaymentOrder(booking.egateOrderId)
      if (v.success && v.status === 'CAPTURED') {
        await confirmBooking(booking.id, booking.egateOrderId, v.txnRef ?? '')
        return NextResponse.json({ alreadyPaid: true, orderId: booking.egateOrderId })
      }
    }

    // The customer is actively paying and the seats are still held (pending_payment),
    // so refresh the hold rather than rejecting an expired one.
    const holdExpiresAt = await extendHold(bookingId)
    if (!holdExpiresAt) {
      return NextResponse.json({ error: 'This booking is no longer active — your seat hold has been released. Please start again.' }, { status: 410 })
    }

    const sessionData = await buildPaymentSession(bookingId, {
      reference: booking.reference,
      tourId: booking.tourId,
      amountTop: booking.amountTop,
    })

    return NextResponse.json({ ...sessionData, holdExpiresAt: holdExpiresAt.toISOString() })
  } catch (err: any) {
    console.error('[api/egate/redirect] Error:', err)
    return NextResponse.json({ 
      error: 'Payment redirect error.', 
      details: err.message || 'Unknown error'
    }, { status: 500 })
  }
}

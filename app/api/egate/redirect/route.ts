import { NextRequest, NextResponse } from 'next/server'
import { buildPaymentSession } from '@/lib/egate'
import { getBooking } from '@/lib/booking'

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json() as { bookingId: number }

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId.' }, { status: 400 })
    }

    const booking = await getBooking(bookingId)
    if (!booking || booking.status !== 'pending_payment') {
      return NextResponse.json({ error: 'Booking not found or already processed.' }, { status: 404 })
    }

    // Check hold hasn't expired
    if (booking.holdExpiresAt && new Date(booking.holdExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Booking hold has expired. Please start again.' }, { status: 410 })
    }

    const sessionData = await buildPaymentSession(bookingId, {
      reference: booking.reference,
      tourId: booking.tourId,
      amountTop: booking.amountTop,
    })

    return NextResponse.json(sessionData)
  } catch (err) {
    console.error('[api/egate/redirect]', err)
    return NextResponse.json({ error: 'Payment redirect error.' }, { status: 500 })
  }
}

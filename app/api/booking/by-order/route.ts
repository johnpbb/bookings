import { NextRequest, NextResponse } from 'next/server'
import { getBookingByEgateOrder } from '@/lib/booking'

// GET /api/booking/by-order?order_id=TT-42-ABCD1234
// Used by the result page to poll for booking status after ANZ redirect.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('order_id')

  if (!orderId) {
    return NextResponse.json({ error: 'Missing order_id.' }, { status: 400 })
  }

  const booking = await getBookingByEgateOrder(orderId)
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  // Strip sensitive fields
  const { egateTxnRef: _txn, ipAddress: _ip, cancelReason: _cr, ...safe } = booking as typeof booking & {
    egateTxnRef?: string; ipAddress?: string; cancelReason?: string
  }

  return NextResponse.json(safe)
}

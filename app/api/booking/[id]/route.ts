import { NextRequest, NextResponse } from 'next/server'
import { getBooking } from '@/lib/booking'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid booking ID.' }, { status: 400 })
  }

  const booking = await getBooking(id)
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
  }

  // Strip sensitive fields from public response
  const { egateTxnRef: _txn, ipAddress: _ip, ...safe } = booking as typeof booking & { egateTxnRef?: string; ipAddress?: string }

  return NextResponse.json(safe)
}

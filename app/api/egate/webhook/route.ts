import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getBookingByEgateOrder, confirmBooking, releaseHold } from '@/lib/booking'

// POST /api/egate/webhook
// ANZ eGate (Mastercard MPGS) webhook notification, sent on Authorization/Capture/etc.
// Auth is via the X-Notification-Secret header (configured in ANZ Merchant Administration),
// not an HMAC signature. This is a best-effort fast path — the cron sweep in
// lib/booking.ts (releaseExpiredHolds -> resolvePendingPayment) remains the authoritative
// backstop, per ANZ's own guidance that webhooks are an offline, non-guaranteed notification.
async function webhookSecret(): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key: 'egate_webhook_secret' } })
  return s?.value ?? ''
}

export async function POST(req: NextRequest) {
  const provided = req.headers.get('x-notification-secret') ?? ''
  const expected = await webhookSecret()
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const orderId: string | undefined = body?.order?.id
  const status: string | undefined = body?.status
  const txnRef: string = body?.transaction?.[0]?.transaction?.id ?? ''

  // Always ack quickly with 2xx so the gateway doesn't burn its 20-attempt retry budget.
  if (!orderId) return NextResponse.json({ received: true })

  const booking = await getBookingByEgateOrder(orderId)
  if (!booking || booking.status !== 'pending_payment') return NextResponse.json({ received: true })

  if (status === 'CAPTURED' || status === 'AUTHORIZED') {
    await confirmBooking(booking.id, orderId, txnRef)
  } else if (status === 'FAILED') {
    await releaseHold(booking.id, 'payment_failed')
  }
  // Other statuses (PENDING, etc.) or events we don't care about: no-op, ack 2xx.

  return NextResponse.json({ received: true })
}

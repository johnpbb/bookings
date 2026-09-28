import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { getBookingByEgateOrder, confirmBooking, recoverLatePayment } from '@/lib/booking'
import { verifyPaymentOrder } from '@/lib/egate'

// POST /api/egate/webhook
// ANZ eGate (Mastercard MPGS) webhook notification, sent whenever a transaction on an order
// is created or updated. Auth is via the X-Notification-Secret header (configured in ANZ
// Merchant Administration → Admin → Webhook Notifications, copied into Admin → Settings).
//
// The payload is only used to find the order — the order status is always re-read from the
// ANZ API, so we act on the authoritative state rather than a single transaction event.
// Notifications never release a hold: a declined attempt can be followed by a successful
// retry on the same checkout. The cron sweep in lib/booking.ts (releaseExpiredHolds ->
// resolvePendingPayment) remains the backstop, as ANZ webhooks are not guaranteed.
async function webhookSecret(): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key: 'egate_webhook_secret' } })
  return (s?.value ?? '').trim() // tolerate stray whitespace from copy-pasting out of ANZ
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const provided = req.headers.get('x-notification-secret') ?? ''
  const expected = await webhookSecret()
  if (!expected || !secretsMatch(provided, expected)) {
    console.warn('[egate/webhook] Rejected notification: secret missing or mismatched')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const orderId: string | undefined = body?.order?.id

  // Always ack with 2xx for things we don't handle so the gateway doesn't burn its retry budget.
  if (!orderId) return NextResponse.json({ received: true })

  const booking = await getBookingByEgateOrder(orderId)
  if (!booking) return NextResponse.json({ received: true })

  // Errors below propagate as 5xx so ANZ retries the notification.
  if (booking.status === 'pending_payment') {
    const v = await verifyPaymentOrder(orderId)
    if (v.success && v.status === 'CAPTURED') {
      await confirmBooking(booking.id, orderId, v.txnRef ?? '')
    }
  } else if (booking.status === 'cancelled') {
    await recoverLatePayment(booking)
  }

  return NextResponse.json({ received: true })
}

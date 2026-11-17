/**
 * lib/payments.ts
 * Pay by link. Each payment attempt is a booking (tour "payment", no dates, no seats) that goes
 * through the normal ANZ checkout, confirmation, late-payment recovery and refund paths.
 */
import crypto from 'crypto'
import { prisma } from './db'
import { extendHold, generateRef } from './booking'
import { MAX_PAYMENT_TOP, MIN_PAYMENT_TOP, PAYMENT_TOUR_ID } from './paymentContent'

export interface PaymentAttemptArgs {
  token?: string
  amount?: number
  description?: string
  guestName: string
  guestEmail: string
  guestPhone?: string
  ipAddress?: string
}

export interface PaymentAttemptResult {
  success: boolean
  error?: string
  bookingId?: number
  bookingRef?: string
  finalAmount?: number
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const attempts = new Map<string, { count: number; resetAt: number }>()
function withinRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }
  entry.count++
  return entry.count <= 20
}

export function newPaymentToken(): string {
  return crypto.randomBytes(9).toString('base64url')
}

/** The card surcharge set in Settings, applied the same way as for tour bookings. */
async function surchargeFor(subtotal: number): Promise<number> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['payment_surcharge_enabled', 'payment_surcharge_type', 'payment_surcharge_amount'] } },
  })
  const get = (k: string) => rows.find((r) => r.key === k)?.value ?? ''
  const amount = parseFloat(get('payment_surcharge_amount')) || 0
  if (get('payment_surcharge_enabled') !== 'true' || amount <= 0) return 0
  return (get('payment_surcharge_type') || 'percentage') === 'percentage'
    ? Math.round(subtotal * amount / 100 * 100) / 100
    : amount
}

/** Whether a payment link has a confirmed payment against it. */
export async function isLinkPaid(linkId: number): Promise<boolean> {
  const paid = await prisma.booking.findFirst({
    where: { paymentLinkId: linkId, tourId: PAYMENT_TOUR_ID, status: 'confirmed' },
    select: { id: true },
  })
  return !!paid
}

export async function startPaymentAttempt(args: PaymentAttemptArgs): Promise<PaymentAttemptResult> {
  const guestName = args.guestName?.trim() ?? ''
  const guestEmail = args.guestEmail?.trim().toLowerCase() ?? ''
  if (!guestName) return { success: false, error: 'Please enter your name.' }
  if (!EMAIL.test(guestEmail)) return { success: false, error: 'Please enter a valid email address.' }
  if (!withinRateLimit(args.ipAddress ?? 'unknown')) {
    return { success: false, error: 'Too many payment attempts. Please try again later.' }
  }

  let amount: number
  let description: string
  let paymentLinkId: number | null = null

  if (args.token) {
    const link = await prisma.paymentLink.findUnique({ where: { token: args.token } })
    if (!link || link.status !== 'open') return { success: false, error: 'This payment link is no longer active. Please contact us.' }
    if (await isLinkPaid(link.id)) return { success: false, error: 'This payment link has already been paid. Thank you!' }

    // Someone already started paying this link and hasn't finished: carry on with that attempt,
    // so one link can't end up with two live checkouts.
    const inProgress = await prisma.booking.findFirst({
      where: { paymentLinkId: link.id, status: 'pending_payment' },
      orderBy: { createdAt: 'desc' },
    })
    if (inProgress && (await extendHold(inProgress.id))) {
      return { success: true, bookingId: inProgress.id, bookingRef: inProgress.reference, finalAmount: Number(inProgress.amountTop) }
    }

    amount = Number(link.amountTop)
    description = link.description
    paymentLinkId = link.id
  } else {
    amount = Math.round(Number(args.amount) * 100) / 100
    description = args.description?.trim() ?? ''
    if (!Number.isFinite(amount) || amount < MIN_PAYMENT_TOP || amount > MAX_PAYMENT_TOP) {
      return { success: false, error: `Please enter an amount between TOP$ ${MIN_PAYMENT_TOP} and TOP$ ${MAX_PAYMENT_TOP.toLocaleString('en-NZ')}.` }
    }
    if (!description) return { success: false, error: 'Please tell us what the payment is for.' }
    if (description.length > 250) return { success: false, error: 'Please keep the description under 250 characters.' }
  }

  const surcharge = await surchargeFor(amount)
  const holdSetting = await prisma.setting.findUnique({ where: { key: 'hold_minutes' } })
  const holdExpiresAt = new Date(Date.now() + parseInt(holdSetting?.value ?? '20', 10) * 60 * 1000)

  const booking = await prisma.booking.create({
    data: {
      reference: await generateRef(),
      tourId: PAYMENT_TOUR_ID,
      bookingType: 'payment',
      guestName,
      guestEmail,
      guestPhone: args.guestPhone?.trim() || null,
      numGuests: 1,
      amountTop: amount + surcharge,
      surchargeTop: surcharge,
      status: 'pending_payment',
      holdExpiresAt,
      specialRequests: description,
      ipAddress: args.ipAddress ?? null,
      paymentLinkId,
    },
  })

  return { success: true, bookingId: booking.id, bookingRef: booking.reference, finalAmount: amount + surcharge }
}

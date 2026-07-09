/**
 * lib/booking.ts
 * Core booking logic: atomic multi-date seat hold, confirmation, release, and cancellation.
 * Uses raw SQL with SELECT FOR UPDATE inside Prisma transactions for race-safe reservations.
 */
import { prisma } from './db'
import { validatePromo } from './promo'
import { sendBookingConfirmation, sendOperatorBookingAlert, sendRefundConfirmation } from './mailer'
import { processEgateRefund, verifyPaymentOrder } from './egate'
import type { Booking, BookingDate } from '@prisma/client'

import { getOnlineTour } from './tours'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlaceHoldArgs {
  tourId: string
  dates: string[]          // Y-m-d strings
  numGuests: number
  guestName: string
  guestEmail: string
  guestPhone?: string
  specialRequests?: string
  promoCode?: string
  ipAddress?: string
}

export interface PlaceHoldResult {
  success: boolean
  bookingId?: number
  bookingRef?: string
  holdExpiresAt?: string
  baseAmount?: number
  promoDiscount?: number
  finalAmount?: number
  error?: string
  unavailableDates?: string[]
}

export type BookingWithDates = Booking & { bookingDates: BookingDate[] }

// ── Hold duration helper ──────────────────────────────────────────────────────

async function getHoldMinutes(): Promise<number> {
  const s = await prisma.setting.findUnique({ where: { key: 'hold_minutes' } })
  return parseInt(s?.value ?? '20', 10)
}

// ── Generate unique booking reference ─────────────────────────────────────────

async function generateRef(): Promise<string> {
  const pad = (n: number) => String(n).padStart(5, '0')
  let ref: string
  do {
    const count = await prisma.booking.count()
    const now = new Date()
    ref = `TT-${now.getFullYear()}-${pad(count + 1)}`
    const exists = await prisma.booking.findUnique({ where: { reference: ref } })
    if (!exists) break
    // Collision: add random suffix
    ref = `TT-${now.getFullYear()}-${pad(count + 1)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  } while (await prisma.booking.findUnique({ where: { reference: ref } }))
  return ref
}

// ── Price calculation ─────────────────────────────────────────────────────────

export async function calculateBasePrice(tourId: string, numGuests: number): Promise<number> {
  const tour = await getOnlineTour(tourId)
  if (!tour) return 0

  if (tourId === 'island_reef') {
    const smallPrice = tour.reefPriceSmall || 400
    const largePrice = tour.reefPriceLarge || 320
    const ppp = numGuests >= 5 ? largePrice : smallPrice
    return ppp * numGuests
  }
  
  const ppp = tour.pricePerPerson ?? 0
  return ppp * numGuests
}

// ── Refund calculation ────────────────────────────────────────────────────────

export async function calculateRefund(
  finalAmount: number,
  firstDate: string,
): Promise<number> {
  const s = await prisma.setting.findUnique({ where: { key: 'non_refundable_fee' } })
  const nonRefundable = parseFloat(s?.value ?? '0')

  const daysUntil = Math.ceil(
    (new Date(firstDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  )

  let pct: number
  if (daysUntil >= 14)      pct = 0.75
  else if (daysUntil >= 7)  pct = 0.50
  else if (daysUntil >= 2)  pct = 0.25
  else                       pct = 0.00

  if (pct === 0) return 0
  const refundable = Math.max(0, finalAmount - nonRefundable)
  return Math.round(refundable * pct * 100) / 100
}

// ── Rate limiting (simple DB-backed counter) ──────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

// ── PLACE HOLD (core atomic operation) ───────────────────────────────────────

const RELEASE_GRACE_MS = 30 * 60 * 1000 // buffer beyond holdExpiresAt before releasing an ambiguous (unverifiable) order

// Verify a pending_payment booking against ANZ before ever releasing it — cancelling a hold
// that was actually paid (browser died before it could confirm) is how double payments happen.
export async function resolvePendingPayment(
  booking: Pick<Booking, 'id' | 'status' | 'egateOrderId' | 'holdExpiresAt'>,
): Promise<{ action: 'confirmed' | 'released' | 'left_pending' }> {
  if (booking.status !== 'pending_payment') return { action: 'left_pending' }

  if (!booking.egateOrderId) {
    // Never reached ANZ — nothing to verify, safe to release immediately
    const ok = await releaseHold(booking.id, 'hold_expired')
    return { action: ok ? 'released' : 'left_pending' }
  }

  const v = await verifyPaymentOrder(booking.egateOrderId)

  if (v.success && v.status === 'CAPTURED') {
    const ok = await confirmBooking(booking.id, booking.egateOrderId, v.txnRef ?? '')
    return { action: ok ? 'confirmed' : 'left_pending' }
  }
  if (v.status === 'FAILED') {
    const ok = await releaseHold(booking.id, 'payment_failed')
    return { action: ok ? 'released' : 'left_pending' }
  }

  // PENDING / UNKNOWN (incl. network errors) — inconclusive. Don't cancel a possibly-paid
  // booking on one ambiguous check; only release once well past expiry.
  const expiredAt = booking.holdExpiresAt ? new Date(booking.holdExpiresAt).getTime() : 0
  if (expiredAt && Date.now() - expiredAt > RELEASE_GRACE_MS) {
    const ok = await releaseHold(booking.id, 'payment_unconfirmed')
    return { action: ok ? 'released' : 'left_pending' }
  }
  return { action: 'left_pending' }
}

export async function releaseExpiredHolds(): Promise<number> {
  const now = new Date()

  const expired = await prisma.booking.findMany({
    where: {
      status: 'pending_payment',
      holdExpiresAt: { lte: now },
    },
    select: { id: true, status: true, egateOrderId: true, holdExpiresAt: true },
  })

  let released = 0
  let recovered = 0
  for (const booking of expired) {
    const { action } = await resolvePendingPayment(booking)
    if (action === 'released') released++
    else if (action === 'confirmed') recovered++
  }

  if (released > 0 || recovered > 0) {
    console.log(`[booking] Swept ${expired.length} expired hold(s): ${released} released, ${recovered} recovered as confirmed`)
  }

  return released
}

export async function placeHold(args: PlaceHoldArgs): Promise<PlaceHoldResult> {
  await releaseExpiredHolds()

  const tour = await getOnlineTour(args.tourId)
  
  // Validate tour type
  if (!tour) {
    return { success: false, error: 'Invalid tour type.' }
  }

  // Validate date count
  const required = tour.dateCount
  const dates = [...new Set(args.dates)].sort()
  if (dates.length !== required) {
    return {
      success: false,
      error: `${args.tourId} requires exactly ${required} date(s).`,
    }
  }

  // Validate guest count
  if (args.numGuests < 1) {
    return { success: false, error: 'At least 1 guest is required.' }
  }

  // Rate limit
  const ip = args.ipAddress ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return { success: false, error: 'Too many booking attempts. Please try again later.' }
  }

  // Duplicate-submission guard: don't let a customer create a second hold/charge for the
  // same tour+dates while a prior attempt is still in flight or already confirmed.
  const email = args.guestEmail.toLowerCase().trim()
  let dup = await prisma.booking.findFirst({
    where: {
      guestEmail: email,
      tourId: args.tourId,
      status: { in: ['pending_payment', 'confirmed'] },
      bookingDates: { some: { tourDate: { in: dates.map((d) => new Date(d)) } } },
    },
    include: { bookingDates: true },
    orderBy: { createdAt: 'desc' },
  })

  if (dup && dup.status === 'pending_payment') {
    // Re-check with ANZ in case it was paid moments ago and hasn't been swept yet
    await resolvePendingPayment(dup)
    dup = await prisma.booking.findUnique({ where: { id: dup.id }, include: { bookingDates: true } })
  }

  if (dup?.status === 'confirmed') {
    return {
      success: false,
      error: `You already have a confirmed booking (ref ${dup.reference}) for these dates — check your email for details.`,
    }
  }
  if (dup?.status === 'pending_payment') {
    return {
      success: false,
      error: `You already have a booking in progress (ref ${dup.reference}). Please finish that payment, or wait a few minutes for it to expire before starting a new one.`,
      bookingId: dup.id,
      bookingRef: dup.reference,
      holdExpiresAt: dup.holdExpiresAt?.toISOString() ?? undefined,
    }
  }

  // Calculate pricing
  const baseAmount = await calculateBasePrice(args.tourId, args.numGuests)
  let promoDiscount = 0
  let promoCodeUsed = ''

  if (args.promoCode) {
    const promo = await validatePromo(args.promoCode, args.tourId, dates)
    if (!promo.valid) {
      return { success: false, error: promo.error }
    }
    promoDiscount = promo.discountType === 'percent'
      ? Math.round(baseAmount * promo.discount! / 100 * 100) / 100
      : promo.discount!
    promoCodeUsed = promo.code!
  }

  const subtotal = Math.max(0, baseAmount - promoDiscount)
  const surchargeSettings = await prisma.setting.findMany({
    where: { key: { in: ['payment_surcharge_enabled', 'payment_surcharge_type', 'payment_surcharge_amount'] } }
  })
  const getSurcharge = (k: string) => surchargeSettings.find(s => s.key === k)?.value ?? ''
  const surchargeEnabled = getSurcharge('payment_surcharge_enabled') === 'true'
  const surchargeType = getSurcharge('payment_surcharge_type') || 'percentage'
  const surchargeAmt = parseFloat(getSurcharge('payment_surcharge_amount')) || 0
  const surchargeAmount = surchargeEnabled && surchargeAmt > 0
    ? surchargeType === 'percentage'
      ? Math.round(subtotal * surchargeAmt / 100 * 100) / 100
      : surchargeAmt
    : 0
  const finalAmount = subtotal + surchargeAmount
  const holdMinutes = await getHoldMinutes()
  const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000)
  const bookingRef = await generateRef()

  // ── Atomic transaction with SELECT FOR UPDATE ─────────────────────────────
  type TxResult = { success: boolean; bookingId?: number; unavailableDates?: string[]; error?: string }

  const result = await prisma.$transaction<TxResult>(async (tx) => {
    const unavailable: string[] = []

    for (const date of dates) {
      // Lock the operating_day row for this date
      const rows = await tx.$queryRaw<Array<{
        id: number
        total_seats: number
        seats_held: number
        seats_booked: number
        is_fully_blocked: boolean
      }>>`
        SELECT id, total_seats, seats_held, seats_booked, is_fully_blocked
        FROM tt_operating_days
        WHERE operating_date = ${new Date(date)}::date
        FOR UPDATE
      `

      if (rows.length === 0) {
        unavailable.push(date)
        continue
      }

      const row = rows[0]

      if (row.is_fully_blocked) {
        unavailable.push(date)
        continue
      }

      const available = row.total_seats - row.seats_held - row.seats_booked
      if (available < args.numGuests) {
        unavailable.push(date)
      }
    }

    if (unavailable.length > 0) {
      return { success: false, unavailableDates: unavailable }
    }

    // Insert booking
    const booking = await tx.booking.create({
      data: {
        reference: bookingRef,
        tourId: args.tourId,
        bookingType: 'online',
        guestName: args.guestName.trim(),
        guestEmail: args.guestEmail.toLowerCase().trim(),
        guestPhone: args.guestPhone?.trim() ?? null,
        numGuests: args.numGuests,
        amountTop: finalAmount,
        surchargeTop: surchargeAmount,
        status: 'pending_payment',
        promoCode: promoCodeUsed || null,
        discountTop: promoDiscount,
        holdExpiresAt,
        ipAddress: ip,
        specialRequests: args.specialRequests?.trim() ?? null,
      },
    })

    // Insert booking dates + increment seats_held
    for (const date of dates) {
      const opDay = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM tt_operating_days WHERE operating_date = ${new Date(date)}::date
      `
      if (opDay.length === 0) continue

      await tx.bookingDate.create({
        data: {
          bookingId: booking.id,
          operatingDayId: opDay[0].id,
          tourDate: new Date(date),
          seatsReserved: args.numGuests,
        },
      })

      await tx.$executeRaw`
        UPDATE tt_operating_days
        SET seats_held = seats_held + ${args.numGuests}
        WHERE id = ${opDay[0].id}
      `
    }

    // Increment promo uses atomically
    if (promoCodeUsed) {
      await tx.$executeRaw`
        UPDATE tt_promo_codes SET uses_count = uses_count + 1 WHERE code = ${promoCodeUsed}
      `
    }

    return { success: true, bookingId: booking.id }
  })

  if (!result.success) {
    return {
      success: false,
      error: result.unavailableDates
        ? 'Some selected dates are no longer available.'
        : result.error ?? 'Booking failed. Please try again.',
      unavailableDates: result.unavailableDates,
    }
  }

  return {
    success: true,
    bookingId: result.bookingId,
    bookingRef,
    holdExpiresAt: holdExpiresAt.toISOString(),
    baseAmount,
    promoDiscount,
    finalAmount,
  }
}

// ── CONFIRM (after successful ANZ payment) ────────────────────────────────────

export async function confirmBooking(
  bookingId: number,
  egateOrderId: string,
  egateTxnRef: string,
): Promise<boolean> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { bookingDates: true },
  })

  if (!booking || booking.status !== 'pending_payment') return false;

  // Atomic conditional update: guards against concurrent callers (client poll, cron sweep,
  // and the ANZ webhook can all race to confirm the same booking) double-promoting seats
  // or sending duplicate confirmation emails.
  const updated = await prisma.booking.updateMany({
    where: { id: bookingId, status: 'pending_payment' },
    data: {
      status: 'confirmed',
      egateOrderId,
      egateTxnRef,
      confirmedAt: new Date(),
      holdExpiresAt: null,
    },
  })
  if (updated.count === 0) return false

  await prisma.$transaction(async (tx) => {
    // Promote seats_held → seats_booked
    for (const bd of booking.bookingDates) {
      await tx.$executeRaw`
        UPDATE tt_operating_days
        SET
          seats_held   = GREATEST(0, seats_held - ${booking.numGuests}),
          seats_booked = seats_booked + ${booking.numGuests}
        WHERE id = ${bd.operatingDayId}
      `
    }
  });

  // Send confirmation emails (background — non-blocking)
  (async () => {
    try {
      const dates = booking.bookingDates.map((bd) => bd.tourDate.toISOString().slice(0, 10))
      await sendBookingConfirmation({ booking, dates })
      await sendOperatorBookingAlert({ booking, dates })
    } catch (err) {
      console.error('[booking] Non-critical error sending confirmation emails:', err)
    }
  })()

  return true
}

// ── RELEASE HOLD (expired or payment failed) ──────────────────────────────────

export async function releaseHold(bookingId: number, reason = 'expired'): Promise<boolean> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { bookingDates: true },
  })

  if (!booking || booking.status !== 'pending_payment') return false

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled', cancelReason: reason },
    })

    for (const bd of booking.bookingDates) {
      await tx.$executeRaw`
        UPDATE tt_operating_days
        SET seats_held = GREATEST(0, seats_held - ${booking.numGuests})
        WHERE id = ${bd.operatingDayId}
      `
    }
  })

  return true
}

// ── CANCEL CONFIRMED (admin-initiated) ────────────────────────────────────────

export async function cancelConfirmed(
  bookingId: number,
  reason: string,
  refundMethod: 'egate' | 'manual' | 'none',
): Promise<{ success: boolean; refundAmount?: number; error?: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { bookingDates: true },
  })

  if (!booking || booking.status !== 'confirmed') {
    return { success: false, error: 'Booking not found or not in confirmed state.' }
  }

  const sortedDates = booking.bookingDates
    .map((bd) => bd.tourDate.toISOString().slice(0, 10))
    .sort()
  const firstDate = sortedDates[0]

  const refundAmount =
    refundMethod !== 'none' && firstDate
      ? await calculateRefund(Number(booking.amountTop), firstDate)
      : 0

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelReason: reason,
        refundAmountTop: refundAmount > 0 ? refundAmount : null,
      },
    })

    for (const bd of booking.bookingDates) {
      await tx.$executeRaw`
        UPDATE tt_operating_days
        SET seats_booked = GREATEST(0, seats_booked - ${booking.numGuests})
        WHERE id = ${bd.operatingDayId}
      `
    }
  })

  // Process eGate refund
  if (refundMethod === 'egate' && refundAmount > 0 && booking.egateOrderId) {
    await processEgateRefund(bookingId, booking.egateOrderId, refundAmount)
  }

  // Send refund email
  if (refundMethod !== 'none' && refundAmount > 0) {
    await sendRefundConfirmation({ booking, refundAmount, method: refundMethod })
  }

  return { success: true, refundAmount }
}

// ── CREATE MANUAL BOOKING (admin-initiated) ───────────────────────────────────

export async function createManualBooking(args: {
  tourId: string
  dates: string[]
  numGuests: number
  guestName: string
  guestEmail: string
  guestPhone?: string
  specialRequests?: string
  amountTop: number
  assignedVessel?: string
}): Promise<{ success: boolean; bookingId?: number; error?: string }> {
  const bookingRef = await generateRef()

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          reference: bookingRef,
          tourId: args.tourId,
          bookingType: 'manual',
          guestName: args.guestName.trim(),
          guestEmail: args.guestEmail.toLowerCase().trim(),
          guestPhone: args.guestPhone?.trim() ?? null,
          numGuests: args.numGuests,
          amountTop: args.amountTop,
          status: 'confirmed',
          confirmedAt: new Date(),
          specialRequests: args.specialRequests?.trim() ?? null,
          assignedVessel: args.assignedVessel ?? null,
        },
      })

      for (const date of args.dates) {
        const dateObj = new Date(date)
        const opDay = await tx.operatingDay.findUnique({
          where: { operatingDate: dateObj }
        })
        let opDayId: number
        
        if (!opDay) {
          const newOp = await tx.operatingDay.create({
            data: { 
              operatingDate: dateObj, 
              totalSeats: 16, 
              seatsBooked: args.numGuests 
            }
          })
          opDayId = newOp.id
        } else {
          opDayId = opDay.id
          await tx.operatingDay.update({
            where: { id: opDayId },
            data: { seatsBooked: { increment: args.numGuests } }
          })
        }

        await tx.bookingDate.create({
          data: {
            bookingId: booking.id,
            operatingDayId: opDayId,
            tourDate: dateObj,
            seatsReserved: args.numGuests,
          },
        })
      }

      return booking
    })

    const dates = args.dates.sort()
    const bookingFull = await prisma.booking.findUnique({
      where: { id: result.id },
    })

    if (bookingFull) {
      (async () => {
        try {
          await sendBookingConfirmation({ booking: bookingFull, dates })
          await sendOperatorBookingAlert({ booking: bookingFull, dates })
        } catch (err) {
          console.error('[booking] Non-critical error sending manual confirmation emails:', err)
        }
      })()
    }

    return { success: true, bookingId: result.id }
  } catch (err: any) {
    console.error('[createManualBooking] Error:', err)
    return { success: false, error: err.message || 'Failed to create manual booking.' }
  }
}

// ── GET helpers ───────────────────────────────────────────────────────────────

export async function getBooking(id: number): Promise<BookingWithDates | null> {
  return prisma.booking.findUnique({
    where: { id },
    include: { bookingDates: { orderBy: { tourDate: 'asc' } } },
  })
}

export async function getBookingByRef(ref: string): Promise<BookingWithDates | null> {
  return prisma.booking.findUnique({
    where: { reference: ref },
    include: { bookingDates: { orderBy: { tourDate: 'asc' } } },
  })
}

export async function getBookingByEgateOrder(orderId: string): Promise<BookingWithDates | null> {
  return prisma.booking.findUnique({
    where: { egateOrderId: orderId },
    include: { bookingDates: { orderBy: { tourDate: 'asc' } } },
  })
}

/**
 * lib/booking.ts
 * Core booking logic: atomic multi-date seat hold, confirmation, release, and cancellation.
 * Uses raw SQL with SELECT FOR UPDATE inside Prisma transactions for race-safe reservations.
 */
import { prisma } from './db'
import { validatePromo, incrementPromoUses } from './promo'
import { sendBookingConfirmation, sendOperatorBookingAlert, sendRefundConfirmation } from './mailer'
import { processEgateRefund } from './egate'
import type { Booking, BookingDate } from '@prisma/client'

// ── Tour configuration ────────────────────────────────────────────────────────

export const TOUR_DATE_COUNTS: Record<string, number> = {
  whale_day_trip: 1,
  whale_3day: 3,
  whale_5day: 5,
  island_reef: 1,
}

// Base prices per person in TOP
export const TOUR_PRICES: Record<string, number> = {
  whale_day_trip: 250,
  whale_3day: 1850,  // per person for all 3 days
  whale_5day: 1100,  // per person for all 5 days
}

// Outer Reef volume-tiered pricing
const REEF_PRICE_SMALL = 400  // 1–4 guests
const REEF_PRICE_LARGE = 320  // 5+ guests

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

export function calculateBasePrice(tourId: string, numGuests: number): number {
  if (tourId === 'island_reef') {
    const ppp = numGuests >= 5 ? REEF_PRICE_LARGE : REEF_PRICE_SMALL
    return ppp * numGuests
  }
  const ppp = TOUR_PRICES[tourId] ?? 0
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

export async function placeHold(args: PlaceHoldArgs): Promise<PlaceHoldResult> {
  // Validate tour type
  if (!TOUR_DATE_COUNTS[args.tourId]) {
    return { success: false, error: 'Invalid tour type.' }
  }

  // Validate date count
  const required = TOUR_DATE_COUNTS[args.tourId]
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

  // Calculate pricing
  const baseAmount = calculateBasePrice(args.tourId, args.numGuests)
  let promoDiscount = 0
  let promoCodeUsed = ''

  if (args.promoCode) {
    const promo = await validatePromo(args.promoCode, args.tourId, dates)
    if (!promo.valid) {
      return { success: false, error: promo.error }
    }
    promoDiscount = promo.discount!
    promoCodeUsed = promo.code!
  }

  const finalAmount = Math.max(0, baseAmount - promoDiscount)
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

  if (!booking || booking.status !== 'pending_payment') return false

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'confirmed',
        egateOrderId,
        egateTxnRef,
        confirmedAt: new Date(),
        holdExpiresAt: null,
      },
    })

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
  })

  // Send confirmation emails (outside transaction — non-critical)
  const dates = booking.bookingDates.map((bd) => bd.tourDate.toISOString().slice(0, 10))
  await sendBookingConfirmation({ booking, dates })
  await sendOperatorBookingAlert({ booking, dates })

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

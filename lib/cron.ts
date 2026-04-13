/**
 * lib/cron.ts
 * Two scheduled jobs:
 *   1. releaseExpiredHolds() — runs every 5 min.
 *      Finds pending_payment bookings past hold_expires_at, releases seats.
 *   2. checkReefMinimumPax() — runs daily at 5pm Tonga time (UTC+13).
 *      Checks next-day Outer Reef dates. Notifies operator if < 4 confirmed seats.
 */
import { prisma } from './db'
import { releaseHold } from './booking'
import { sendReefMinPaxWarning } from './mailer'

// ── 1. Release expired holds ──────────────────────────────────────────────────

export async function releaseExpiredHolds(): Promise<number> {
  const now = new Date()

  const expired = await prisma.booking.findMany({
    where: {
      status: 'pending_payment',
      holdExpiresAt: { lte: now },
    },
    select: { id: true },
  })

  let released = 0
  for (const { id } of expired) {
    const ok = await releaseHold(id, 'hold_expired')
    if (ok) released++
  }

  if (released > 0) {
    console.log(`[cron] Released ${released} expired hold(s)`)
  }

  return released
}

// ── 2. Check Outer Reef minimum pax ──────────────────────────────────────────

export async function checkReefMinimumPax(): Promise<void> {
  // Target date = tomorrow (Tonga is UTC+13)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  // Find confirmed island_reef bookings for tomorrow
  const bookingDates = await prisma.bookingDate.findMany({
    where: {
      tourDate: new Date(tomorrowStr),
      booking: {
        tourId: 'island_reef',
        status: 'confirmed',
      },
    },
    include: { booking: { select: { numGuests: true } } },
  })

  const totalSeats = bookingDates.reduce((sum, bd) => sum + bd.seatsReserved, 0)

  if (totalSeats > 0 && totalSeats < 4) {
    console.log(`[cron] Outer Reef min pax NOT met for ${tomorrowStr}: ${totalSeats} seat(s)`)
    await sendReefMinPaxWarning(tomorrowStr, totalSeats)
  } else if (totalSeats === 0) {
    // No bookings — nothing to warn about
  } else {
    console.log(`[cron] Outer Reef min pax met for ${tomorrowStr}: ${totalSeats} seat(s) ✓`)
  }
}

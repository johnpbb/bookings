import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/db'
import { releaseExpiredHolds } from '@/lib/booking'
import { OFFSEASON_CALENDARS } from '@/lib/offseason'

const CALENDAR_IDS: string[] = OFFSEASON_CALENDARS.map((c) => c.id)
const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

// GET /api/admin/offseason?month=2026-12 — one month, grouped by date
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const month = new URL(req.url).searchParams.get('month') ?? ''
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month.' }, { status: 400 })
  }
  const [y, m] = month.split('-').map(Number)

  await releaseExpiredHolds()
  const rows = await prisma.operatingDay.findMany({
    where: {
      calendar: { in: CALENDAR_IDS },
      operatingDate: { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) },
    },
    orderBy: { operatingDate: 'asc' },
    include: {
      bookingDates: {
        where: { booking: { status: { in: ['confirmed', 'pending_payment'] } } },
        include: { booking: { select: { reference: true, guestName: true, numGuests: true, status: true } } },
      },
    },
  })

  const byDate = new Map<string, Record<string, unknown>>()
  for (const row of rows) {
    const date = row.operatingDate.toISOString().slice(0, 10)
    const day = byDate.get(date) ?? { date }
    day[row.calendar] = {
      blocked: row.isFullyBlocked,
      total: row.totalSeats,
      held: row.seatsHeld,
      booked: row.seatsBooked,
      bookings: row.bookingDates.map((bd) => bd.booking),
    }
    byDate.set(date, day)
  }

  return NextResponse.json([...byDate.values()])
}

// POST /api/admin/offseason — block or open a range of dates for one or more trips
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { calendars, from, to, weekdays, blocked } = (await req.json()) as {
    calendars: string[]
    from: string
    to: string
    weekdays: number[]
    blocked: boolean
  }

  if (
    !Array.isArray(calendars) || calendars.length === 0 || calendars.some((c) => !CALENDAR_IDS.includes(c)) ||
    !isDate(from) || !isDate(to) || from > to ||
    !Array.isArray(weekdays) || weekdays.length === 0
  ) {
    return NextResponse.json({ error: 'Please choose a boat, a date range and at least one day of the week.' }, { status: 400 })
  }

  const rows = await prisma.operatingDay.findMany({
    where: { calendar: { in: calendars }, operatingDate: { gte: new Date(from), lte: new Date(to) } },
  })
  const matching = rows.filter((r) => weekdays.includes(r.operatingDate.getUTCDay()))

  await prisma.operatingDay.updateMany({
    where: { id: { in: matching.map((r) => r.id) } },
    data: { isFullyBlocked: Boolean(blocked) },
  })

  return NextResponse.json({
    updated: matching.length,
    // Blocking stops new bookings only; staff need to know about guests already on those dates.
    withBookings: blocked ? matching.filter((r) => r.seatsBooked + r.seatsHeld > 0).length : 0,
  })
}

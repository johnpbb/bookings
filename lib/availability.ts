/**
 * lib/availability.ts
 * Seat availability queries for the public calendar and booking form.
 */
import { prisma } from './db'

export interface DayAvailability {
  available: string[]  // dates with seats free (>4 seats remaining)
  partial: string[]    // dates with 1–4 seats remaining
  unavailable: string[] // fully booked or blocked
}

// ── Month availability (public calendar) ──────────────────────────────────────

export async function getMonthAvailability(
  month: number,
  year: number,
): Promise<DayAvailability> {
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0) // last day of month

  const rows = await prisma.operatingDay.findMany({
    where: {
      operatingDate: { gte: from, lte: to },
    },
    orderBy: { operatingDate: 'asc' },
  })

  return classifyRows(rows)
}

// ── Upcoming availability (Flatpickr disable list) ────────────────────────────

export async function getUpcomingAvailability(days = 365): Promise<DayAvailability> {
  const from = new Date()
  const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const rows = await prisma.operatingDay.findMany({
    where: {
      operatingDate: { gte: from, lte: to },
    },
    orderBy: { operatingDate: 'asc' },
  })

  return classifyRows(rows)
}

// ── Seats remaining for a single date ─────────────────────────────────────────

export async function getSeatsRemaining(date: string): Promise<number> {
  const row = await prisma.operatingDay.findUnique({
    where: { operatingDate: new Date(date) },
  })

  if (!row || row.isFullyBlocked) return 0
  return Math.max(0, row.totalSeats - row.seatsHeld - row.seatsBooked)
}

// ── Minimum seats across an array of dates ────────────────────────────────────
// Used to cap the num_guests selector: guest count can't exceed the most
// constrained date in their selection.

export async function getMinSeatsAcrossDates(dates: string[]): Promise<number> {
  if (dates.length === 0) return 0

  const rows = await prisma.operatingDay.findMany({
    where: {
      operatingDate: { in: dates.map((d) => new Date(d)) },
    },
  })

  if (rows.length === 0) return 0

  let min = Infinity
  for (const row of rows) {
    if (row.isFullyBlocked) return 0
    const free = row.totalSeats - row.seatsHeld - row.seatsBooked
    if (free < min) min = free
  }

  return min === Infinity ? 0 : Math.max(0, min)
}

// ── Admin range query ─────────────────────────────────────────────────────────

export async function getAdminRange(from: string, to: string) {
  return prisma.operatingDay.findMany({
    where: {
      operatingDate: { gte: new Date(from), lte: new Date(to) },
    },
    orderBy: { operatingDate: 'asc' },
  })
}

// ── Classify helper ───────────────────────────────────────────────────────────

type OperatingDayRow = {
  operatingDate: Date
  totalSeats: number
  seatsHeld: number
  seatsBooked: number
  isFullyBlocked: boolean
}

function classifyRows(rows: OperatingDayRow[]): DayAvailability {
  const available: string[] = []
  const partial: string[] = []
  const unavailable: string[] = []

  for (const row of rows) {
    const d = row.operatingDate.toISOString().slice(0, 10)
    if (row.isFullyBlocked) {
      unavailable.push(d)
      continue
    }
    const free = row.totalSeats - row.seatsHeld - row.seatsBooked
    if (free <= 0)      unavailable.push(d)
    else if (free <= 4) partial.push(d)
    else                available.push(d)
  }

  return { available, partial, unavailable }
}

// ── Bulk generate operating days (admin) ──────────────────────────────────────
// Creates Mon–Sat entries for a full whale season, skipping Sundays and
// any dates in the excluded list. Idempotent (upsert).

export async function bulkGenerateSeasonDays(
  seasonStart: string,
  seasonEnd: string,
  excludedDates: string[],
): Promise<number> {
  const excluded = new Set(excludedDates)
  const current = new Date(seasonStart)
  const end = new Date(seasonEnd)
  let created = 0

  while (current <= end) {
    const dayOfWeek = current.getDay() // 0 = Sunday
    const dateStr = current.toISOString().slice(0, 10)

    if (dayOfWeek !== 0 && !excluded.has(dateStr)) {
      await prisma.operatingDay.upsert({
        where: { operatingDate: new Date(dateStr) },
        update: {},
        create: {
          operatingDate: new Date(dateStr),
          totalSeats: 16,
        },
      })
      created++
    }

    current.setDate(current.getDate() + 1)
  }

  return created
}

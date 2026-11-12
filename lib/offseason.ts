/**
 * lib/offseason.ts
 * Rules for the island and game fishing trips. Each trip has its own calendar, kept apart
 * from the whale season calendar. Pure helpers only, so it is safe to import from client components.
 */

export type CalendarId = 'whale' | 'reef' | 'charter_island' | 'charter_fishing'
export type BoatId = 'whale' | 'boat_one' | 'boat_two'

export interface OffseasonTripRule {
  calendar: CalendarId
  boat: BoatId
  /** One booking takes the whole trip, however many guests are coming. */
  wholeBoat: boolean
  capacity: number
  /** Planned departure, Tonga time, 24-hour clock. */
  departureHour: number
  /** Online bookings close this many hours before departure. */
  noticeHours: number
  emailTitle: string
}

export const OFFSEASON_TRIPS: Record<string, OffseasonTripRule> = {
  island_reef: {
    calendar: 'reef', boat: 'boat_one', wholeBoat: false, capacity: 10,
    departureHour: 10, noticeHours: 0,
    emailTitle: 'Reef & Outer Island Adventure',
  },
  island_charter: {
    calendar: 'charter_island', boat: 'boat_two', wholeBoat: true, capacity: 10,
    departureHour: 10, noticeHours: 24,
    emailTitle: 'Your Private Charter - Reef & Outer Island Adventure',
  },
  game_fishing: {
    calendar: 'charter_fishing', boat: 'boat_two', wholeBoat: true, capacity: 4,
    departureHour: 6, noticeHours: 24,
    emailTitle: 'Game Fishing Charter',
  },
}

export const OFFSEASON_CALENDARS: { id: CalendarId; boat: BoatId; label: string }[] = [
  { id: 'reef', boat: 'boat_one', label: 'Reef & Outer Island Adventure' },
  { id: 'charter_island', boat: 'boat_two', label: 'Private Charter' },
  { id: 'charter_fishing', boat: 'boat_two', label: 'Game Fishing Charter' },
]

export const BOAT_LABELS: Record<BoatId, string> = {
  whale: 'Whale season',
  boat_one: 'Boat One',
  boat_two: 'Boat Two',
}

export function offseasonRule(tourId: string): OffseasonTripRule | null {
  return Object.prototype.hasOwnProperty.call(OFFSEASON_TRIPS, tourId) ? OFFSEASON_TRIPS[tourId] : null
}

export function calendarForTour(tourId: string): CalendarId {
  return offseasonRule(tourId)?.calendar ?? 'whale'
}

export function boatForTour(tourId: string): BoatId {
  return offseasonRule(tourId)?.boat ?? 'whale'
}

/** Whole-boat trips take every seat on their calendar; everything else takes one seat per guest. */
export function seatsToReserve(tourId: string, numGuests: number): number {
  const rule = offseasonRule(tourId)
  return rule?.wholeBoat ? rule.capacity : numGuests
}

/** Departure as a timestamp. Tonga is UTC+13 all year. */
export function departureTime(date: string, rule: OffseasonTripRule): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d, rule.departureHour - 13)
}

export function hasDeparted(date: string, rule: OffseasonTripRule, now = Date.now()): boolean {
  return departureTime(date, rule) <= now
}

export function meetsNotice(date: string, rule: OffseasonTripRule, now = Date.now()): boolean {
  return departureTime(date, rule) - now > rule.noticeHours * 60 * 60 * 1000
}

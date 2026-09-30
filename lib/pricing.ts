// Pure pricing helpers, shared by the booking form (client) and lib/booking.ts (server).
// Keep this file free of server-only imports (prisma etc.) so it can be bundled for the browser.

export interface SeasonPrice {
  label: string
  start: string // YYYY-MM-DD, inclusive
  end: string   // YYYY-MM-DD, inclusive
  pricePerPerson: number
}

interface PricedTour {
  id: string
  pricePerPerson: number | null
  reefPriceSmall?: number
  reefPriceLarge?: number
  seasonPrices?: SeasonPrice[]
}

// YYYY-MM-DD strings compare correctly as plain strings.
export function findSeasonPrice(tour: PricedTour, dates: string[]): SeasonPrice | null {
  const first = [...dates].sort()[0]
  if (!first || !tour.seasonPrices?.length) return null
  return tour.seasonPrices.find(s => first >= s.start && first <= s.end) ?? null
}

// Price per person for the given dates. Multi-day packages are priced by their first date.
// Falls back to the package's flat pricePerPerson when no season matches (or no dates yet).
export function resolvePricePerPerson(tour: PricedTour, dates: string[]): number {
  return findSeasonPrice(tour, dates)?.pricePerPerson ?? tour.pricePerPerson ?? 0
}

export function calcBasePrice(tour: PricedTour, numGuests: number, dates: string[]): number {
  if (tour.id === 'island_reef') {
    const ppp = numGuests >= 5 ? (tour.reefPriceLarge || 320) : (tour.reefPriceSmall || 400)
    return ppp * numGuests
  }
  return resolvePricePerPerson(tour, dates) * numGuests
}

// Lowest tier price (or flat price), for "from TOP X" display before dates are chosen.
export function lowestPricePerPerson(tour: PricedTour): number {
  const prices = [tour.pricePerPerson, ...(tour.seasonPrices ?? []).map(s => s.pricePerPerson)]
    .filter((p): p is number => typeof p === 'number' && p > 0)
  return prices.length ? Math.min(...prices) : 0
}

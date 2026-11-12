import { prisma } from './db'
import type { SeasonPrice } from './pricing'

export type TourType = 'book' | 'enquiry'

// Base type used across the app
export interface OnlineTour {
  id: string
  name: string
  emoji: string
  image?: string | null
  tagline: string
  desc: string
  priceLabel: string
  perNote: string
  badge: string | null
  type: 'book'
  isActive: boolean

  // Specific internal configuration for logic
  dateCount: number
  pricePerPerson: number | null
  // Date-range price tiers (e.g. Jul/Oct vs Aug/Sep). pricePerPerson is the fallback (2026 pricing).
  seasonPrices?: SeasonPrice[]
  reefPriceSmall?: number
  reefPriceLarge?: number
  charterPrice?: number
}

export interface EnquiryTour {
  id: string
  name: string
  emoji: string
  image?: string | null
  tagline: string
  desc: string
  type: 'enquiry'
  isActive: boolean
}

export const DEFAULT_ONLINE_TOURS: OnlineTour[] = [
  {
    id: 'whale_day_trip',
    name: 'Ultimate Day Trip',
    emoji: '🐋',
    tagline: 'Swim with humpback whales',
    desc: 'A full day in the water with humpback whales. This is the experience that brings guests back year after year.',
    priceLabel: 'TOP$ 650',
    perNote: 'per person',
    badge: 'Most popular',
    type: 'book',
    isActive: true,
    dateCount: 1,
    pricePerPerson: 650,
    seasonPrices: [
      { label: 'Fringe season', start: '2027-07-01', end: '2027-07-31', pricePerPerson: 650 },
      { label: 'Peak season', start: '2027-08-01', end: '2027-09-30', pricePerPerson: 700 },
      { label: 'Fringe season', start: '2027-10-01', end: '2027-10-31', pricePerPerson: 650 },
    ],
  },
  {
    id: 'whale_3day',
    name: '3-Day Special',
    emoji: '🌊',
    tagline: 'Three days, your own chosen dates',
    desc: 'Choose any 3 operating days across the season. More time in the water means a much higher chance of meaningful encounters.',
    priceLabel: 'TOP$ 1,850',
    perNote: 'per person (all 3 days)',
    badge: null,
    type: 'book',
    isActive: true,
    dateCount: 3,
    pricePerPerson: 1850,
    seasonPrices: [
      { label: 'Fringe season', start: '2027-07-01', end: '2027-07-31', pricePerPerson: 1850 },
      { label: 'Peak season', start: '2027-08-01', end: '2027-09-30', pricePerPerson: 2000 },
      { label: 'Fringe season', start: '2027-10-01', end: '2027-10-31', pricePerPerson: 1850 },
    ],
  },
  {
    id: 'whale_5day',
    name: '5-Day Special',
    emoji: '🏝️',
    tagline: 'The ultimate whale season immersion',
    desc: 'Five full days on the water, on dates you choose. The best way to truly experience Tonga\'s humpback season.',
    priceLabel: 'TOP$ 1,100',
    perNote: 'per person (all 5 days)',
    badge: 'Best value',
    type: 'book',
    isActive: true,
    dateCount: 5,
    pricePerPerson: 1100,
    seasonPrices: [
      { label: 'Fringe season', start: '2027-07-01', end: '2027-07-31', pricePerPerson: 3000 },
      { label: 'Peak season', start: '2027-08-01', end: '2027-09-30', pricePerPerson: 3250 },
      { label: 'Fringe season', start: '2027-10-01', end: '2027-10-31', pricePerPerson: 3000 },
    ],
  },
  {
    id: 'island_reef',
    name: 'Reef & Outer Island Adventure',
    emoji: '🪸',
    tagline: 'Uninhabited island · Snorkel · Lunch',
    desc: 'Discover a pristine outer reef island, snorkel crystal-clear waters, and enjoy a locally sourced light lunch. Volume discounts apply.',
    priceLabel: 'TOP$ 400',
    perNote: 'per person (5+ guests: TOP$ 320pp)',
    badge: null,
    type: 'book',
    isActive: true,
    dateCount: 1,
    pricePerPerson: null,
    reefPriceSmall: 400,
    reefPriceLarge: 320,
  },
  {
    id: 'island_charter',
    name: 'Reef & Outer Island Adventure - Private Charter',
    emoji: '🌴',
    tagline: 'Private 5-hour island experience',
    desc: 'The whole boat for your group, up to 10 people, with snorkelling, lunch and a picture-perfect outer reef island.',
    priceLabel: 'TOP$ 2,500',
    perNote: 'whole boat, up to 10 people',
    badge: null,
    type: 'book',
    isActive: true,
    dateCount: 1,
    pricePerPerson: null,
    charterPrice: 2500,
  },
  {
    id: 'game_fishing',
    name: 'Game Fishing Charter',
    emoji: '🎣',
    tagline: 'Head out wide for 4 hours of fishing',
    desc: 'The whole boat for 4 hours from 6am, all gear supplied. Best for up to 4 people.',
    priceLabel: 'TOP$ 1,700',
    perNote: 'whole boat, best for up to 4 people',
    badge: null,
    type: 'book',
    isActive: true,
    dateCount: 1,
    pricePerPerson: null,
    charterPrice: 1700,
  },
]

export const DEFAULT_ENQUIRY_TOURS: EnquiryTour[] = [
  {
    id: 'whale_charter',
    name: 'Whale Watch Charter',
    emoji: '⚓',
    tagline: 'Exclusive vessel for your group',
    desc: 'Charter an entire whale watch vessel for your group. Up to 8 swimmers + 2 watchers. Pricing on application.',
    type: 'enquiry',
    isActive: true,
  },
]

const OFFSEASON_UPGRADE_KEY = 'offseason_tours_upgraded'
const NOW_BOOKABLE = ['island_charter', 'game_fishing']

// Saved package lists predate online charters. Runs once, so staff can still move a
// charter back to enquiry-only on the Packages screen afterwards.
function upgradeSavedTours(online: OnlineTour[], enquiry: EnquiryTour[]) {
  const nextOnline = online.map((t) =>
    t.id === 'island_reef' && t.name === 'Outer Reef Excursion' ? { ...t, name: 'Reef & Outer Island Adventure' } : t,
  )
  for (const id of NOW_BOOKABLE) {
    if (nextOnline.some((t) => t.id === id)) continue
    const preset = DEFAULT_ONLINE_TOURS.find((t) => t.id === id)!
    const saved = enquiry.find((t) => t.id === id)
    nextOnline.push({ ...preset, image: saved?.image ?? preset.image, isActive: saved?.isActive ?? true })
  }
  return { online: nextOnline, enquiry: enquiry.filter((t) => !NOW_BOOKABLE.includes(t.id)) }
}

export async function getToursConfig(): Promise<{ online: OnlineTour[]; enquiry: EnquiryTour[] }> {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['online_tours_config', 'enquiry_tours_config', OFFSEASON_UPGRADE_KEY] } },
    })
    const raw = (key: string) => rows.find((r) => r.key === key)?.value
    const s1 = raw('online_tours_config')
    const s2 = raw('enquiry_tours_config')

    const online: OnlineTour[] = s1 ? JSON.parse(s1) : DEFAULT_ONLINE_TOURS
    const enquiry: EnquiryTour[] = s2 ? JSON.parse(s2) : DEFAULT_ENQUIRY_TOURS

    if ((s1 || s2) && !raw(OFFSEASON_UPGRADE_KEY)) {
      const upgraded = upgradeSavedTours(online, enquiry)
      const save = (key: string, value: string) =>
        prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
      await prisma.$transaction([
        save('online_tours_config', JSON.stringify(upgraded.online)),
        save('enquiry_tours_config', JSON.stringify(upgraded.enquiry)),
        save(OFFSEASON_UPGRADE_KEY, 'true'),
      ])
      return upgraded
    }

    return { online, enquiry }
  } catch (err) {
    console.error('Failed to parse tours config, returning defaults:', err)
    return { online: DEFAULT_ONLINE_TOURS, enquiry: DEFAULT_ENQUIRY_TOURS }
  }
}

export async function getOnlineTour(tourId: string): Promise<OnlineTour | null> {
  const { online } = await getToursConfig()
  return online.find(t => t.id === tourId && t.isActive) || null
}

export async function getEnquiryTour(tourId: string): Promise<EnquiryTour | null> {
  const { enquiry } = await getToursConfig()
  return enquiry.find(t => t.id === tourId && t.isActive) || null
}

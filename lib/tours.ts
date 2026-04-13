import { prisma } from './db'

export type TourType = 'book' | 'enquiry'

// Base type used across the app
export interface OnlineTour {
  id: string
  name: string
  emoji: string
  tagline: string
  desc: string
  priceLabel: string
  perNote: string
  highlights: string[]
  badge: string | null
  type: 'book'
  isActive: boolean
  
  // Specific internal configuration for logic
  dateCount: number
  pricePerPerson: number | null
  reefPriceSmall?: number
  reefPriceLarge?: number
}

export interface EnquiryTour {
  id: string
  name: string
  emoji: string
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
    priceLabel: 'TOP$ 250',
    perNote: 'per person',
    highlights: ['Full day on the water', 'In-water whale encounters', 'Professional guides', 'All snorkelling gear'],
    badge: 'Most popular',
    type: 'book',
    isActive: true,
    dateCount: 1,
    pricePerPerson: 250,
  },
  {
    id: 'whale_3day',
    name: '3-Day Special',
    emoji: '🌊',
    tagline: 'Three days, your own chosen dates',
    desc: 'Choose any 3 operating days across the season. More time in the water means a much higher chance of meaningful encounters.',
    priceLabel: 'TOP$ 1,850',
    perNote: 'per person (all 3 days)',
    highlights: ['3 non-consecutive days', 'Priority seat selection', 'Promo codes accepted', 'Fringe season discount available'],
    badge: null,
    type: 'book',
    isActive: true,
    dateCount: 3,
    pricePerPerson: 1850,
  },
  {
    id: 'whale_5day',
    name: '5-Day Special',
    emoji: '🏝️',
    tagline: 'The ultimate whale season immersion',
    desc: 'Five full days on the water, on dates you choose. The best way to truly experience Tonga\'s humpback season.',
    priceLabel: 'TOP$ 1,100',
    perNote: 'per person (all 5 days)',
    highlights: ['5 non-consecutive days', 'Maximum encounter time', 'Best value per day', 'Small group experience'],
    badge: 'Best value',
    type: 'book',
    isActive: true,
    dateCount: 5,
    pricePerPerson: 1100,
  },
  {
    id: 'island_reef',
    name: 'Outer Reef Excursion',
    emoji: '🪸',
    tagline: 'Uninhabited island · Snorkel · Lunch',
    desc: 'Discover a pristine outer reef island, snorkel crystal-clear waters, and enjoy a locally sourced light lunch. Volume discounts apply.',
    priceLabel: 'TOP$ 400',
    perNote: 'per person (5+ guests: TOP$ 320pp)',
    highlights: ['5-hour excursion', 'Gear supplied', 'Light lunch included', 'Minimum 4 guests'],
    badge: null,
    type: 'book',
    isActive: true,
    dateCount: 1,
    pricePerPerson: null,
    reefPriceSmall: 400,
    reefPriceLarge: 320,
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
  {
    id: 'island_charter',
    name: 'Island Exclusive Charter',
    emoji: '🌴',
    tagline: 'Private 5-hour island experience',
    desc: 'Exclusive charter for up to 10 people. TOP$ 2,400 includes snorkelling, lunch, and a picture-perfect outer reef island.',
    type: 'enquiry',
    isActive: true,
  },
  {
    id: 'game_fishing',
    name: 'Game Fishing Charter',
    emoji: '🎣',
    tagline: 'Head out wide for 4 hours of fishing',
    desc: 'Up to 4 people. TOP$ 1,600. All gear supplied. Can sometimes arrange shared bookings — ask in your enquiry.',
    type: 'enquiry',
    isActive: true,
  },
]

export async function getToursConfig(): Promise<{ online: OnlineTour[]; enquiry: EnquiryTour[] }> {
  try {
    const s1 = await prisma.setting.findUnique({ where: { key: 'online_tours_config' } })
    const s2 = await prisma.setting.findUnique({ where: { key: 'enquiry_tours_config' } })

    const online = s1?.value ? JSON.parse(s1.value) : DEFAULT_ONLINE_TOURS
    const enquiry = s2?.value ? JSON.parse(s2.value) : DEFAULT_ENQUIRY_TOURS

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

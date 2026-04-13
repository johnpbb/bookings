import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Book a Tour — Tahi Tonga',
  description:
    'Choose from Tahi Tonga\'s whale watching, outer reef, and island charter experiences in Vavaʻu, Tonga. Real-time online booking available.',
}

const BOOKING_TOURS = [
  {
    id: 'whale_day_trip',
    name: 'Ultimate Day Trip',
    emoji: '🐋',
    tagline: 'Swim with humpback whales',
    desc: 'A full day in the water with humpback whales. This is the experience that brings guests back year after year.',
    price: 'TOP$ 250',
    perNote: 'per person',
    highlights: ['Full day on the water', 'In-water whale encounters', 'Professional guides', 'All snorkelling gear'],
    badge: 'Most popular',
    type: 'book',
  },
  {
    id: 'whale_3day',
    name: '3-Day Special',
    emoji: '🌊',
    tagline: 'Three days, your own chosen dates',
    desc: 'Choose any 3 operating days across the season. More time in the water means a much higher chance of meaningful encounters.',
    price: 'TOP$ 1,850',
    perNote: 'per person (all 3 days)',
    highlights: ['3 non-consecutive days', 'Priority seat selection', 'Promo codes accepted', 'Fringe season discount available'],
    badge: null,
    type: 'book',
  },
  {
    id: 'whale_5day',
    name: '5-Day Special',
    emoji: '🏝️',
    tagline: 'The ultimate whale season immersion',
    desc: 'Five full days on the water, on dates you choose. The best way to truly experience Tonga\'s humpback season.',
    price: 'TOP$ 1,100',
    perNote: 'per person (all 5 days)',
    highlights: ['5 non-consecutive days', 'Maximum encounter time', 'Best value per day', 'Small group experience'],
    badge: 'Best value',
    type: 'book',
  },
  {
    id: 'island_reef',
    name: 'Outer Reef Excursion',
    emoji: '🪸',
    tagline: 'Uninhabited island · Snorkel · Lunch',
    desc: 'Discover a pristine outer reef island, snorkel crystal-clear waters, and enjoy a locally sourced light lunch. Volume discounts apply.',
    price: 'TOP$ 400',
    perNote: 'per person (5+ guests: TOP$ 320pp)',
    highlights: ['5-hour excursion', 'Gear supplied', 'Light lunch included', 'Minimum 4 guests'],
    badge: null,
    type: 'book',
  },
]

const ENQUIRY_TOURS = [
  {
    id: 'whale_charter',
    name: 'Whale Watch Charter',
    emoji: '⚓',
    tagline: 'Exclusive vessel for your group',
    desc: 'Charter an entire whale watch vessel for your group. Up to 8 swimmers + 2 watchers. Pricing on application.',
    type: 'enquiry',
  },
  {
    id: 'island_charter',
    name: 'Island Exclusive Charter',
    emoji: '🌴',
    tagline: 'Private 5-hour island experience',
    desc: 'Exclusive charter for up to 10 people. TOP$ 2,400 includes snorkelling, lunch, and a picture-perfect outer reef island.',
    type: 'enquiry',
  },
  {
    id: 'game_fishing',
    name: 'Game Fishing Charter',
    emoji: '🎣',
    tagline: 'Head out wide for 4 hours of fishing',
    desc: 'Up to 4 people. TOP$ 1,600. All gear supplied. Can sometimes arrange shared bookings — ask in your enquiry.',
    type: 'enquiry',
  },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1 className="display-serif">Book Your Tonga Experience</h1>
          <p>
            Whale watching, outer reef adventures, and island escapes out of Neiafu, Vavaʻu.
            Real-time seat availability · Secure payment in TOP.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#online-booking" className="btn btn-primary btn-lg">Book Online Now</a>
            <a href="#enquiries" className="btn btn-ghost btn-lg">Make an Enquiry</a>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Online booking tours */}
        <section id="online-booking" style={{ paddingTop: 60 }}>
          <h2 style={{ marginBottom: 8 }}>Online Bookings</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
            Secure your seat now — real-time availability, full payment in Tongan Paʻanga.
          </p>

          <div className="tour-grid">
            {BOOKING_TOURS.map((tour) => (
              <div key={tour.id} className="tour-card">
                <div className="tour-card__img-wrap">
                  <div style={{
                    width: '100%', height: '100%',
                    background: `linear-gradient(135deg, var(--ocean-mid), var(--ocean-bright))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '4rem',
                  }}>
                    {tour.emoji}
                  </div>
                  {tour.badge && <span className="tour-card__badge">{tour.badge}</span>}
                </div>

                <div className="tour-card__body">
                  <div className="tour-card__title">{tour.name}</div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--ocean-bright)', fontWeight: 600, marginBottom: 8 }}>
                    {tour.tagline}
                  </p>
                  <p className="tour-card__desc">{tour.desc}</p>

                  <ul style={{ marginBottom: 20, paddingLeft: 0, listStyle: 'none' }}>
                    {tour.highlights.map((h) => (
                      <li key={h} style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', padding: '2px 0' }}>
                        ✓ {h}
                      </li>
                    ))}
                  </ul>

                  <div className="tour-card__price">{tour.price}</div>
                  <div className="tour-card__price-note">{tour.perNote}</div>

                  <Link href={`/book/${tour.id}`} className="btn btn-primary btn-full">
                    Book Now →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Enquiry tours */}
        <section id="enquiries" style={{ paddingBottom: 80 }}>
          <h2 style={{ marginBottom: 8 }}>Enquiry-Based Bookings</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
            These experiences are arranged directly with our team. Submit an enquiry and we'll be in touch within 24 hours.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {ENQUIRY_TOURS.map((tour) => (
              <div key={tour.id} style={{
                background: 'white', borderRadius: 'var(--radius-lg)', padding: 28,
                border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>{tour.emoji}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 6 }}>{tour.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--ocean-bright)', fontWeight: 600, marginBottom: 10 }}>
                  {tour.tagline}
                </p>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 20 }}>{tour.desc}</p>
                <Link href={`/enquiry/${tour.id}`} className="btn btn-outline btn-full">
                  Make an Enquiry →
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

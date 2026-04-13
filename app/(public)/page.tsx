import type { Metadata } from 'next'
import Link from 'next/link'
import { getToursConfig } from '@/lib/tours'

export const metadata: Metadata = {
  title: 'Book a Tour — Tahi Tonga',
  description:
    'Choose from Tahi Tonga\'s whale watching, outer reef, and island charter experiences in Vavaʻu, Tonga. Real-time online booking available.',
}

export default async function HomePage() {
  const { online: BOOKING_TOURS, enquiry: ENQUIRY_TOURS } = await getToursConfig()
  
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
            {BOOKING_TOURS.filter(t => t.isActive).map((tour) => (
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

                  <div className="tour-card__price">{tour.priceLabel}</div>
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
            {ENQUIRY_TOURS.filter(t => t.isActive).map((tour) => (
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

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tahi Tonga — Book Your Whale Watch & Island Experience',
  description:
    'Book whale watching, outer reef excursions, and island tours with Tahi Tonga in Vavaʻu, Tonga. Real-time availability, secure online payments in TOP.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://book.tahitonga.com'),
  openGraph: {
    siteName: 'Tahi Tonga Bookings',
    locale: 'en_NZ',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css" />
      </head>
      <body>
        <header className="site-header">
          <div className="container">
            <a href="/" className="site-logo">
              <span className="emoji">🐋</span>
              Tahi Tonga
            </a>
            <a href="https://tahitonga.com" className="btn btn-ghost btn-sm">
              ← Back to main site
            </a>
          </div>
        </header>

        <main className="page-wrapper">
          {children}
        </main>

        <footer className="site-footer">
          <div className="container">
            <p>© {new Date().getFullYear()} Tahi Tonga Whale Watching · Neiafu, Vavaʻu, Tonga</p>
            <p style={{ marginTop: 8 }}>
              <a href="https://tahitonga.com/terms-conditions/">Cancellation Policy</a>
              {' · '}
              <a href="mailto:info@tahitonga.com">info@tahitonga.com</a>
            </p>
          </div>
        </footer>

        <script src="https://cdn.jsdelivr.net/npm/flatpickr" defer></script>
      </body>
    </html>
  )
}

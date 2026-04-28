import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import '../globals.css'

export const metadata: Metadata = { title: 'Admin — Tahi Tonga Bookings' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  // Allow login page through; everything else requires a session
  // (individual pages also guard themselves, this is belt-and-suspenders)

  const navLinks = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/operating-days', label: 'Season Calendar', icon: '📅' },
    { href: '/admin/bookings', label: 'Bookings', icon: '🎫' },
    { href: '/admin/enquiries', label: 'Enquiries', icon: '✉️' },
    { href: '/admin/promo-codes', label: 'Promo Codes', icon: '🏷️' },
    { href: '/admin/packages', label: 'Packages', icon: '📦' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ]

  if (!session) {
    // Non-login pages handled by middleware; just render children (the login page)
    return (
      <html lang="en" suppressHydrationWarning><body style={{ background: 'var(--ocean-deep)', minHeight: '100vh' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'); body { font-family: 'Inter', sans-serif; }`}</style>
        {children}
      </body></html>
    )
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <div className="admin-sidebar__logo">
              <img src="/Logo.png" alt="Tahi Tonga Logo" style={{ height: 36, width: 'auto', marginBottom: 6 }} /><br />
              <span style={{ fontSize: '0.75rem', opacity: 0.6, fontFamily: 'Inter, sans-serif' }}>Booking Admin</span>
            </div>
            <nav className="admin-sidebar__nav">
              {navLinks.map(link => (
                <a key={link.href} href={link.href} className="admin-nav-link">
                  <span className="icon">{link.icon}</span>
                  {link.label}
                </a>
              ))}
            </nav>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,.1)', marginTop: 'auto' }}>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>
                {session.user?.email}
              </p>
              <a href="/api/auth/signout" style={{
                fontSize: '0.8rem', color: 'rgba(255,255,255,.6)',
                textDecoration: 'none', display: 'block',
              }}>
                Sign out →
              </a>
            </div>
          </aside>
          <div className="admin-content">{children}</div>
        </div>
      </body>
    </html>
  )
}

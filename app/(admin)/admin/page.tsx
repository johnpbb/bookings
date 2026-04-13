import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    confirmedThisWeek,
    pendingHolds,
    newEnquiries,
    todaySeats,
  ] = await Promise.all([
    prisma.booking.count({
      where: { status: 'confirmed', confirmedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    }),
    prisma.booking.count({ where: { status: 'pending_payment' } }),
    prisma.enquiry.count({ where: { status: 'new' } }),
    prisma.operatingDay.findUnique({
      where: { operatingDate: today },
    }),
  ])

  const seatsAvailable = todaySeats
    ? todaySeats.totalSeats - todaySeats.seatsHeld - todaySeats.seatsBooked
    : null

  const recentBookings = await prisma.booking.findMany({
    where: { status: 'confirmed' },
    orderBy: { confirmedAt: 'desc' },
    take: 8,
    include: { bookingDates: { orderBy: { tourDate: 'asc' }, take: 1 } },
  })

  const TOUR_NAMES: Record<string, string> = {
    whale_day_trip: 'Day Trip', whale_3day: '3-Day', whale_5day: '5-Day', island_reef: 'Outer Reef',
  }
  const STATUS_STYLE: Record<string, string> = {
    confirmed: 'confirmed', pending_payment: 'pending', cancelled: 'cancelled',
  }

  return (
    <>
      <div className="admin-page-header">
        <h1>Dashboard</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {new Date().toLocaleDateString('en-NZ', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__value">{confirmedThisWeek}</div>
          <div className="stat-card__label">Bookings this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{pendingHolds}</div>
          <div className="stat-card__label">Active holds</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{newEnquiries}</div>
          <div className="stat-card__label">New enquiries</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">
            {seatsAvailable !== null ? seatsAvailable : '—'}
          </div>
          <div className="stat-card__label">Today's seats remaining</div>
        </div>
      </div>

      <h2 style={{ marginBottom: 20, fontSize: '1.25rem' }}>Recent Confirmed Bookings</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Guest</th>
              <th>Tour</th>
              <th>First Date</th>
              <th>Guests</th>
              <th>Amount</th>
              <th>Vessel</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings.map(b => (
              <tr key={b.id}>
                <td><a href={`/admin/bookings`} style={{ fontWeight: 600 }}>{b.reference}</a></td>
                <td>{b.guestName}</td>
                <td>{TOUR_NAMES[b.tourId] ?? b.tourId}</td>
                <td>{b.bookingDates[0] ? new Date(b.bookingDates[0].tourDate).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' }) : '—'}</td>
                <td>{b.numGuests}</td>
                <td>TOP$ {Number(b.amountTop).toFixed(0)}</td>
                <td style={{ color: b.assignedVessel ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: b.assignedVessel ? 'normal' : 'italic' }}>
                  {b.assignedVessel ?? 'Unassigned'}
                </td>
              </tr>
            ))}
            {recentBookings.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No confirmed bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24 }}>
        <a href="/admin/bookings" className="btn btn-outline btn-sm">View All Bookings →</a>
      </div>
    </>
  )
}

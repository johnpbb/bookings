import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AdminBookingsClient from './AdminBookingsClient'

export default async function AdminBookingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { bookingDates: { orderBy: { tourDate: 'asc' } } },
  })

  return <AdminBookingsClient initialBookings={bookings} />
}

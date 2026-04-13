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

  const serializedBookings = bookings.map(b => ({
    ...b,
    amountTop: Number(b.amountTop),
    discountTop: b.discountTop ? Number(b.discountTop) : null,
    refundAmountTop: b.refundAmountTop ? Number(b.refundAmountTop) : null,
  })) as any

  return <AdminBookingsClient initialBookings={serializedBookings} />
}

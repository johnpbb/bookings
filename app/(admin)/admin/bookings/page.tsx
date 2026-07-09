import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AdminBookingsClient from './AdminBookingsClient'
import { getToursConfig } from '@/lib/tours'

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  const { search: initialSearch } = await searchParams

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { bookingDates: { orderBy: { tourDate: 'asc' } } },
  })

  const serializedBookings = bookings.map(b => ({
    ...b,
    amountTop: Number(b.amountTop),
    discountTop: b.discountTop ? Number(b.discountTop) : null,
    refundAmountTop: b.refundAmountTop ? Number(b.refundAmountTop) : null,
    surchargeTop: b.surchargeTop ? Number(b.surchargeTop) : 0,
  })) as any

  const { online, enquiry } = await getToursConfig()
  const tourMap = Object.fromEntries(
    [...online, ...enquiry].map(t => [t.id, t.name])
  )

  const surchargeSettings = await prisma.setting.findMany({
    where: { key: { in: ['payment_surcharge_enabled', 'payment_surcharge_type', 'payment_surcharge_amount'] } }
  })
  const getSurcharge = (k: string) => surchargeSettings.find(s => s.key === k)?.value ?? ''
  const surcharge = {
    enabled: getSurcharge('payment_surcharge_enabled') === 'true',
    type: (getSurcharge('payment_surcharge_type') || 'percentage') as 'fixed' | 'percentage',
    amount: parseFloat(getSurcharge('payment_surcharge_amount')) || 0,
  }

  return (
    <AdminBookingsClient
      initialBookings={serializedBookings}
      tourNames={tourMap}
      onlineTours={online}
      surcharge={surcharge}
      initialSearch={initialSearch ?? ''}
    />
  )
}

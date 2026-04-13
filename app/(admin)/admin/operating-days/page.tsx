import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AdminOperatingDaysClient from './AdminOperatingDaysClient'

export default async function OperatingDaysPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  const from = new Date()
  from.setDate(1)
  from.setMonth(from.getMonth() - 1)
  const to = new Date()
  to.setMonth(to.getMonth() + 4)

  const days = await prisma.operatingDay.findMany({
    where: { operatingDate: { gte: from, lte: to } },
    orderBy: { operatingDate: 'asc' },
    include: {
      bookingDates: {
        include: { booking: { select: { status: true, numGuests: true } } }
      }
    },
  })

  return <AdminOperatingDaysClient initialDays={days} />
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AdminOperatingDaysClient from './AdminOperatingDaysClient'
import { getToursConfig } from '@/lib/tours'

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
        include: {
          booking: {
            select: {
              id: true,
              reference: true,
              guestName: true,
              numGuests: true,
              status: true,
              assignedVessel: true,
              tourId: true,
            }
          }
        }
      }
    },
  })

  const { online, enquiry } = await getToursConfig()
  const tourNames = Object.fromEntries(
    [...online, ...enquiry].map(t => [t.id, t.name])
  )

  return <AdminOperatingDaysClient initialDays={days as any} tourNames={tourNames} />
}

import { getOnlineTour } from '@/lib/tours'
import { prisma } from '@/lib/db'
import BookClient from './BookClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function BookingPage({ params }: { params: Promise<{ tour: string }> }) {
  const resolved = await params
  const tour = await getOnlineTour(resolved.tour)
  if (!tour) redirect('/')

  const settings = await prisma.setting.findMany({
    where: { key: { in: ['payment_surcharge_enabled', 'payment_surcharge_label', 'payment_surcharge_type', 'payment_surcharge_amount'] } }
  })
  const getSetting = (key: string) => settings.find(s => s.key === key)?.value ?? ''

  const surcharge = {
    enabled: getSetting('payment_surcharge_enabled') === 'true',
    label: getSetting('payment_surcharge_label') || 'Payment surcharge',
    type: (getSetting('payment_surcharge_type') || 'percentage') as 'fixed' | 'percentage',
    amount: parseFloat(getSetting('payment_surcharge_amount')) || 0,
  }

  return <BookClient tour={tour} surcharge={surcharge} />
}

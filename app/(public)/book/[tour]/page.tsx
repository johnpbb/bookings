import { getOnlineTour } from '@/lib/tours'
import BookClient from './BookClient'
import { redirect } from 'next/navigation'

export default async function BookingPage({ params }: { params: Promise<{ tour: string }> }) {
  const resolved = await params
  const tour = await getOnlineTour(resolved.tour)
  if (!tour) redirect('/')
  
  return <BookClient tour={tour} />
}

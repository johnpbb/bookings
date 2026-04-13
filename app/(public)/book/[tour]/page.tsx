import { getOnlineTour } from '@/lib/tours'
import BookClient from './BookClient'
import { redirect } from 'next/navigation'

export default async function BookingPage({ params }: { params: { tour: string } }) {
  const tour = await getOnlineTour(params.tour)
  if (!tour) redirect('/')
  
  return <BookClient tour={tour} />
}

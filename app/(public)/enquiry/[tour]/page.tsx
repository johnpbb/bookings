import { getEnquiryTour } from '@/lib/tours'
import EnquiryClient from './EnquiryClient'
import { redirect } from 'next/navigation'

export default async function EnquiryPage({ params }: { params: { tour: string } }) {
  const tour = await getEnquiryTour(params.tour)
  if (!tour) redirect('/')
  
  return <EnquiryClient tour={tour} />
}

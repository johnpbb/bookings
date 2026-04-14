import { getEnquiryTour } from '@/lib/tours'
import EnquiryClient from './EnquiryClient'
import { redirect } from 'next/navigation'

export default async function EnquiryPage({ params }: { params: Promise<{ tour: string }> }) {
  const resolved = await params
  const tour = await getEnquiryTour(resolved.tour)
  if (!tour) redirect('/')
  
  return <EnquiryClient tour={tour} />
}

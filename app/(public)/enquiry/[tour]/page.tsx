import { getEnquiryTour, getOnlineTour, type EnquiryTour } from '@/lib/tours'
import { offseasonRule } from '@/lib/offseason'
import EnquiryClient from './EnquiryClient'
import { redirect } from 'next/navigation'

// Island and fishing trips book online, but guests can still enquire about blocked dates.
async function bookableTripAsEnquiry(tourId: string): Promise<EnquiryTour | null> {
  const tour = offseasonRule(tourId) ? await getOnlineTour(tourId) : null
  if (!tour) return null
  return { id: tour.id, name: tour.name, emoji: tour.emoji, image: tour.image, tagline: tour.tagline, desc: tour.desc, type: 'enquiry', isActive: true }
}

function friendlyDate(raw: string | undefined): string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ''
  return new Date(raw).toLocaleDateString('en-NZ', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function EnquiryPage({ params, searchParams }: { params: Promise<{ tour: string }>; searchParams: Promise<{ date?: string }> }) {
  const resolved = await params
  const { date } = await searchParams
  const tour = (await getEnquiryTour(resolved.tour)) ?? (await bookableTripAsEnquiry(resolved.tour))
  if (!tour) redirect('/')

  return <EnquiryClient tour={tour} initialDate={friendlyDate(date)} />
}

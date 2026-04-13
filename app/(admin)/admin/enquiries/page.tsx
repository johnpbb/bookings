import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AdminEnquiriesClient from './AdminEnquiriesClient'
import { getToursConfig } from '@/lib/tours'

export default async function EnquiriesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  const enquiries = await prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })

  const { online, enquiry } = await getToursConfig()
  const tourMap = Object.fromEntries(
    [...online, ...enquiry].map(t => [t.id, t.name])
  )
  return <AdminEnquiriesClient initialEnquiries={enquiries} tourNames={tourMap} />
}

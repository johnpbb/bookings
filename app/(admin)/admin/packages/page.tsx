import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getToursConfig } from '@/lib/tours'
import AdminPackagesClient from './AdminPackagesClient'

export default async function AdminPackagesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  const { online, enquiry } = await getToursConfig()

  return <AdminPackagesClient initialOnline={online} initialEnquiry={enquiry} />
}

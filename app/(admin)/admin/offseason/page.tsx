import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminOffseasonClient from './AdminOffseasonClient'

export default async function OffseasonCalendarPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  return <AdminOffseasonClient />
}

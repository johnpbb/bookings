import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AdminSettingsClient from './AdminSettingsClient'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')

  const allSettings = await prisma.setting.findMany()
  const settings = Object.fromEntries(allSettings.map(s => [s.key, s.value]))
  // Redact secret
  if (settings.egate_shared_secret) settings.egate_shared_secret = '••••••••'

  return <AdminSettingsClient initialSettings={settings} />
}

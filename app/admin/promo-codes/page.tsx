import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import AdminPromoClient from './AdminPromoClient'

export default async function PromoCodesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
  return <AdminPromoClient initialCodes={codes} />
}

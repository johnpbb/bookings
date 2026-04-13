import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/db'

// GET /api/admin/enquiries?page=1&status=new&tour=whale_charter
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const page   = parseInt(searchParams.get('page') ?? '1', 10)
  const limit  = 50
  const status = searchParams.get('status')
  const tour   = searchParams.get('tour')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (tour)   where.tourId = tour

  const [enquiries, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.enquiry.count({ where }),
  ])

  return NextResponse.json({ enquiries, total, page, limit })
}

// PATCH /api/admin/enquiries — update status or admin notes
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { id, status, adminNotes } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (status)     update.status     = status
  if (adminNotes !== undefined) update.adminNotes = adminNotes

  const enquiry = await prisma.enquiry.update({
    where: { id },
    data: update,
  })

  return NextResponse.json(enquiry)
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/db'
import { cancelConfirmed } from '@/lib/booking'

// GET /api/admin/bookings?page=1&status=confirmed&tour=whale_3day&from=2026-07-01&to=2026-10-31
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const page   = parseInt(searchParams.get('page') ?? '1', 10)
  const limit  = 50
  const status = searchParams.get('status')
  const tour   = searchParams.get('tour')
  const from   = searchParams.get('from')
  const to     = searchParams.get('to')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (tour)   where.tourId = tour
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to   ? { lte: new Date(to)   } : {}),
    }
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { bookingDates: { orderBy: { tourDate: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.booking.count({ where }),
  ])

  return NextResponse.json({ bookings, total, page, limit })
}

// PATCH /api/admin/bookings — update vessel, cancel, etc.
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const { id, action, assignedVessel, cancelReason, refundMethod } = body

  if (!id) return NextResponse.json({ error: 'Missing booking id.' }, { status: 400 })

  if (action === 'assign_vessel') {
    await prisma.booking.update({
      where: { id },
      data: { assignedVessel: assignedVessel ?? null },
    })
    return NextResponse.json({ success: true })
  }

  if (action === 'cancel') {
    const result = await cancelConfirmed(id, cancelReason ?? '', refundMethod ?? 'none')
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}

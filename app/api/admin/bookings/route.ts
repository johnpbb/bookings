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

// POST /api/admin/bookings — Create manual offline booking
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  try {
    const body = await req.json()
    const { 
      tourId, 
      dates, 
      numGuests, 
      guestName, 
      guestEmail, 
      guestPhone, 
      specialRequests, 
      amountTop, 
      assignedVessel 
    } = body

    if (!tourId || !dates || !Array.isArray(dates) || dates.length === 0 || !numGuests || !guestName || !guestEmail) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const { createManualBooking } = await import('@/lib/booking')
    const result = await createManualBooking({
      tourId,
      dates,
      numGuests: parseInt(numGuests, 10),
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      amountTop: parseFloat(amountTop ?? '0'),
      assignedVessel,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Return the newly added/confirmed booking
    const { getBooking } = await import('@/lib/booking')
    const newBooking = await getBooking(result.bookingId!)

    return NextResponse.json({ success: true, booking: newBooking })
  } catch (err: any) {
    console.error('[api/admin/bookings] POST error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 })
  }
}

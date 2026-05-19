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
  const limit  = parseInt(searchParams.get('limit') ?? '50', 10)
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

  try {
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

  if (action === 'edit_details') {
    const { guestName, guestEmail, guestPhone } = body
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        guestName: guestName?.trim(),
        guestEmail: guestEmail?.toLowerCase().trim(),
        guestPhone: guestPhone?.trim() ?? null,
      },
      include: { bookingDates: { orderBy: { tourDate: 'asc' } } },
    })
    return NextResponse.json({ success: true, booking: updated })
  }

  if (action === 'update_notes') {
    const updated = await prisma.booking.update({
      where: { id },
      data: { adminNotes: body.adminNotes?.trim() ?? null },
      include: { bookingDates: { orderBy: { tourDate: 'asc' } } },
    })
    return NextResponse.json({ success: true, booking: updated })
  }

  if (action === 'change_dates') {
    const { newDates } = body as { newDates: string[] }
    if (!newDates || newDates.length === 0) {
      return NextResponse.json({ error: 'No dates provided.' }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { bookingDates: true },
    })
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      // Release seats on old dates
      for (const bd of booking.bookingDates) {
        await tx.$executeRaw`
          UPDATE tt_operating_days
          SET seats_booked = GREATEST(0, seats_booked - ${booking.numGuests})
          WHERE id = ${bd.operatingDayId}
        `
      }
      // Delete old booking date records
      await tx.bookingDate.deleteMany({ where: { bookingId: id } })

      // Create new booking date records and reserve seats
      for (const date of newDates) {
        const opDay = await tx.operatingDay.upsert({
          where: { operatingDate: new Date(date) },
          update: {},
          create: { operatingDate: new Date(date), totalSeats: 16, seatsBooked: 0 },
        })
        await tx.bookingDate.create({
          data: {
            bookingId: id,
            operatingDayId: opDay.id,
            tourDate: new Date(date),
            seatsReserved: booking.numGuests,
          },
        })
        await tx.$executeRaw`
          UPDATE tt_operating_days
          SET seats_booked = seats_booked + ${booking.numGuests}
          WHERE id = ${opDay.id}
        `
      }
    })

    const updated = await prisma.booking.findUnique({
      where: { id },
      include: { bookingDates: { orderBy: { tourDate: 'asc' } } },
    })
    return NextResponse.json({ success: true, booking: updated })
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  } catch (err: any) {
    console.error('[PATCH /api/admin/bookings]', err)
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 })
  }
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

// DELETE /api/admin/bookings?id=123 — permanently remove a booking
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const id = parseInt(new URL(req.url).searchParams.get('id') ?? '', 10)
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

  try {
    await prisma.bookingDate.deleteMany({ where: { bookingId: id } })
    await prisma.booking.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/admin/bookings]', err)
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 })
  }
}

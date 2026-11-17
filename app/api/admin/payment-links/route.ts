import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/db'
import { newPaymentToken } from '@/lib/payments'
import { MAX_PAYMENT_TOP, MIN_PAYMENT_TOP, PAYMENT_TOUR_ID } from '@/lib/paymentContent'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function listLinks() {
  const links = await prisma.paymentLink.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: {
      bookings: {
        where: { tourId: PAYMENT_TOUR_ID, status: 'confirmed' },
        select: { reference: true, confirmedAt: true, amountTop: true },
        take: 1,
      },
    },
  })
  return links.map((l) => ({
    id: l.id,
    token: l.token,
    amount: Number(l.amountTop),
    description: l.description,
    guestName: l.guestName,
    guestEmail: l.guestEmail,
    notes: l.notes,
    status: l.bookings.length > 0 ? 'paid' : l.status,
    paidRef: l.bookings[0]?.reference ?? null,
    paidAt: l.bookings[0]?.confirmedAt?.toISOString() ?? null,
    paidTotal: l.bookings[0] ? Number(l.bookings[0].amountTop) : null,
    createdAt: l.createdAt.toISOString(),
  }))
}

// GET /api/admin/payment-links
export async function GET() {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  return NextResponse.json(await listLinks())
}

// POST /api/admin/payment-links — create a link
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const amount = Math.round(Number(body.amount) * 100) / 100
  const description = String(body.description ?? '').trim()
  const guestEmail = String(body.guestEmail ?? '').trim().toLowerCase()

  if (!Number.isFinite(amount) || amount < MIN_PAYMENT_TOP || amount > MAX_PAYMENT_TOP) {
    return NextResponse.json({ error: `Amount must be between TOP$ ${MIN_PAYMENT_TOP} and TOP$ ${MAX_PAYMENT_TOP}.` }, { status: 400 })
  }
  if (!description || description.length > 250) {
    return NextResponse.json({ error: 'Please describe what the payment is for (up to 250 characters).' }, { status: 400 })
  }
  if (guestEmail && !EMAIL.test(guestEmail)) {
    return NextResponse.json({ error: 'That guest email address does not look right.' }, { status: 400 })
  }

  await prisma.paymentLink.create({
    data: {
      token: newPaymentToken(),
      amountTop: amount,
      description,
      guestName: String(body.guestName ?? '').trim() || null,
      guestEmail: guestEmail || null,
      notes: String(body.notes ?? '').trim().slice(0, 250) || null,
    },
  })
  return NextResponse.json(await listLinks(), { status: 201 })
}

// PATCH /api/admin/payment-links — cancel or reopen a link
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { id, action } = await req.json() as { id: number; action: 'cancel' | 'reopen' }
  if (!id || (action !== 'cancel' && action !== 'reopen')) {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }
  await prisma.paymentLink.update({ where: { id }, data: { status: action === 'cancel' ? 'cancelled' : 'open' } })
  return NextResponse.json(await listLinks())
}

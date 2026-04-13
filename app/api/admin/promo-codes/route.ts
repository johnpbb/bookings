import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/db'

// GET /api/admin/promo-codes
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(codes)
}

// POST /api/admin/promo-codes — create new code
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const {
    code, discountType, discountValue, applicableTours,
    validDateStart, validDateEnd, excludeSundays, maxUses, notes,
  } = body

  if (!code || !discountType || discountValue === undefined) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const created = await prisma.promoCode.create({
    data: {
      code: String(code).toUpperCase().trim(),
      discountType,
      discountValue,
      applicableTours: applicableTours ?? null,
      validDateStart: validDateStart ? new Date(validDateStart) : null,
      validDateEnd: validDateEnd ? new Date(validDateEnd) : null,
      excludeSundays: Boolean(excludeSundays),
      maxUses: maxUses ?? null,
      notes: notes ?? null,
    },
  })

  return NextResponse.json(created, { status: 201 })
}

// PATCH /api/admin/promo-codes — update / deactivate
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { id, ...data } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

  if (data.validDateStart) data.validDateStart = new Date(data.validDateStart)
  if (data.validDateEnd)   data.validDateEnd   = new Date(data.validDateEnd)
  if (data.code)           data.code           = String(data.code).toUpperCase().trim()

  const updated = await prisma.promoCode.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE /api/admin/promo-codes?id=5
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get('id') ?? '', 10)
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 })

  await prisma.promoCode.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/db'
import { getAdminRange, bulkGenerateSeasonDays } from '@/lib/availability'

// GET /api/admin/operating-days?from=2026-07-01&to=2026-10-31
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? new Date().toISOString().slice(0, 10)
  const to   = searchParams.get('to')   ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)

  const days = await getAdminRange(from, to)
  return NextResponse.json(days)
}

// POST /api/admin/operating-days
// Actions: add_date | bulk_generate | set_charter | delete_date
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const { action } = body

  if (action === 'add_date') {
    const { date, totalSeats } = body
    const day = await prisma.operatingDay.upsert({
      where: { operatingDate: new Date(date) },
      update: { totalSeats: totalSeats ?? 16 },
      create: { operatingDate: new Date(date), totalSeats: totalSeats ?? 16 },
    })
    return NextResponse.json(day, { status: 201 })
  }

  if (action === 'bulk_generate') {
    const { seasonStart, seasonEnd, excludedDates } = body
    const s = await prisma.setting.findUnique({ where: { key: 'excluded_dates' } })
    const defaultExcluded = s?.value.split(',') ?? []
    const allExcluded = [...defaultExcluded, ...(excludedDates ?? [])]
    const created = await bulkGenerateSeasonDays(seasonStart, seasonEnd, allExcluded)
    return NextResponse.json({ created })
  }

  if (action === 'set_charter') {
    const { date, charterVessel, isFullyBlocked } = body
    const day = await prisma.operatingDay.update({
      where: { operatingDate: new Date(date) },
      data: {
        charterVessel: charterVessel ?? null,
        isFullyBlocked: Boolean(isFullyBlocked),
        totalSeats: isFullyBlocked ? 16 : charterVessel ? 8 : 16,
      },
    })
    return NextResponse.json(day)
  }

  if (action === 'delete_date') {
    const { date } = body
    await prisma.operatingDay.delete({ where: { operatingDate: new Date(date) } })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}

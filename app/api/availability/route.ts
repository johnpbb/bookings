import { NextRequest, NextResponse } from 'next/server'
import { getMonthAvailability, getUpcomingAvailability } from '@/lib/availability'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode  = searchParams.get('mode') ?? 'month'
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10)
  const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()), 10)
  const days  = parseInt(searchParams.get('days')  ?? '365', 10)

  try {
    const data =
      mode === 'upcoming'
        ? await getUpcomingAvailability(days)
        : await getMonthAvailability(month, year)

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (err) {
    console.error('[api/availability]', err)
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }
}

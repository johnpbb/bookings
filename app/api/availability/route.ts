import { NextRequest, NextResponse } from 'next/server'
import { getMonthAvailability, getUpcomingAvailability, getMinSeatsAcrossDates } from '@/lib/availability'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode  = searchParams.get('mode') ?? 'month'
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10)
  const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()), 10)
  const days  = parseInt(searchParams.get('days')  ?? '365', 10)

  try {
    if (mode === 'min-seats') {
      const raw = searchParams.get('dates') ?? ''
      const dates = raw ? raw.split(',').filter(Boolean) : []
      if (dates.length === 0) {
        return NextResponse.json({ minSeats: 0 })
      }
      const minSeats = await getMinSeatsAcrossDates(dates)
      return NextResponse.json({ minSeats })
    }

    const data =
      mode === 'upcoming'
        ? await getUpcomingAvailability(days)
        : await getMonthAvailability(month, year)

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[api/availability]', err)
    return NextResponse.json({ error: 'Failed to load availability' }, { status: 500 })
  }
}

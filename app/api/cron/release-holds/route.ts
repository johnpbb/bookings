import { NextRequest, NextResponse } from 'next/server'
import { releaseExpiredHolds } from '@/lib/cron'

// Called by Opalstack cron every 5 minutes:
// curl -H "x-cron-secret: $CRON_SECRET" https://book.tahitonga.com/api/cron/release-holds

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const count = await releaseExpiredHolds()
  return NextResponse.json({ released: count })
}

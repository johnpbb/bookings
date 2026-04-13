import { NextRequest, NextResponse } from 'next/server'
import { checkReefMinimumPax } from '@/lib/cron'

// Called by Opalstack cron at 5pm Tonga time daily (04:00 UTC):
// curl -H "x-cron-secret: $CRON_SECRET" https://book.tahitonga.com/api/cron/check-reef

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  await checkReefMinimumPax()
  return NextResponse.json({ ok: true })
}

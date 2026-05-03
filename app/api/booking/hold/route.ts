import { NextRequest, NextResponse } from 'next/server'
import { placeHold } from '@/lib/booking'
import type { PlaceHoldArgs } from '@/lib/booking'
import { checkCsrf } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req)
  if (csrfError) return csrfError

  try {
    const body = await req.json() as PlaceHoldArgs

    // Capture IP for rate limiting
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'

    const result = await placeHold({ ...body, ipAddress: ip })

    if (!result.success) {
      return NextResponse.json(result, { status: result.unavailableDates ? 409 : 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error('[api/booking/hold]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

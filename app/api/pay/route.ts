import { NextRequest, NextResponse } from 'next/server'
import { checkCsrf } from '@/lib/csrf'
import { startPaymentAttempt, type PaymentAttemptArgs } from '@/lib/payments'

// POST /api/pay — start a pay-by-link payment; the page then opens ANZ checkout for the returned booking
export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req)
  if (csrfError) return csrfError

  try {
    const body = await req.json() as PaymentAttemptArgs
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'

    const result = await startPaymentAttempt({
      token: typeof body.token === 'string' ? body.token : undefined,
      amount: typeof body.amount === 'number' ? body.amount : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      guestName: String(body.guestName ?? ''),
      guestEmail: String(body.guestEmail ?? ''),
      guestPhone: typeof body.guestPhone === 'string' ? body.guestPhone : undefined,
      ipAddress: ip,
    })

    return NextResponse.json(result, { status: result.success ? 201 : 400 })
  } catch (err) {
    console.error('[api/pay]', err)
    return NextResponse.json({ success: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}

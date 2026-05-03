import { NextRequest, NextResponse } from 'next/server'
import { validatePromo } from '@/lib/promo'
import { checkCsrf } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  const csrfError = checkCsrf(req)
  if (csrfError) return csrfError

  try {
    const body = await req.json()
    const { code, tourId, dates } = body as {
      code: string
      tourId: string
      dates: string[]
    }

    if (!code || !tourId || !Array.isArray(dates)) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const result = await validatePromo(code, tourId, dates)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[api/promo/validate]', err)
    return NextResponse.json({ error: 'Validation error.' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

// Allowed origins: configured app URL + localhost for development.
// Cross-origin JSON mutations are blocked to prevent CSRF against the booking API.
function allowedOrigins(): string[] {
  return [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    'http://localhost:3000',
  ].filter(Boolean) as string[]
}

export function checkCsrf(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin')
  // Requests without an Origin header are same-origin (SSR, curl, Postman in dev).
  if (!origin) return null

  const allowed = allowedOrigins()
  if (allowed.some(o => origin === o || origin.startsWith(o))) return null

  return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
}

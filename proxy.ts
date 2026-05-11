/**
 * proxy.ts — Next.js 16 route protection (was: middleware.ts).
 *
 * Protects all /admin/* routes except /admin/login.
 * next-auth/middleware's withAuth() handles the JWT session check
 * and redirects unauthenticated requests to the configured signIn page.
 */
import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

const authProxy = withAuth

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Serve uploaded images via API route (Opalstack nginx doesn't serve public/)
  if (pathname.startsWith('/uploads/')) {
    const url = req.nextUrl.clone()
    url.pathname = `/api${pathname}`
    return NextResponse.rewrite(url)
  }

  return (authProxy as unknown as (req: NextRequest) => Response | Promise<Response>)(req)
}

export const config = {
  matcher: ['/admin/((?!login).*)', '/uploads/:path*'],
}

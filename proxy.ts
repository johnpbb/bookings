/**
 * proxy.ts — Next.js 16 route protection (was: middleware.ts).
 *
 * Protects all /admin/* routes except /admin/login.
 * next-auth/middleware's withAuth() handles the JWT session check
 * and redirects unauthenticated requests to the configured signIn page.
 */
import { withAuth } from 'next-auth/middleware'
import type { NextRequest } from 'next/server'

// Export as a named `proxy` function (required by Next.js 16)
export const proxy = withAuth as unknown as (req: NextRequest) => Response | Promise<Response>

export const config = {
  matcher: ['/admin/((?!login).*)'],
}

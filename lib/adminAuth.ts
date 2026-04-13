/**
 * lib/adminAuth.ts - Server-side admin session check helper.
 * Call this at the top of every admin API route.
 */
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextResponse } from 'next/server'

export async function requireAdmin(): Promise<{ error: NextResponse } | { session: Awaited<ReturnType<typeof getServerSession>> }> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }
  return { session }
}

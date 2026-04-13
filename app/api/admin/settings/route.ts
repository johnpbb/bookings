import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { prisma } from '@/lib/db'

const PUBLIC_KEYS = [
  'hold_minutes', 'non_refundable_fee', 'whale_season_start', 'whale_season_end',
  'operator_email', 'egate_sandbox', 'egate_merchant_id', 'egate_shared_secret',
  'egate_endpoint', 'egate_sandbox_endpoint', 'excluded_dates',
  'email_meeting_point', 'email_inclusions', 'email_what_to_bring',
]

// GET /api/admin/settings
export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const settings = await prisma.setting.findMany({ where: { key: { in: PUBLIC_KEYS } } })
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
  // Redact shared secret from response
  if (map.egate_shared_secret) map.egate_shared_secret = '••••••••'
  return NextResponse.json(map)
}

// POST /api/admin/settings — upsert one or many key/value pairs
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json() as Record<string, string>

  for (const [key, value] of Object.entries(body)) {
    if (!PUBLIC_KEYS.includes(key)) continue
    // Don't overwrite secret if placeholder was sent
    if (key === 'egate_shared_secret' && value === '••••••••') continue
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }

  return NextResponse.json({ success: true })
}

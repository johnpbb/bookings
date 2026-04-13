import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌊 Seeding Tahi Tonga booking database...')

  // ── Promo codes ────────────────────────────────────────────────────────────
  // FRINGE2026 — two windows, whale_3day only, fixed TOP$350 discount
  // Reduces $1,850pp → $1,500pp. Excludes Sundays.
  await prisma.promoCode.upsert({
    where: { code: 'FRINGE2026-JUL' },
    update: {},
    create: {
      code: 'FRINGE2026-JUL',
      discountType: 'fixed',
      discountValue: 350.00,
      applicableTours: 'whale_3day',
      validDateStart: new Date('2026-07-01'),
      validDateEnd: new Date('2026-07-19'),
      excludeSundays: true,
      maxUses: null,
      notes: 'Fringe Festival window 1: 1–19 July 2026',
    },
  })

  await prisma.promoCode.upsert({
    where: { code: 'FRINGE2026-OCT' },
    update: {},
    create: {
      code: 'FRINGE2026-OCT',
      discountType: 'fixed',
      discountValue: 350.00,
      applicableTours: 'whale_3day',
      validDateStart: new Date('2026-10-12'),
      validDateEnd: new Date('2026-10-31'),
      excludeSundays: true,
      maxUses: null,
      notes: 'Fringe Festival window 2: 12–31 October 2026',
    },
  })

  console.log('  ✓ Promo codes seeded')

  // ── Default settings ───────────────────────────────────────────────────────
  const defaults: Array<{ key: string; value: string }> = [
    { key: 'hold_minutes', value: '20' },
    { key: 'non_refundable_fee', value: '0' },
    { key: 'whale_season_start', value: '07-01' },
    { key: 'whale_season_end', value: '10-31' },
    { key: 'operator_email', value: 'info@tahitonga.com' },
    { key: 'egate_sandbox', value: 'true' },
    { key: 'egate_merchant_id', value: '' },
    { key: 'egate_shared_secret', value: '' },
    { key: 'egate_endpoint', value: 'https://gateway.mastercard.com/api/nvp/version/61' },
    { key: 'egate_sandbox_endpoint', value: 'https://test-gateway.mastercard.com/api/nvp/version/61' },
    {
      key: 'excluded_dates',
      value: '2026-04-05,2026-12-25,2027-03-28,2027-12-25',
    },
    { key: 'email_meeting_point', value: 'Meet at Neiafu Wharf, Vavaʻu at 8:30 AM.' },
    { key: 'email_inclusions', value: 'Snorkelling gear, guides, light refreshments.' },
    { key: 'email_what_to_bring', value: 'Swimsuit, towel, sunscreen, camera, cash for extras.' },
  ]

  for (const s of defaults) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }

  console.log('  ✓ Default settings seeded')

  // ── Admin user ─────────────────────────────────────────────────────────────
  // Default credentials — MUST be changed immediately after first login.
  const existingAdmin = await prisma.adminUser.findFirst()
  if (!existingAdmin) {
    const hash = await bcrypt.hash('ChangeMe2026!', 12)
    await prisma.adminUser.create({
      data: {
        email: 'admin@tahitonga.com',
        passwordHash: hash,
        name: 'Tahi Admin',
      },
    })
    console.log('  ✓ Default admin user created (admin@tahitonga.com / ChangeMe2026!)')
    console.log('  ⚠️  IMPORTANT: Change admin password immediately after first login!')
  } else {
    console.log('  ✓ Admin user already exists — skipped')
  }

  console.log('\n✅ Seed complete.')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

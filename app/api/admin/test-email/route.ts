import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { to } = await req.json()

  const operatorEmail = await prisma.setting
    .findUnique({ where: { key: 'operator_email' } })
    .then(s => s?.value ?? 'info@tahitonga.com')

  const recipient = (to as string | undefined)?.trim() || operatorEmail

  const config = {
    host: process.env.SMTP_HOST ?? '(not set)',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '(not set)',
    from: process.env.SMTP_FROM ?? 'no-reply@tahitonga.com',
    hasPass: !!(process.env.SMTP_PASS),
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({
      success: false,
      error: 'SMTP environment variables are not set on this server.',
      config,
    })
  }

  try {
    const { sendBookingConfirmation, sendOperatorBookingAlert } = await import('@/lib/mailer')
    const { Decimal } = await import('@prisma/client/runtime/library')

    const mockBooking = {
      id: 0,
      reference: 'TT-TEST-EMAIL',
      tourId: 'whale_3day',
      bookingType: 'online',
      assignedVessel: 'mv_ika_nui',
      guestName: 'Sara Morgillo',
      guestEmail: recipient,
      guestPhone: '0401196885',
      numGuests: 1,
      amountTop: new Decimal('481.00'),
      surchargeTop: new Decimal('14.00'),
      status: 'confirmed',
      egateOrderId: 'TT-0-TEST',
      egateTxnRef: 'MOCK-TXN-REF',
      specialRequests: 'Dates in Tonga: Approx 3-18 sep. WhatsApp linked: Yes',
      promoCode: 'DEPOSIT25%',
      discountTop: new Decimal('120.25'),
      refundAmountTop: null,
      refundedAt: null,
      cancelReason: null,
      adminNotes: null,
      holdExpiresAt: null,
      confirmedAt: new Date(),
      ipAddress: '127.0.0.1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any

    const mockDates = ['2026-09-12', '2026-09-14', '2026-09-15']

    // Send both guest confirmation and operator alert templates to the recipient
    await sendBookingConfirmation({ booking: mockBooking, dates: mockDates })
    await sendOperatorBookingAlert({ booking: mockBooking, dates: mockDates, toOverride: recipient })

    return NextResponse.json({ success: true, sentTo: recipient, config })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: message, config })
  }
}

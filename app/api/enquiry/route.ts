import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEnquiryNotification } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tourId,
      guestName,
      guestEmail,
      guestPhone,
      groupSize,
      preferredDates,
      message,
      whaleAddon,
    } = body

    if (!tourId || !guestName || !guestEmail) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown'

    const enquiry = await prisma.enquiry.create({
      data: {
        tourId,
        guestName: String(guestName).trim(),
        guestEmail: String(guestEmail).toLowerCase().trim(),
        guestPhone: guestPhone ? String(guestPhone).trim() : null,
        groupSize: groupSize ? parseInt(groupSize, 10) : null,
        preferredDates: preferredDates ? String(preferredDates).trim() : null,
        message: message ? String(message).trim() : null,
        whaleAddon: Boolean(whaleAddon),
        ipAddress: ip,
      },
    })

    // Notify operator (non-blocking)
    sendEnquiryNotification(enquiry).catch((e) =>
      console.error('[api/enquiry] Mailer error:', e),
    )

    return NextResponse.json({ success: true, id: enquiry.id }, { status: 201 })
  } catch (err) {
    console.error('[api/enquiry]', err)
    return NextResponse.json({ error: 'Failed to submit enquiry.' }, { status: 500 })
  }
}

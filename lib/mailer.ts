/**
 * lib/mailer.ts
 * All transactional emails via Nodemailer.
 * Five email types: booking confirmation, operator alert, enquiry notification,
 * reef min-pax warning, and refund confirmation.
 */
import nodemailer from 'nodemailer'
import { prisma } from './db'
import type { Booking } from '@prisma/client'

// ── Transport ────────────────────────────────────────────────────────────────

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// ── Setting helpers ───────────────────────────────────────────────────────────

async function getSetting(key: string, fallback = ''): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key } })
  return s?.value ?? fallback
}

const FROM_ADDRESS = `"Tahi Tonga" <${process.env.SMTP_FROM ?? 'no-reply@tahitonga.com'}>`

// ── Friendly tour names ───────────────────────────────────────────────────────

const TOUR_NAMES: Record<string, string> = {
  whale_day_trip: 'Ultimate Day Trip',
  whale_3day: 'Whale Watch 3-Day Special',
  whale_5day: 'Whale Watch 5-Day Special',
  island_reef: 'Outer Reef Excursion',
  whale_charter: 'Whale Watch Charter',
  island_charter: 'Island Exclusive Charter',
  game_fishing: 'Game Fishing Charter',
}

function tourName(id: string) {
  return TOUR_NAMES[id] ?? id
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-NZ', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatTop(amount: number | string | { toString(): string }) {
  return `TOP$ ${Number(amount).toFixed(2)}`
}

// ── 1. Guest booking confirmation ─────────────────────────────────────────────

export async function sendBookingConfirmation({
  booking,
  dates,
}: {
  booking: Booking
  dates: string[]
}) {
  const meetingPoint = await getSetting('email_meeting_point')
  const inclusions  = await getSetting('email_inclusions')
  const whatToBring = await getSetting('email_what_to_bring')

  const dateList = dates.map((d) => `• ${formatDate(d)}`).join('\n')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1a1a2e">
      <div style="background:#0a4f6e;padding:32px 24px;text-align:center">
        <img src="${process.env.NEXT_PUBLIC_APP_URL}/logo.png" alt="Tahi Tonga" height="48" style="margin-bottom:8px"/>
        <h1 style="color:#fff;margin:0;font-size:22px">Booking Confirmed! 🐋</h1>
      </div>
      <div style="padding:32px 24px;background:#fff">
        <p>Kia orana ${booking.guestName},</p>
        <p>Your booking for <strong>${tourName(booking.tourId)}</strong> is confirmed. We can't wait to welcome you!</p>

        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          <tr><td style="padding:8px;color:#666">Booking Ref</td><td style="padding:8px;font-weight:bold">${booking.reference}</td></tr>
          <tr style="background:#f7f7f7"><td style="padding:8px;color:#666">Tour</td><td style="padding:8px">${tourName(booking.tourId)}</td></tr>
          <tr><td style="padding:8px;color:#666">Guest</td><td style="padding:8px">${booking.guestName}</td></tr>
          <tr style="background:#f7f7f7"><td style="padding:8px;color:#666">Guests</td><td style="padding:8px">${booking.numGuests}</td></tr>
          <tr><td style="padding:8px;color:#666">Date(s)</td><td style="padding:8px">${dates.map(formatDate).join('<br/>')}</td></tr>
          <tr style="background:#f7f7f7"><td style="padding:8px;color:#666">Amount Paid</td><td style="padding:8px;font-weight:bold">${formatTop(booking.amountTop)}</td></tr>
          ${booking.promoCode ? `<tr><td style="padding:8px;color:#666">Promo Code</td><td style="padding:8px">${booking.promoCode} (−${formatTop(booking.discountTop)})</td></tr>` : ''}
        </table>

        ${meetingPoint ? `<h3 style="color:#0a4f6e">Meeting Point</h3><p>${meetingPoint}</p>` : ''}
        ${inclusions ? `<h3 style="color:#0a4f6e">What's Included</h3><p>${inclusions}</p>` : ''}
        ${whatToBring ? `<h3 style="color:#0a4f6e">What to Bring</h3><p>${whatToBring}</p>` : ''}
        ${booking.specialRequests ? `<h3 style="color:#0a4f6e">Your Special Requests</h3><p>${booking.specialRequests}</p>` : ''}

        <p style="margin-top:24px">Our <a href="https://tahitonga.com/terms-conditions/" style="color:#0a4f6e">cancellation policy</a> applies to this booking.</p>
        <p>Questions? Reply to this email or contact us at info@tahitonga.com</p>
        <p style="color:#999;font-size:12px;margin-top:32px">Tahi Tonga Whale Watching · Neiafu, Vavaʻu, Tonga</p>
      </div>
    </div>
  `

  await getTransport().sendMail({
    from: FROM_ADDRESS,
    to: booking.guestEmail,
    subject: `Booking Confirmed — ${tourName(booking.tourId)} · ${booking.reference}`,
    html,
    text: `Booking Confirmed!\n\nRef: ${booking.reference}\nTour: ${tourName(booking.tourId)}\nDates:\n${dateList}\nGuests: ${booking.numGuests}\nTotal: ${formatTop(booking.amountTop)}\n\nSee you soon!`,
  })
}

// ── 2. Operator new booking alert ─────────────────────────────────────────────

export async function sendOperatorBookingAlert({
  booking,
  dates,
}: {
  booking: Booking
  dates: string[]
}) {
  const operatorEmail = await getSetting('operator_email', 'info@tahitonga.com')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="background:#0a4f6e;color:#fff;padding:16px 24px;margin:0">
        New Booking: ${booking.reference}
      </h2>
      <div style="padding:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#666;width:140px">Tour</td><td>${tourName(booking.tourId)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Guest</td><td>${booking.guestName}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Email</td><td>${booking.guestEmail}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Phone</td><td>${booking.guestPhone ?? '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Guests</td><td>${booking.numGuests}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Date(s)</td><td>${dates.map(formatDate).join('<br/>')}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Amount</td><td><strong>${formatTop(booking.amountTop)}</strong></td></tr>
          ${booking.promoCode ? `<tr><td style="padding:6px 0;color:#666">Promo</td><td>${booking.promoCode}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#666">Special Requests</td><td>${booking.specialRequests ?? '—'}</td></tr>
        </table>
        <p style="margin-top:24px">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/bookings/${booking.id}" style="background:#0a4f6e;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">
            View in Admin Panel
          </a>
        </p>
      </div>
    </div>
  `

  await getTransport().sendMail({
    from: FROM_ADDRESS,
    to: operatorEmail,
    subject: `New Booking: ${booking.reference} — ${tourName(booking.tourId)}`,
    html,
  })
}

// ── 3. Enquiry submission notification ───────────────────────────────────────

export async function sendEnquiryNotification(enquiry: {
  tourId: string
  guestName: string
  guestEmail: string
  guestPhone?: string | null
  groupSize?: number | null
  preferredDates?: string | null
  message?: string | null
  whaleAddon: boolean
  id: number
}) {
  const operatorEmail = await getSetting('operator_email', 'info@tahitonga.com')

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="background:#1a6e4f;color:#fff;padding:16px 24px;margin:0">
        New Enquiry — ${tourName(enquiry.tourId)}
      </h2>
      <div style="padding:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#666;width:140px">Tour</td><td>${tourName(enquiry.tourId)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Guest</td><td>${enquiry.guestName}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Email</td><td>${enquiry.guestEmail}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Phone</td><td>${enquiry.guestPhone ?? '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Group Size</td><td>${enquiry.groupSize ?? '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Preferred Dates</td><td>${enquiry.preferredDates ?? '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Message</td><td>${enquiry.message ?? '—'}</td></tr>
          ${enquiry.whaleAddon ? '<tr><td style="padding:6px 0;color:#666">Add-on</td><td>🐋 Whale Watch Add-on requested</td></tr>' : ''}
        </table>
        <p style="margin-top:24px">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/enquiries/${enquiry.id}" style="background:#1a6e4f;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">
            View in Admin Panel
          </a>
        </p>
      </div>
    </div>
  `

  await getTransport().sendMail({
    from: FROM_ADDRESS,
    to: operatorEmail,
    subject: `New Enquiry — ${tourName(enquiry.tourId)} from ${enquiry.guestName}`,
    html,
  })
}

// ── 4. Outer Reef minimum pax warning ────────────────────────────────────────

export async function sendReefMinPaxWarning(date: string, confirmedSeats: number) {
  const operatorEmail = await getSetting('operator_email', 'info@tahitonga.com')

  await getTransport().sendMail({
    from: FROM_ADDRESS,
    to: operatorEmail,
    subject: `⚠️ Outer Reef Min Pax Not Met — ${formatDate(date)}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#c0392b">Outer Reef — Minimum Passengers Not Met</h2>
        <p>The Outer Reef Excursion scheduled for <strong>${formatDate(date)}</strong> has only 
           <strong>${confirmedSeats} confirmed seat(s)</strong> with the cutoff at 5pm today.</p>
        <p>Minimum required: 4 guests.</p>
        <p>Please contact all booked guests for this date to offer alternative dates or a full refund.</p>
        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/bookings?date=${date}&tour=island_reef" style="background:#c0392b;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">
            View Bookings for This Date
          </a>
        </p>
      </div>
    `,
  })
}

// ── 5. Refund confirmation ────────────────────────────────────────────────────

export async function sendRefundConfirmation({
  booking,
  refundAmount,
  method,
}: {
  booking: Booking
  refundAmount: number
  method: string
}) {
  await getTransport().sendMail({
    from: FROM_ADDRESS,
    to: booking.guestEmail,
    subject: `Refund Processed — ${booking.reference}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;color:#1a1a2e">
        <div style="background:#0a4f6e;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:20px">Refund Confirmation</h1>
        </div>
        <div style="padding:32px 24px;background:#fff">
          <p>Kia orana ${booking.guestName},</p>
          <p>We have processed a refund for your booking <strong>${booking.reference}</strong>.</p>

          <table style="width:100%;border-collapse:collapse;margin:24px 0">
            <tr><td style="padding:8px;color:#666">Booking Ref</td><td style="padding:8px">${booking.reference}</td></tr>
            <tr style="background:#f7f7f7"><td style="padding:8px;color:#666">Original Amount</td><td style="padding:8px">${formatTop(booking.amountTop)}</td></tr>
            <tr><td style="padding:8px;color:#666">Refund Amount</td><td style="padding:8px;font-weight:bold;color:#0a4f6e">${formatTop(refundAmount)}</td></tr>
          </table>

          <p>${method === 'egate' ? 'Your refund has been processed and should appear in your account within 3–5 business days.' : 'Your refund will be processed manually by our team within 3–5 business days.'}</p>
          <p>Our full <a href="https://tahitonga.com/terms-conditions/" style="color:#0a4f6e">cancellation policy</a> applies. Questions? Contact us at info@tahitonga.com</p>
          <p style="color:#999;font-size:12px;margin-top:32px">Tahi Tonga Whale Watching · Neiafu, Vavaʻu, Tonga</p>
        </div>
      </div>
    `,
  })
}

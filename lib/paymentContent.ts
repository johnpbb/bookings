/**
 * lib/paymentContent.ts
 * Pay by link: shared names and the staff-editable receipt wording. Safe to import from client components.
 * A payment is stored as a booking with this tour ID, so it uses the same ANZ checkout,
 * booking numbers, admin screens and refunds as every other booking.
 */

export const PAYMENT_TOUR_ID = 'payment'
export const PAYMENT_TOUR_NAME = 'Payment'
export const PAYMENT_EMAIL_KEY = 'email_payment_body'

export const MIN_PAYMENT_TOP = 1
export const MAX_PAYMENT_TOP = 50000

export function isPayment(tourId: string): boolean {
  return tourId === PAYMENT_TOUR_ID
}

export const DEFAULT_PAYMENT_EMAIL_BODY = [
  '<p>Thank you for your payment to Tahi Tonga. Please keep this email as your receipt.</p>',
  '<p>If you have any questions about this payment, please get in touch at <a href="mailto:info@tahitonga.com">info@tahitonga.com</a>. We’re always happy to help!</p>',
  '<p>Mālō ’aupito,<br>The Tahi Tonga Team</p>',
].join('')

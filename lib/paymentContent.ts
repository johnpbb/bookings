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
  '<p>Thank you for making your payment to Tahi Tonga.</p>',
  '<p>Please get in touch if you have any questions!</p>',
  '<p>Visit <a href="https://tahitonga.com/terms-conditions/">https://tahitonga.com/terms-conditions/</a> for booking Terms and Conditions<br>',
  'Visit <a href="https://tahitonga.com/faqs/">https://tahitonga.com/faqs/</a> for Frequently Asked Questions</p>',
  '<p>Mālō ’aupito – The Tahi Tonga Team<br>',
  'WhatsApp: <a href="https://wa.me/6767320810">+676 7320810</a></p>',
].join('')

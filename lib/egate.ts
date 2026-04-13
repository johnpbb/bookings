/**
 * lib/egate.ts
 * ANZ eGate integration — HMAC-SHA256 redirect/post-back model.
 *
 * Flow:
 *   1. buildPaymentRedirect() → signed fields POSTed to ANZ hosted page
 *   2. validateCallback()     → validates HMAC on ANZ post-back
 *   3. processEgateRefund()   → calls ANZ refund API
 */
import crypto from 'crypto'
import { prisma } from './db'

// ── Config helpers ────────────────────────────────────────────────────────────

async function getSetting(key: string, fallback = ''): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key } })
  return s?.value ?? fallback
}

async function merchantId(): Promise<string> {
  return getSetting('egate_merchant_id')
}

async function sharedSecret(): Promise<string> {
  return getSetting('egate_shared_secret')
}

async function endpoint(): Promise<string> {
  const sandbox = await getSetting('egate_sandbox', 'true')
  return sandbox === 'true'
    ? await getSetting('egate_sandbox_endpoint', 'https://test-gateway.mastercard.com/api/nvp/version/61')
    : await getSetting('egate_endpoint', 'https://gateway.mastercard.com/api/nvp/version/61')
}

// ── 1. Build payment redirect ─────────────────────────────────────────────────

export interface EgateRedirectResult {
  actionUrl: string
  fields: Record<string, string>
  orderId: string
}

export async function buildPaymentRedirect(
  bookingId: number,
  booking: {
    reference: string
    tourId: string
    amountTop: number | string | { toString(): string }
    currency?: string
  },
): Promise<EgateRedirectResult> {
  const mid = await merchantId()
  const secret = await sharedSecret()
  const actionUrl = await endpoint()

  const amount = Number(booking.amountTop).toFixed(2)
  const currency = booking.currency ?? 'TOP'
  const orderId = generateOrderId(bookingId, booking.reference)
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/booking/result?order_id=${encodeURIComponent(orderId)}`
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)

  const fields: Record<string, string> = {
    merchant: mid,
    'order.id': orderId,
    'order.amount': amount,
    'order.currency': currency,
    'order.description': `Tahi Tonga — ${friendlyTourName(booking.tourId)} (${booking.reference})`,
    'transaction.id': '1',
    'return.url': returnUrl,
    timestamp,
  }

  // HMAC: sort keys alphabetically, concatenate key=value, sign
  const sortedKeys = Object.keys(fields).sort()
  const sigString = sortedKeys.map((k) => `${k}=${fields[k]}`).join('')
  const signature = crypto.createHmac('sha256', secret).update(sigString).digest('hex')

  // Store order ID against booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: { egateOrderId: orderId },
  })

  return {
    actionUrl,
    fields: { ...fields, signature, action: 'PURCHASE' },
    orderId,
  }
}

// ── 2. Validate callback ──────────────────────────────────────────────────────

export interface CallbackResult {
  valid: boolean
  success: boolean
  orderId?: string
  txnRef?: string
  error?: string
}

export async function validateCallback(postData: Record<string, string>): Promise<CallbackResult> {
  const secret = await sharedSecret()
  const receivedSig = postData['signature'] ?? ''

  if (!receivedSig) {
    return { valid: false, success: false, error: 'Missing signature.' }
  }

  // Rebuild signature (exclude 'signature' field)
  const fieldsToSign = { ...postData }
  delete fieldsToSign['signature']

  const sortedKeys = Object.keys(fieldsToSign).sort()
  const sigString = sortedKeys.map((k) => `${k}=${fieldsToSign[k]}`).join('')
  const expected = crypto.createHmac('sha256', secret).update(sigString).digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSig))) {
    return { valid: false, success: false, error: 'HMAC signature mismatch.' }
  }

  const result = postData['result'] ?? ''
  const orderId = postData['order.id'] ?? ''
  const txnRef = postData['order.merchant.transaction'] ?? postData['transaction.id'] ?? ''

  return {
    valid: true,
    success: result === 'SUCCESS',
    orderId,
    txnRef,
  }
}

// ── 3. Process refund ─────────────────────────────────────────────────────────

export async function processEgateRefund(
  bookingId: number,
  orderId: string,
  refundAmount: number,
): Promise<boolean> {
  const mid = await merchantId()
  const secret = await sharedSecret()
  const url = await endpoint()
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)

  const fields: Record<string, string> = {
    merchant: mid,
    'order.id': orderId,
    'transaction.id': '2',
    'transaction.amount': refundAmount.toFixed(2),
    'transaction.currency': 'TOP',
    timestamp,
  }

  const sortedKeys = Object.keys(fields).sort()
  const sigString = sortedKeys.map((k) => `${k}=${fields[k]}`).join('')
  const signature = crypto.createHmac('sha256', secret).update(sigString).digest('hex')

  const body = new URLSearchParams({ ...fields, signature, action: 'REFUND' })

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    const text = await res.text()
    const parsed = Object.fromEntries(new URLSearchParams(text))

    if (parsed['result'] === 'SUCCESS') {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'refunded', refundedAt: new Date() },
      })
      return true
    }

    console.error(`[eGate] Refund failed for order ${orderId}:`, parsed)
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'refund_failed' },
    })
    return false
  } catch (err) {
    console.error('[eGate] Refund network error:', err)
    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'refund_failed' },
    })
    return false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateOrderId(bookingId: number, ref: string): string {
  const hash = crypto.createHash('md5').update(ref).digest('hex').slice(0, 8).toUpperCase()
  return `TT-${bookingId}-${hash}`
}

function friendlyTourName(tourId: string): string {
  const names: Record<string, string> = {
    whale_day_trip: 'Whale Watch Day Trip',
    whale_3day: 'Whale Watch 3-Day Special',
    whale_5day: 'Whale Watch 5-Day Special',
    island_reef: 'Outer Reef Excursion',
  }
  return names[tourId] ?? tourId
}

export function callbackUrl(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/egate/callback`
}

/**
 * lib/egate.ts
 * ANZ eGate integration — REST JSON API (Hosted Checkout Session).
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

// We map egate_shared_secret to the new API password concept
async function apiPassword(): Promise<string> {
  return getSetting('egate_shared_secret')
}

// Ensure base URL leverages the merchant's configured endpoint or defaults to standard MPGS V61 REST
async function endpoint(): Promise<string> {
  const sandbox = await getSetting('egate_sandbox', 'true')
  // For ANZ eGate, the host is usually the same for sandbox and production
  const host = 'https://anzegate.gateway.mastercard.com'
  return `${host}/api/rest/version/100`
}

function getAuthHeader(mid: string, pass: string): string {
  return 'Basic ' + Buffer.from(`merchant.${mid}:${pass}`).toString('base64')
}

// ── 1. Create Checkout Session ────────────────────────────────────────────────

export interface EgateSessionResult {
  sessionId: string
  successIndicator: string
  orderId: string
  version: string
}

export async function buildPaymentSession(
  bookingId: number,
  booking: {
    reference: string
    tourId: string
    amountTop: number | string | { toString(): string }
    currency?: string
    origin?: string
  },
): Promise<EgateSessionResult> {
  const mid = await merchantId()
  const pass = await apiPassword()
  const baseUrl = await endpoint()
  const url = `${baseUrl}/merchant/${mid}/session`

  const amount = Number(booking.amountTop).toFixed(2)
  const currency = booking.currency ?? 'TOP'
  const orderId = generateOrderId(bookingId, booking.reference)
  
  // Use Database setting, then runtime APP_URL, then fallback
  const dbAppUrl = await getSetting('app_url')
  const baseAppUrl = booking.origin || dbAppUrl || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bookings.tahitonga.com'
  const returnUrl = `${baseAppUrl}/booking/result?order_id=${encodeURIComponent(orderId)}`

  const payload = {
    apiOperation: 'INITIATE_CHECKOUT',
    interaction: {
      operation: 'PURCHASE',
      returnUrl,
      merchant: {
        name: 'Tahi Tonga',
      },
      displayControl: {
        billingAddress: 'HIDE',
      }
    },
    order: {
      id: orderId,
      amount: amount,
      currency: currency,
      description: `Tahi Tonga — ${friendlyTourName(booking.tourId)} (${booking.reference})`,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(mid, pass),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[eGate] Failed to create session:', errText)
    throw new Error(`eGate Session Error: ${res.status} - ${errText}`)
  }

  const data = await res.json()

  if (data.result !== 'SUCCESS') {
    throw new Error(data.error?.explanation || 'Session creation returned non-SUCCESS.')
  }

  // Store order ID against booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: { egateOrderId: orderId },
  })

  return {
    sessionId: data.session.id,
    successIndicator: data.successIndicator,
    orderId,
    version: data.session.version
  }
}

// ── 2. Verify Payment Order Status ──────────────────────────────────────────

export interface VerifyOrderResult {
  success: boolean
  status: 'CAPTURED' | 'FAILED' | 'PENDING' | 'UNKNOWN'
  txnRef?: string
  error?: string
}

export async function verifyPaymentOrder(orderId: string): Promise<VerifyOrderResult> {
  const mid = await merchantId()
  const pass = await apiPassword()
  const baseUrl = await endpoint()
  const url = `${baseUrl}/merchant/${mid}/order/${orderId}`

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': getAuthHeader(mid, pass),
      },
      // Prevent aggressive caching
      cache: 'no-store'
    })

    if (!res.ok) {
      // Order might not exist if user abandoned before payment
      return { success: false, status: 'UNKNOWN' }
    }

    const data = await res.json()

    if (data.result === 'SUCCESS' && (data.status === 'CAPTURED' || data.status === 'AUTHORIZED')) {
      const txnRef = data.transaction?.[0]?.transaction?.id ?? ''
      return { success: true, status: 'CAPTURED', txnRef }
    } else if (data.status === 'FAILED') {
      return { success: false, status: 'FAILED' }
    } else {
      return { success: false, status: 'PENDING' }
    }
  } catch (err) {
    console.error('[eGate] Verify network error:', err)
    return { success: false, status: 'UNKNOWN', error: 'Network error verifying order.' }
  }
}

// ── 3. Process refund ─────────────────────────────────────────────────────────

export async function processEgateRefund(
  bookingId: number,
  orderId: string,
  refundAmount: number,
): Promise<boolean> {
  const mid = await merchantId()
  const pass = await apiPassword()
  const baseUrl = await endpoint()

  // A transaction ID is needed for refunds, unique per refund.
  const txnId = `REF-${Date.now()}`
  const url = `${baseUrl}/merchant/${mid}/order/${orderId}/transaction/${txnId}`

  const payload = {
    apiOperation: 'REFUND',
    transaction: {
      amount: refundAmount.toFixed(2),
      currency: 'TOP',
    }
  }

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': getAuthHeader(mid, pass),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (res.ok && data.result === 'SUCCESS') {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'refunded', refundedAt: new Date() },
      })
      return true
    }

    console.error(`[eGate] Refund failed for order ${orderId}:`, data)
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
  return `TT-${bookingId}-${hash.substring(0, 5)}`
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

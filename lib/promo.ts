/**
 * lib/promo.ts
 * Promo code validation — always server-side only.
 * Five rules must all pass: active, uses, tour, date window, sunday exclusion.
 */
import { prisma } from './db'

export interface PromoValidationResult {
  valid: boolean
  code?: string
  discount?: number      // raw value: dollar amount if 'fixed', percentage points if 'percent'
  discountType?: string  // 'fixed' | 'percent'
  error?: string
}

export async function validatePromo(
  code: string,
  tourId: string,
  dates: string[],
): Promise<PromoValidationResult> {
  const upperCode = code.toUpperCase().trim()

  const promo = await prisma.promoCode.findUnique({
    where: { code: upperCode },
  })

  // Rule 1: exists and is active
  if (!promo || !promo.isActive) {
    return { valid: false, error: 'Invalid or inactive promo code.' }
  }

  // Rule 2: uses count
  if (promo.maxUses !== null && promo.usesCount >= promo.maxUses) {
    return { valid: false, error: 'This promo code has reached its maximum uses.' }
  }

  // Rule 3: applicable tours
  if (promo.applicableTours) {
    const allowed = promo.applicableTours.split(',').map((t) => t.trim())
    if (!allowed.includes(tourId)) {
      return { valid: false, error: 'This promo code is not valid for this tour.' }
    }
  }

  // Rule 4: date window — ALL selected dates must fall within the window
  if (promo.validDateStart || promo.validDateEnd) {
    for (const dateStr of dates) {
      const d = new Date(dateStr)
      if (promo.validDateStart && d < promo.validDateStart) {
        return {
          valid: false,
          error: `This promo code is only valid from ${promo.validDateStart.toISOString().slice(0, 10)}.`,
        }
      }
      if (promo.validDateEnd && d > promo.validDateEnd) {
        return {
          valid: false,
          error: `This promo code expired on ${promo.validDateEnd.toISOString().slice(0, 10)}.`,
        }
      }
    }
  }

  // Rule 5: Sunday exclusion
  if (promo.excludeSundays) {
    for (const dateStr of dates) {
      if (new Date(dateStr).getDay() === 0) {
        return {
          valid: false,
          error: 'This promo code cannot be applied to bookings that include a Sunday.',
        }
      }
    }
  }

  return {
    valid: true,
    code: upperCode,
    discount: Number(promo.discountValue),
    discountType: promo.discountType,
  }
}

/**
 * Atomically increment uses_count for a promo code.
 * Called inside the booking transaction to prevent over-use.
 */
export async function incrementPromoUses(code: string): Promise<void> {
  await prisma.promoCode.update({
    where: { code: code.toUpperCase() },
    data: { usesCount: { increment: 1 } },
  })
}

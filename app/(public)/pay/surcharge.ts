import { prisma } from '@/lib/db'
import type { Surcharge } from './PayClient'

export async function loadSurcharge(): Promise<Surcharge> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['payment_surcharge_enabled', 'payment_surcharge_label', 'payment_surcharge_type', 'payment_surcharge_amount'] } },
  })
  const get = (k: string) => rows.find(r => r.key === k)?.value ?? ''
  return {
    enabled: get('payment_surcharge_enabled') === 'true',
    label: get('payment_surcharge_label') || 'Payment surcharge',
    type: (get('payment_surcharge_type') || 'percentage') as 'fixed' | 'percentage',
    amount: parseFloat(get('payment_surcharge_amount')) || 0,
  }
}

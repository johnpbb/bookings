import type { Metadata } from 'next'
import PayClient from './PayClient'
import { loadSurcharge } from './surcharge'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Make a Payment — Tahi Tonga',
  description: 'Make a secure card payment to Tahi Tonga.',
}

export default async function PayPage() {
  return <PayClient surcharge={await loadSurcharge()} />
}

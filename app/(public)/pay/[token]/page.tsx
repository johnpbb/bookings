import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { isLinkPaid } from '@/lib/payments'
import PayClient from '../PayClient'
import { loadSurcharge } from '../surcharge'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Make a Payment — Tahi Tonga',
  robots: { index: false },
}

function Notice({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="result-card failure" style={{ margin: '80px auto' }}>
      <span className="result-icon">{icon}</span>
      <h1>{title}</h1>
      <p>{text}</p>
      <p>Questions? <a href="mailto:info@tahitonga.com">info@tahitonga.com</a></p>
    </div>
  )
}

export default async function PaymentLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const link = await prisma.paymentLink.findUnique({ where: { token } })

  if (!link || link.status !== 'open') {
    return <Notice icon="🔗" title="Payment Link Not Active" text="This payment link isn't active any more. Please contact us and we'll send you a new one." />
  }
  if (await isLinkPaid(link.id)) {
    return <Notice icon="✅" title="Already Paid" text="This payment has already been made. Thank you! Your receipt was emailed when it was paid." />
  }

  return (
    <PayClient
      surcharge={await loadSurcharge()}
      fixed={{
        token: link.token,
        amount: Number(link.amountTop),
        description: link.description,
        guestName: link.guestName ?? '',
        guestEmail: link.guestEmail ?? '',
      }}
    />
  )
}

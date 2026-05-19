import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { to } = await req.json()

  const operatorEmail = await prisma.setting
    .findUnique({ where: { key: 'operator_email' } })
    .then(s => s?.value ?? 'info@tahitonga.com')

  const recipient = (to as string | undefined)?.trim() || operatorEmail

  const config = {
    host: process.env.SMTP_HOST ?? '(not set)',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '(not set)',
    from: process.env.SMTP_FROM ?? 'no-reply@tahitonga.com',
    hasPass: !!(process.env.SMTP_PASS),
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({
      success: false,
      error: 'SMTP environment variables are not set on this server.',
      config,
    })
  }

  try {
    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: process.env.SMTP_PASS },
    })

    await transport.sendMail({
      from: `"Tahi Tonga" <${config.from}>`,
      to: recipient,
      subject: 'Tahi Tonga — Test Email',
      text: 'This is a test email from the Tahi Tonga bookings system. If you received this, email sending is working correctly.',
      html: '<p>This is a test email from the <strong>Tahi Tonga</strong> bookings system.</p><p>If you received this, email sending is working correctly. ✅</p>',
    })

    return NextResponse.json({ success: true, sentTo: recipient, config })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: message, config })
  }
}

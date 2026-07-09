import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'node:fs'
import path from 'node:path'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const envFilePath = path.join(process.cwd(), '.env.production.local')
  let envFile: { exists: boolean; mtime?: string; content?: string } = { exists: false }
  try {
    const stat = fs.statSync(envFilePath)
    envFile = {
      exists: true,
      mtime: stat.mtime.toISOString(),
      content: fs.readFileSync(envFilePath, 'utf8'),
    }
  } catch {
    envFile = { exists: false }
  }

  return NextResponse.json({
    pid: process.pid,
    uptimeSeconds: process.uptime(),
    processStartedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    nodeEnv: process.env.NODE_ENV,
    nextDeploymentIdEnv: process.env.NEXT_DEPLOYMENT_ID ?? null,
    cwd: process.cwd(),
    envFile,
  })
}

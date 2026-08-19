import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userId = (session.user as any).id
    const now = new Date()

    // Find any active pending verification
    const verification = await prisma.workVerification.findFirst({
      where: {
        userId,
        status: 'PENDING',
        expiresAt: { gt: now }
      },
      orderBy: { sentAt: 'desc' }
    })

    if (!verification) {
      return NextResponse.json(null)
    }

    return NextResponse.json(verification)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check verification' }, { status: 500 })
  }
}

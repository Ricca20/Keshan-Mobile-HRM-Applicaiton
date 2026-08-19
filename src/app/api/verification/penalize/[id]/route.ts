import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const verification = await prisma.workVerification.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!verification) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 })
    }

    if (verification.status !== 'MISSED') {
      return NextResponse.json({ error: 'Only missed verifications can be penalized' }, { status: 400 })
    }

    // Use a transaction to safely mark penalized and increment user points
    const result = await prisma.$transaction(async (tx) => {
      await tx.workVerification.update({
        where: { id },
        data: { status: 'PENALIZED' }
      })

      const updatedUser = await tx.user.update({
        where: { id: verification.userId },
        data: {
          penaltyPoints: { increment: 1 }
        }
      })

      return updatedUser
    })

    // Notify employee of penalty
    await prisma.notification.create({
      data: {
        userId: verification.userId,
        title: 'Penalty Assigned',
        message: 'You have been assigned 1 penalty point for missing a work verification check.',
        type: 'PAYROLL'
      }
    })

    return NextResponse.json({ success: true, points: result.penaltyPoints })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to penalize' }, { status: 500 })
  }
}

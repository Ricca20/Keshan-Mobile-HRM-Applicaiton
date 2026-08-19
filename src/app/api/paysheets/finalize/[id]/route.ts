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

    const paysheet = await prisma.paySheet.findUnique({ where: { id } })
    if (!paysheet) {
      return NextResponse.json({ error: 'Paysheet not found' }, { status: 404 })
    }

    if (paysheet.status === 'FINALIZED') {
      return NextResponse.json({ error: 'Paysheet is already finalized' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const paysheet = await tx.paySheet.update({
        where: { id },
        data: {
          status: 'FINALIZED',
          finalizedAt: new Date(),
          finalizedBy: (session.user as any).id
        },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      })

      // Reset penalty points after finalizing
      await tx.user.update({
        where: { id: paysheet.userId },
        data: { penaltyPoints: 0 }
      })

      return paysheet
    })

    // Notify Employee
    if (updated && updated.user) {
      const { sendNotificationEmail } = await import('@/lib/mail')
      
      const monthName = new Date(2000, updated.month - 1).toLocaleString('default', { month: 'long' })
      
      // In-app Notification
      await prisma.notification.create({
        data: {
          userId: updated.userId,
          title: 'Paysheet Finalized',
          message: `Your paysheet for ${monthName} ${updated.year} has been finalized.`,
          type: 'PAYROLL'
        }
      })
      
      // Email Notification
      await sendNotificationEmail({
        to: updated.user.email,
        subject: `Paysheet Finalized - ${monthName} ${updated.year}`,
        html: `<p>Hello <strong>${updated.user.name}</strong>,</p>
               <p>Your paysheet for <strong>${monthName} ${updated.year}</strong> has been finalized by HR.</p>
               <p>Please log in to the HRM system to view your net pay and full breakdown.</p>`
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to finalize paysheet' }, { status: 500 })
  }
}

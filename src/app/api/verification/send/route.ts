import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendNotificationEmail } from '@/lib/mail'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId } = await req.json()

    const employee = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const now = new Date()
    // 2-minute expiration
    const expiresAt = new Date(now.getTime() + 60 * 1000 * 2)

    const verification = await prisma.workVerification.create({
      data: {
        userId,
        expiresAt
      }
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Send Email
    await sendNotificationEmail({
      to: employee.email,
      subject: 'URGENT: Active Work Verification',
      html: `<p>Hello <strong>${employee.name}</strong>,</p>
             <p>Your manager has requested a manual active work verification check.</p>
             <p>Please click the button below within <strong>2 minutes</strong> to confirm you are actively working.</p>
             <a href="${baseUrl}/verify/${verification.id}" style="display:inline-block;padding:10px 20px;background-color:#3b82f6;color:white;text-decoration:none;border-radius:5px;font-weight:bold;">Verify Now</a>`
    })

    return NextResponse.json(verification)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send verification ping' }, { status: 500 })
  }
}

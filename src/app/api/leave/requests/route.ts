import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateLeaveDays } from '@/lib/leave'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1, 'Leave Type is required'),
  startDate: z.string().min(1, 'Start Date is required'),
  endDate: z.string().min(1, 'End Date is required'),
  reason: z.string().min(1, 'Reason is required'),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    
    let where: any = {}
    
    // Employee can only see their own requests
    if ((session.user as any).role === 'EMPLOYEE') {
      where.userId = (session.user as any).id
    } else if (userId) {
      where.userId = userId
    }

    if (status) {
      where.status = status
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, shop: { select: { name: true } } } },
        leaveType: { select: { name: true, isPaid: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(requests)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const userId = (session.user as any).id
    const body = await req.json()
    const validatedData = leaveRequestSchema.parse(body)

    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)

    if (startDate > endDate) {
      return NextResponse.json({ error: 'Start Date cannot be after End Date' }, { status: 400 })
    }

    const totalDays = calculateLeaveDays(startDate, endDate)

    // Check balance
    const currentYear = startDate.getFullYear()
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId,
          leaveTypeId: validatedData.leaveTypeId,
          year: currentYear
        }
      }
    })

    if (!balance) {
      return NextResponse.json({ error: 'No leave balance found for this type. Contact Admin.' }, { status: 400 })
    }

    const remainingDays = balance.totalDays - balance.usedDays
    if (totalDays > remainingDays) {
      return NextResponse.json({ error: `Insufficient balance. You requested ${totalDays} day(s), but only have ${remainingDays} day(s) remaining.` }, { status: 400 })
    }

    // Check for overlapping APPROVED or PENDING leave
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: { in: ['APPROVED', 'PENDING'] },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } }
        ]
      }
    })

    if (overlapping) {
      return NextResponse.json({ error: 'You already have a pending or approved leave request during this period.' }, { status: 400 })
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveTypeId: validatedData.leaveTypeId,
        startDate,
        endDate,
        totalDays,
        reason: validatedData.reason,
        status: 'PENDING'
      }
    })

    // Notify Admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true } })
    const employee = await prisma.user.findUnique({ where: { id: userId } })
    
    if (admins.length > 0 && employee) {
      const { sendNotificationEmail } = await import('@/lib/mail')
      
      for (const admin of admins) {
        // In-app Notification
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'New Leave Request',
            message: `${employee.name} has requested ${totalDays} day(s) of leave.`,
            type: 'LEAVE_REQUEST'
          }
        })
        
        // Email Notification
        await sendNotificationEmail({
          to: admin.email,
          subject: 'New Leave Request - PhoneShop HRM',
          html: `<p><strong>${employee.name}</strong> has requested ${totalDays} day(s) of leave.</p>
                 <p><strong>Reason:</strong> ${validatedData.reason}</p>
                 <p><strong>Dates:</strong> ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}</p>
                 <p>Please log in to the HRM system to review.</p>`
        })
      }
    }

    return NextResponse.json(leaveRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 })
  }
}

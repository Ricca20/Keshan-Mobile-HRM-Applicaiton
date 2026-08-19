import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  approverNote: z.string().optional(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const validatedData = reviewSchema.parse(body)

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id }
    })

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    const currentYear = leaveRequest.startDate.getFullYear()

    // Transaction to safely update request and balance together
    const result = await prisma.$transaction(async (tx) => {
      // 1. If currently PENDING and moving to APPROVED: Increment usedDays
      // 2. If currently APPROVED and moving to REJECTED: Decrement usedDays
      
      if (leaveRequest.status === 'PENDING' && validatedData.status === 'APPROVED') {
        await tx.leaveBalance.update({
          where: {
            userId_leaveTypeId_year: {
              userId: leaveRequest.userId,
              leaveTypeId: leaveRequest.leaveTypeId,
              year: currentYear
            }
          },
          data: {
            usedDays: { increment: leaveRequest.totalDays }
          }
        })
      } else if (leaveRequest.status === 'APPROVED' && validatedData.status === 'REJECTED') {
        await tx.leaveBalance.update({
          where: {
            userId_leaveTypeId_year: {
              userId: leaveRequest.userId,
              leaveTypeId: leaveRequest.leaveTypeId,
              year: currentYear
            }
          },
          data: {
            usedDays: { decrement: leaveRequest.totalDays }
          }
        })
      }

      // Update the request
      const updatedRequest = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: validatedData.status,
          approverNote: validatedData.approverNote,
          approvedBy: (session.user as any).id,
          reviewedAt: new Date()
        },
        include: {
          user: { select: { name: true, email: true } },
          leaveType: { select: { name: true } }
        }
      })

      return updatedRequest
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to review leave request' }, { status: 500 })
  }
}

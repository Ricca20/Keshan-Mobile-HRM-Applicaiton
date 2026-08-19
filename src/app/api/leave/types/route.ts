import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncLeaveBalances } from '@/lib/leave'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  daysAllowed: z.number().min(0, 'Days must be at least 0'),
  isPaid: z.boolean(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Both ADMIN and EMPLOYEE need to see leave types
    const types = await prisma.leaveType.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(types)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validatedData = leaveTypeSchema.parse(body)

    const existing = await prisma.leaveType.findUnique({
      where: { name: validatedData.name }
    })

    if (existing) {
      return NextResponse.json({ error: 'A leave type with this name already exists' }, { status: 400 })
    }

    const leaveType = await prisma.leaveType.create({
      data: validatedData
    })

    // Automatically generate balances for all active employees
    await syncLeaveBalances(leaveType.id, leaveType.daysAllowed)

    return NextResponse.json(leaveType)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create leave type' }, { status: 500 })
  }
}

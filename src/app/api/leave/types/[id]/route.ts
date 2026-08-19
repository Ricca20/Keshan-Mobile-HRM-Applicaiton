import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const leaveTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  daysAllowed: z.number().min(0, 'Days must be at least 0'),
  isPaid: z.boolean(),
  isActive: z.boolean(),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const validatedData = leaveTypeSchema.parse(body)

    const existing = await prisma.leaveType.findFirst({
      where: { name: validatedData.name, NOT: { id } }
    })

    if (existing) {
      return NextResponse.json({ error: 'Another leave type with this name already exists' }, { status: 400 })
    }

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data: validatedData
    })

    // If daysAllowed is changed, we *could* update existing balances, but typically
    // it only applies to future balances or you run a manual script.
    // For now, we'll just update the type.

    return NextResponse.json(leaveType)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update leave type' }, { status: 500 })
  }
}

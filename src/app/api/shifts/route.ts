import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const shiftSchema = z.object({
  userId: z.string().min(1, 'Employee is required'),
  shopId: z.string().min(1, 'Shop is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const shopId = searchParams.get('shopId')
    const userId = searchParams.get('userId')

    const where: any = {}
    if (start && end) {
      where.date = { gte: new Date(start), lte: new Date(end) }
    }
    if (shopId) where.shopId = shopId
    
    // If user is employee, only allow viewing their own shifts or their shop's shifts depending on rules.
    // For now, if role is employee, enforce their own userId
    if ((session.user as any).role === 'EMPLOYEE') {
      where.userId = (session.user as any).id
    } else if (userId) {
      where.userId = userId
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        shop: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    })
    
    return NextResponse.json(shifts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validatedData = shiftSchema.parse(body)

    const shift = await prisma.shift.create({
      data: {
        userId: validatedData.userId,
        shopId: validatedData.shopId,
        date: new Date(validatedData.date),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(shift)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 })
  }
}

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const shopSchema = z.object({
  name: z.string().min(1, 'Shop name is required'),
  address: z.string().min(1, 'Address is required'),
  locationLat: z.number().default(0),
  locationLng: z.number().default(0),
  allowedIp: z.string().min(7, 'A valid IP address is required'),
  radiusMeters: z.number().default(100),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const validatedData = shopSchema.parse(body)

    const shop = await prisma.shop.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(shop)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update shop' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    
    // Check if shop has users or shifts
    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, shifts: true, clockLogs: true }
        }
      }
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    if (shop._count.users > 0 || shop._count.shifts > 0 || shop._count.clockLogs > 0) {
      return NextResponse.json(
        { error: 'Cannot delete shop with existing employees, shifts, or logs.' },
        { status: 400 }
      )
    }

    await prisma.shop.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete shop' }, { status: 500 })
  }
}

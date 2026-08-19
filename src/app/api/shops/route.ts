import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const shopSchema = z.object({
  name: z.string().min(1, 'Shop name is required'),
  address: z.string().min(1, 'Address is required'),
  locationLat: z.number().default(0), // Simplified, no complex location tracking needed
  locationLng: z.number().default(0),
  allowedIp: z.string().min(7, 'A valid IP address is required'),
  radiusMeters: z.number().default(100),
})

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const shops = await prisma.shop.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(shops)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validatedData = shopSchema.parse(body)

    const shop = await prisma.shop.create({
      data: validatedData,
    })

    return NextResponse.json(shop)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create shop' }, { status: 500 })
  }
}

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const dateStr = searchParams.get('date') // YYYY-MM-DD
    
    let where: any = {}
    if (dateStr) {
      const start = new Date(dateStr)
      start.setHours(0, 0, 0, 0)
      const end = new Date(dateStr)
      end.setHours(23, 59, 59, 999)
      where.timestamp = { gte: start, lte: end }
    }

    const logs = await prisma.clockLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        shop: { select: { name: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit to recent 100 logs for performance
    })
    
    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch clock logs' }, { status: 500 })
  }
}

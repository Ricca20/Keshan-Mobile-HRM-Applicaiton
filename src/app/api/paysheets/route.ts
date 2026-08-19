import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const userId = searchParams.get('userId')
    
    let where: any = {}
    
    if (month) where.month = parseInt(month)
    if (year) where.year = parseInt(year)

    // Employees can only see their own FINALIZED paysheets
    if ((session.user as any).role === 'EMPLOYEE') {
      where.userId = (session.user as any).id
      where.status = 'FINALIZED'
    } else if (userId) {
      where.userId = userId
    }

    const paysheets = await prisma.paySheet.findMany({
      where,
      include: {
        user: { select: { name: true, shop: { select: { name: true } } } }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { user: { name: 'asc' } }
      ]
    })

    return NextResponse.json(paysheets)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch paysheets' }, { status: 500 })
  }
}

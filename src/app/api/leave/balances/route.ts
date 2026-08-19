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
    const userId = searchParams.get('userId') || (session.user as any).id
    const currentYear = new Date().getFullYear()

    // Ensure users can only query their own balances unless they are an admin
    if ((session.user as any).role !== 'ADMIN' && userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const balances = await prisma.leaveBalance.findMany({
      where: {
        userId,
        year: currentYear
      },
      include: {
        leaveType: true
      },
      orderBy: {
        leaveType: { name: 'asc' }
      }
    })

    return NextResponse.json(balances)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leave balances' }, { status: 500 })
  }
}

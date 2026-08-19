import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const paysheet = await prisma.paySheet.findUnique({ where: { id } })
    if (!paysheet) {
      return NextResponse.json({ error: 'Paysheet not found' }, { status: 404 })
    }

    if (paysheet.status === 'FINALIZED') {
      return NextResponse.json({ error: 'Paysheet is already finalized' }, { status: 400 })
    }

    const updated = await prisma.paySheet.update({
      where: { id },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
        finalizedBy: (session.user as any).id
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to finalize paysheet' }, { status: 500 })
  }
}

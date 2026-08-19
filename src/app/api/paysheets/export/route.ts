import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePaysheetExcel } from '@/lib/excel'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const month = parseInt(searchParams.get('month') || '')
    const year = parseInt(searchParams.get('year') || '')

    if (isNaN(month) || isNaN(year)) {
      return NextResponse.json({ error: 'Valid month and year required' }, { status: 400 })
    }

    const paysheets = await prisma.paySheet.findMany({
      where: { month, year },
      include: {
        user: { select: { name: true, shop: { select: { name: true } } } }
      },
      orderBy: { user: { name: 'asc' } }
    })

    if (paysheets.length === 0) {
      return NextResponse.json({ error: 'No paysheets found for this month' }, { status: 404 })
    }

    const buffer = generatePaysheetExcel(paysheets)

    // Return as a downloadable Excel file
    const headers = new Headers()
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    headers.set('Content-Disposition', `attachment; filename=Paysheets_${year}_${month}.xlsx`)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to export paysheets' }, { status: 500 })
  }
}

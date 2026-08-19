import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePaySheetData } from '@/lib/paysheet'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const generateSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { month, year } = generateSchema.parse(body)

    const employees = await prisma.user.findMany({
      where: { isActive: true, role: 'EMPLOYEE' }
    })

    const generatedIds = []

    for (const emp of employees) {
      // Check if a finalized paysheet already exists
      const existing = await prisma.paySheet.findUnique({
        where: { userId_month_year: { userId: emp.id, month, year } }
      })

      if (existing && existing.status === 'FINALIZED') {
        continue // Skip finalized ones
      }

      const data = await generatePaySheetData(emp.id, month, year)

      const result = await prisma.paySheet.upsert({
        where: { userId_month_year: { userId: emp.id, month, year } },
        update: data,
        create: data
      })
      
      generatedIds.push(result.id)
    }

    return NextResponse.json({ 
      success: true, 
      generatedCount: generatedIds.length,
      message: `Successfully generated ${generatedIds.length} paysheets.`
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to generate paysheets' }, { status: 500 })
  }
}

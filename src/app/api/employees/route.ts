import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  shopId: z.string().min(1, 'Shop assignment is required'),
  salary: z.number().min(0, 'Salary must be positive'),
})

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      include: { shop: true },
      orderBy: { name: 'asc' },
    })
    
    // Omit passwords from response
    const safeEmployees = employees.map(({ password, ...rest }) => rest)
    return NextResponse.json(safeEmployees)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const validatedData = employeeSchema.parse(body)

    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    const employee = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        shopId: validatedData.shopId,
        salary: validatedData.salary,
        role: 'EMPLOYEE',
      },
      include: { shop: true }
    })

    const { password, ...safeEmployee } = employee
    return NextResponse.json(safeEmployee)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}

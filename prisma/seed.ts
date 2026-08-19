import { PrismaClient } from '../src/generated/prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
async function main() {
  console.log('🌱 Seeding database...')

  // Create shop 1
  const shop1 = await prisma.shop.create({
    data: {
      name: 'Phone Shop - Main Branch',
      address: '123 Main Street, Colombo',
      locationLat: 6.9271, // REPLACE with actual GPS
      locationLng: 79.8612, // REPLACE with actual GPS
      allowedIp: '203.0.113.1', // REPLACE with shop WiFi public IP
      radiusMeters: 100,
    },
  })
  console.log('✅ Created shop 1:', shop1.name)

  // Create shop 2
  const shop2 = await prisma.shop.create({
    data: {
      name: 'Phone Shop - Branch 2',
      address: '456 Second Street, Colombo',
      locationLat: 6.935, // REPLACE with actual GPS
      locationLng: 79.85, // REPLACE with actual GPS
      allowedIp: '203.0.113.2', // REPLACE with shop WiFi public IP
      radiusMeters: 100,
    },
  })
  console.log('✅ Created shop 2:', shop2.name)

  // Create admin (owner)
  const owner = await prisma.user.create({
    data: {
      name: 'Shop Owner',
      email: 'owner@phoneshop.lk',
      password: await bcrypt.hash('changeme123', 12),
      role: 'ADMIN',
      salary: 0,
      shopId: shop1.id,
    },
  })
  console.log('✅ Created admin:', owner.email)

  // Create a sample employee
  const employee = await prisma.user.create({
    data: {
      name: 'John Employee',
      email: 'john@phoneshop.lk',
      password: await bcrypt.hash('employee123', 12),
      role: 'EMPLOYEE',
      salary: 50000,
      shopId: shop1.id,
    },
  })
  console.log('✅ Created sample employee:', employee.email)

  // Create default leave types
  const leaveTypes = [
    { name: 'Annual Leave', daysAllowed: 14, isPaid: true },
    { name: 'Sick Leave', daysAllowed: 7, isPaid: true },
    { name: 'Casual Leave', daysAllowed: 3, isPaid: true },
    { name: 'No-Pay Leave', daysAllowed: 30, isPaid: false },
  ]

  for (const lt of leaveTypes) {
    const leaveType = await prisma.leaveType.create({ data: lt })
    console.log('✅ Created leave type:', leaveType.name)

    // Create leave balances for the employee
    const currentYear = new Date().getFullYear()
    await prisma.leaveBalance.create({
      data: {
        userId: employee.id,
        leaveTypeId: leaveType.id,
        year: currentYear,
        totalDays: lt.daysAllowed,
        usedDays: 0,
      },
    })
  }

  console.log('\n🎉 Seed complete!')
  console.log('\n📋 Login credentials:')
  console.log('   Admin: owner@phoneshop.lk / changeme123')
  console.log('   Employee: john@phoneshop.lk / employee123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

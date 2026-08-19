import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReportClient } from './report-client'

export default async function AdminReportsPage() {
  const session = await auth()

  // 1. Employee Distribution by Shop
  const shops = await prisma.shop.findMany({
    include: {
      _count: {
        select: { users: { where: { role: 'EMPLOYEE', isActive: true } } }
      }
    }
  })
  
  const shopStats = shops.map(s => ({
    name: s.name.replace(' Branch', '').replace('Phone Shop - ', ''), // Shorten names for chart
    employees: s._count.users
  }))

  // 2. Leave Requests Breakdown
  const leaveCounts = await prisma.leaveRequest.groupBy({
    by: ['status'],
    _count: { _all: true }
  })
  
  const leaveStats = leaveCounts.map(l => ({
    name: l.status,
    value: l._count._all
  }))

  // 3. Attendance Trends (Last 7 Days)
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    return d
  }).reverse()

  const attendanceStats = await Promise.all(days.map(async (day) => {
    const startOfDay = new Date(day.setHours(0, 0, 0, 0))
    const endOfDay = new Date(day.setHours(23, 59, 59, 999))
    
    const count = await prisma.clockLog.findMany({
      where: {
        type: 'IN',
        timestamp: { gte: startOfDay, lte: endOfDay }
      },
      distinct: ['userId']
    })

    return {
      date: startOfDay.toLocaleDateString('en-US', { weekday: 'short' }),
      clockIns: count.length
    }
  }))

  return (
    <div className="max-w-6xl mx-auto pt-4 pb-20">
      <div className="text-center sm:text-left mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics & Reports</h1>
        <p className="text-slate-500 mt-1">Visualize shop performance and export payroll data.</p>
      </div>

      <ReportClient 
        shopStats={shopStats}
        leaveStats={leaveStats}
        attendanceStats={attendanceStats}
      />
    </div>
  )
}

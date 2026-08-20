import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReportClient } from './report-client'

export default async function AdminReportsPage() {
  const session = await auth()

  // 1. Get active employees for attendance tracking
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE', isActive: true },
    select: { id: true, name: true }
  })
  
  const employeeNames = employees.map(e => e.name)

  // 2. Attendance Trends (Last 7 Days)
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    return d
  }).reverse()

  const attendanceStats = await Promise.all(days.map(async (day) => {
    const startOfDay = new Date(day.setHours(0, 0, 0, 0))
    const endOfDay = new Date(day.setHours(23, 59, 59, 999))
    
    const logs = await prisma.clockLog.findMany({
      where: {
        timestamp: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { timestamp: 'asc' },
      select: { type: true, timestamp: true, user: { select: { name: true } } }
    })

    const userHours: Record<string, number> = {}
    const userLogs: Record<string, any[]> = {}
    
    logs.forEach(l => {
       if (!userLogs[l.user.name]) userLogs[l.user.name] = []
       userLogs[l.user.name].push(l)
    })

    for (const name in userLogs) {
       let totalHours = 0
       let inTime: Date | null = null
       userLogs[name].forEach(log => {
          if (log.type === 'IN') {
             inTime = log.timestamp
          } else if (log.type === 'OUT' && inTime) {
             totalHours += (log.timestamp.getTime() - inTime.getTime()) / (1000 * 60 * 60)
             inTime = null
          }
       })
       userHours[name] = parseFloat(totalHours.toFixed(2))
    }

    const statObj: any = {
      date: startOfDay.toLocaleDateString('en-US', { weekday: 'short' }),
    }

    employees.forEach(emp => {
      // Use null instead of 0 if they didn't work so the line breaks naturally
      statObj[emp.name] = userHours[emp.name] || null
    })

    return statObj
  }))

  return (
    <div className="max-w-6xl mx-auto pt-4 pb-20">
      <div className="text-center sm:text-left mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics & Reports</h1>
        <p className="text-slate-500 mt-1">View employee attendance trends and export payroll data.</p>
      </div>

      <ReportClient 
        attendanceStats={attendanceStats}
        employeeNames={employeeNames}
      />
    </div>
  )
}

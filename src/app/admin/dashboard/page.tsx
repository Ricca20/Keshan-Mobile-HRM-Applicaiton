import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  Users,
  Clock,
  TreePalm,
  AlertTriangle,
  DollarSign,
  UserX,
  FileSpreadsheet
} from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const session = await auth()

  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0))
  const endOfDay = new Date(today.setHours(23, 59, 59, 999))
  
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  // 1. Total Employees
  const totalEmployees = await prisma.user.count({
    where: { role: 'EMPLOYEE', isActive: true }
  })

  // 2. Clocked In Today (Unique users who have an 'IN' log today)
  const clockInsToday = await prisma.clockLog.findMany({
    where: {
      type: 'IN',
      timestamp: { gte: startOfDay, lte: endOfDay }
    },
    distinct: ['userId']
  })
  const clockedInCount = clockInsToday.length

  // 3. Pending Leave
  const pendingLeaves = await prisma.leaveRequest.count({
    where: { status: 'PENDING' }
  })

  // 4. Flagged Entries (Clock logs that were flagged today)
  const flaggedEntries = await prisma.clockLog.count({
    where: {
      isValid: false,
      timestamp: { gte: startOfDay, lte: endOfDay }
    }
  })

  // 5. Unfinalized Paysheets (Drafts for current month)
  const draftPaysheets = await prisma.paySheet.count({
    where: { status: 'DRAFT', month: currentMonth, year: currentYear }
  })

  // 6. Absent Today (Total - Clocked In - Approved Leave today)
  // Get users on approved leave today
  const onLeaveToday = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: endOfDay },
      endDate: { gte: startOfDay }
    },
    distinct: ['userId']
  })
  const absentCount = Math.max(0, totalEmployees - clockedInCount - onLeaveToday.length)

  const statCards = [
    {
      title: 'Total Employees',
      value: totalEmployees.toString(),
      subtitle: 'Active staff members',
      icon: Users,
      color: 'from-indigo-600 to-violet-600',
      shadow: 'shadow-indigo-500/20',
      href: '/admin/employees'
    },
    {
      title: 'Clocked In Today',
      value: clockedInCount.toString(),
      subtitle: 'Currently at work',
      icon: Clock,
      color: 'from-emerald-600 to-teal-600',
      shadow: 'shadow-emerald-500/20',
      href: '/admin/attendance'
    },
    {
      title: 'Pending Leave',
      value: pendingLeaves.toString(),
      subtitle: 'Awaiting approval',
      icon: TreePalm,
      color: 'from-amber-600 to-orange-600',
      shadow: 'shadow-amber-500/20',
      href: '/admin/leave'
    },
    {
      title: 'Flagged Entries',
      value: flaggedEntries.toString(),
      subtitle: 'Security warnings today',
      icon: AlertTriangle,
      color: 'from-red-600 to-rose-600',
      shadow: 'shadow-red-500/20',
      href: '/admin/attendance'
    },
    {
      title: 'Draft Paysheets',
      value: draftPaysheets.toString(),
      subtitle: `For ${new Date(2000, currentMonth - 1).toLocaleString('default', { month: 'short' })}`,
      icon: FileSpreadsheet,
      color: 'from-blue-600 to-cyan-600',
      shadow: 'shadow-blue-500/20',
      href: '/admin/paysheets'
    },
    {
      title: 'Absent Today',
      value: absentCount.toString(),
      subtitle: 'Scheduled but not in',
      icon: UserX,
      color: 'from-slate-600 to-slate-500',
      shadow: 'shadow-slate-500/20',
      href: '/admin/attendance'
    },
  ]

  // Get recent 5 leave requests for the widget
  const recentLeaves = await prisma.leaveRequest.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true } }, leaveType: { select: { name: true } } }
  })

  // Get recent 5 clock logs
  const recentLogs = await prisma.clockLog.findMany({
    take: 5,
    orderBy: { timestamp: 'desc' },
    include: { user: { select: { name: true } } }
  })

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Welcome back, {session?.user?.name ?? 'Admin'} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening across your shops today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.title} href={card.href}>
              <div
                className="group relative bg-card border rounded-2xl p-5 transition-all duration-300 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer h-full"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    <p className="text-3xl font-bold tracking-tight">
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  </div>
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} shadow-lg ${card.shadow} transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Attendance Activity</h3>
          {recentLogs.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center p-4">No recent clock logs.</p>
          ) : (
            <div className="space-y-4">
              {recentLogs.map(log => (
                <div key={log.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${log.type === 'IN' ? 'bg-green-500' : 'bg-orange-500'}`} />
                    <span className="font-medium">{log.user.name}</span>
                    <span className="text-muted-foreground">clocked {log.type.toLowerCase()}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              ))}
              <Link href="/admin/attendance" className="block text-center text-sm text-primary hover:underline mt-2">
                View all logs &rarr;
              </Link>
            </div>
          )}
        </div>

        <div className="bg-card border rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Leave Requests</h3>
          {recentLeaves.length === 0 ? (
             <p className="text-sm text-muted-foreground text-center p-4">No recent leave requests.</p>
          ) : (
            <div className="space-y-4">
              {recentLeaves.map(req => (
                <div key={req.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{req.user.name}</p>
                    <p className="text-xs text-muted-foreground">{req.leaveType.name} - {req.totalDays} day(s)</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {req.status}
                  </div>
                </div>
              ))}
              <Link href="/admin/leave" className="block text-center text-sm text-primary hover:underline mt-2">
                View all leaves &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

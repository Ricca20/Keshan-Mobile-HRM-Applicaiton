import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Clock, Calendar, TreePalm, Receipt, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function EmployeeDashboard() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) return null

  // 1. Current Clock Status
  const lastLog = await prisma.clockLog.findFirst({
    where: { userId },
    orderBy: { timestamp: 'desc' }
  })
  const isClockedIn = lastLog?.type === 'IN'

  // 2. This Week's Shifts (Clock Ins in last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentShifts = await prisma.clockLog.count({
    where: {
      userId,
      type: 'IN',
      timestamp: { gte: sevenDaysAgo }
    }
  })

  // 3. Leave Left
  const currentYear = new Date().getFullYear()
  const balances = await prisma.leaveBalance.findMany({
    where: { userId, year: currentYear }
  })
  let totalLeaveDays = 0
  let usedLeaveDays = 0
  balances.forEach(b => {
    totalLeaveDays += b.totalDays
    usedLeaveDays += b.usedDays
  })
  const remainingLeave = totalLeaveDays - usedLeaveDays

  // 4. Latest Paysheet
  const latestPaysheet = await prisma.paySheet.findFirst({
    where: { userId, status: 'FINALIZED' },
    orderBy: [{ year: 'desc' }, { month: 'desc' }]
  })

  return (
    <div className="animate-fade-in space-y-6 max-w-lg mx-auto pb-24">
      {/* Greeting */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold text-foreground">
          Hi, {session?.user?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Clock Status Card */}
      <Link href="/employee/clock" className="block">
        <div className="bg-card border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors shadow-sm">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-2 mb-4 ${isClockedIn ? 'bg-green-500/10 border-green-500/50' : 'bg-slate-500/10 border-slate-500/50'}`}>
            <Clock className={`w-8 h-8 ${isClockedIn ? 'text-green-500' : 'text-slate-400'}`} />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Current Status</p>
          <p className={`text-2xl font-bold ${isClockedIn ? 'text-green-500' : 'text-foreground'}`}>
            {isClockedIn ? 'Clocked In' : 'Not Clocked In'}
          </p>
          <div className="flex items-center justify-center text-xs text-primary mt-4 gap-1 font-medium">
            Go to Clock Page <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </Link>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600/15 mx-auto mb-2">
            <Calendar className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <p className="text-xs text-muted-foreground">Past 7 Days</p>
          <p className="text-lg font-bold mt-0.5">{recentShifts} shifts</p>
        </div>

        <Link href="/employee/leave" className="block">
          <div className="bg-card border rounded-2xl p-4 text-center hover:border-primary/50 transition-colors h-full">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-600/15 mx-auto mb-2">
              <TreePalm className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <p className="text-xs text-muted-foreground">Leave Left</p>
            <p className="text-lg font-bold mt-0.5">{remainingLeave} days</p>
          </div>
        </Link>

        <Link href="/employee/paysheet" className="col-span-2">
          <div className="bg-card border rounded-2xl p-4 text-center hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/15 mx-auto mb-2">
              <Receipt className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-xs text-muted-foreground">Latest Paysheet</p>
            {latestPaysheet ? (
              <div className="mt-1">
                <p className="text-lg font-bold text-primary">Rs. {latestPaysheet.netPay.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{new Date(2000, latestPaysheet.month - 1).toLocaleString('default', { month: 'short' })} {latestPaysheet.year}</p>
              </div>
            ) : (
              <p className="text-lg font-bold mt-0.5">No paysheets yet</p>
            )}
          </div>
        </Link>
      </div>
    </div>
  )
}

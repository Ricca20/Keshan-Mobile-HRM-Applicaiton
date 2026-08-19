import { prisma } from './prisma'
import { getDaysInMonth } from 'date-fns'

/**
 * Calculates the number of valid clocked days for a user in a given month.
 */
export async function countValidClockDays(userId: string, month: number, year: number): Promise<number> {
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

  // Get all valid clock-ins for the month
  const clockIns = await prisma.clockLog.findMany({
    where: {
      userId,
      type: 'IN',
      isValid: true,
      timestamp: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
    select: { timestamp: true }
  })

  // To count unique days, format timestamp to YYYY-MM-DD and add to a Set
  const uniqueDays = new Set(
    clockIns.map(log => log.timestamp.toISOString().split('T')[0])
  )

  return uniqueDays.size
}

/**
 * Generates the paysheet data for an employee for a specific month.
 * This does NOT save it to the DB; it returns the calculated object.
 */
export async function generatePaySheetData(userId: string, month: number, year: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error(`User ${userId} not found`)

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

  // As per client preference, working days = total days in the month
  const workingDays = getDaysInMonth(startOfMonth)

  // Get approved paid leave days in this month
  const paidLeave = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      leaveType: { isPaid: true },
      startDate: { gte: startOfMonth },
      endDate: { lte: endOfMonth },
    }
  })
  const paidLeaveDays = paidLeave.reduce((sum, req) => sum + req.totalDays, 0)

  // Get approved unpaid leave days
  const unpaidLeave = await prisma.leaveRequest.findMany({
    where: {
      userId,
      status: 'APPROVED',
      leaveType: { isPaid: false },
      startDate: { gte: startOfMonth },
      endDate: { lte: endOfMonth },
    }
  })
  const unpaidLeaveDays = unpaidLeave.reduce((sum, req) => sum + req.totalDays, 0)

  // Get valid clock-in days
  const clockedDays = await countValidClockDays(userId, month, year)

  // Days employee was absent (no clock in, no leave recorded)
  // Prevent negative absent days if clockedDays + leaveDays > workingDays (unlikely, but safe)
  let absentDays = workingDays - clockedDays - paidLeaveDays - unpaidLeaveDays
  if (absentDays < 0) absentDays = 0

  const dailyRate = user.salary / workingDays
  const deductionFromAbsence = absentDays * dailyRate
  const deductionFromUnpaid = unpaidLeaveDays * dailyRate

  // Penalty Calculation: Deduct a base amount per 10 points (can be overridden by admin later)
  const penaltySets = Math.floor(user.penaltyPoints / 10)
  const penaltyDeduction = penaltySets * 1000 // 1000 deduction per 10 points

  const totalDeductions = deductionFromAbsence + deductionFromUnpaid + penaltyDeduction
  const netPay = user.salary - totalDeductions

  let deductionNote = ''
  if (penaltyDeduction > 0) {
    deductionNote = `Salary cut for ${user.penaltyPoints} Penalty Points.`
  }

  return {
    userId,
    month,
    year,
    baseSalary: user.salary,
    paidDays: workingDays - unpaidLeaveDays - absentDays, // Equivalent to clockedDays + paidLeaveDays
    unpaidDays: unpaidLeaveDays + absentDays,
    deductions: totalDeductions,
    deductionNote: deductionNote || null,
    bonuses: 0, // default, admin can change
    netPay,
    status: 'DRAFT' as const
  }
}

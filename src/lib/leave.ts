import { prisma } from './prisma'

/**
 * Calculates the total number of leave days between two dates.
 * Since this is a retail phone shop, we include weekends.
 * @param startDate Start date of the leave
 * @param endDate End date of the leave
 * @returns Total number of days
 */
export function calculateLeaveDays(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1 // Inclusive of both start and end dates
}

/**
 * Syncs LeaveBalance records for all active employees for a given leave type.
 * Used when a new LeaveType is created or when needing to ensure everyone has a balance.
 * @param leaveTypeId ID of the LeaveType
 * @param daysAllowed Number of days allowed per year
 */
export async function syncLeaveBalances(leaveTypeId: string, daysAllowed: number) {
  const currentYear = new Date().getFullYear()

  // Get all active employees
  const employees = await prisma.user.findMany({
    where: { isActive: true, role: 'EMPLOYEE' },
    select: { id: true }
  })

  // Upsert a LeaveBalance for each employee for the current year
  for (const emp of employees) {
    await prisma.leaveBalance.upsert({
      where: {
        userId_leaveTypeId_year: {
          userId: emp.id,
          leaveTypeId,
          year: currentYear
        }
      },
      create: {
        userId: emp.id,
        leaveTypeId,
        year: currentYear,
        totalDays: daysAllowed,
        usedDays: 0
      },
      update: {
        // We do not change usedDays or totalDays on sync, 
        // to avoid overwriting existing data. 
        // If daysAllowed changes, we might want to update totalDays, 
        // but for now we'll just ensure the record exists.
      }
    })
  }
}

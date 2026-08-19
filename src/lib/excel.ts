import * as XLSX from 'xlsx'

type ExportablePaysheet = {
  user: {
    name: string
    shop: {
      name: string
    } | null
  }
  month: number
  year: number
  baseSalary: number
  paidDays: number
  unpaidDays: number
  deductions: number
  bonuses: number
  netPay: number
  status: string
}

export function generatePaysheetExcel(paysheets: ExportablePaysheet[]): Buffer {
  const rows = paysheets.map(p => ({
    'Employee': p.user.name,
    'Shop': p.user.shop?.name || 'Unassigned',
    'Month': `${p.month}/${p.year}`,
    'Base Salary': p.baseSalary.toFixed(2),
    'Paid Days': p.paidDays,
    'Unpaid Days': p.unpaidDays,
    'Deductions': p.deductions.toFixed(2),
    'Bonuses': p.bonuses.toFixed(2),
    'Net Pay': p.netPay.toFixed(2),
    'Status': p.status,
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  
  // Basic column width formatting
  ws['!cols'] = [
    { wch: 25 }, // Employee
    { wch: 25 }, // Shop
    { wch: 10 }, // Month
    { wch: 15 }, // Base Salary
    { wch: 10 }, // Paid Days
    { wch: 12 }, // Unpaid Days
    { wch: 15 }, // Deductions
    { wch: 15 }, // Bonuses
    { wch: 15 }, // Net Pay
    { wch: 12 }, // Status
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Paysheet')
  
  // Generate buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

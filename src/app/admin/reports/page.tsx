'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminReportsPage() {
  const today = new Date()
  const [filterMonth, setFilterMonth] = useState(today.getMonth() + 1)
  const [filterYear, setFilterYear] = useState(today.getFullYear())

  const handleExport = () => {
    window.location.href = `/api/paysheets/export?month=${filterMonth}&year=${filterYear}`
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Export system data and payroll records.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 text-green-700 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <CardTitle>Payroll Export (Excel)</CardTitle>
              <CardDescription>Download a comprehensive spreadsheet of all paysheets for a given month.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Month</label>
              <select 
                className="w-full p-2 rounded-md border bg-background"
                value={filterMonth} 
                onChange={(e) => setFilterMonth(Number(e.target.value))}
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Year</label>
              <input 
                type="number" 
                className="w-full p-2 rounded-md border bg-background"
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
              />
            </div>
          </div>
          
          <Button className="w-full mt-4" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Download Excel File
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

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
    <div className="space-y-6 max-w-3xl mx-auto pt-4 pb-20">
      <div className="text-center sm:text-left mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1">Export system data and payroll records.</p>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <FileSpreadsheet className="w-48 h-48 text-emerald-900" />
        </div>
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm border border-emerald-100">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">Payroll Export (Excel)</CardTitle>
              <CardDescription className="text-slate-500 mt-1 text-sm">Download a comprehensive spreadsheet of all paysheets for a given month.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6 md:p-8 relative z-10 bg-white">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-semibold text-slate-700">Month</label>
              <select 
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                value={filterMonth} 
                onChange={(e) => setFilterMonth(Number(e.target.value))}
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-semibold text-slate-700">Year</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
              />
            </div>
          </div>
          
          <Button 
            className="w-full mt-4 h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-500/20 text-md rounded-xl" 
            onClick={handleExport}
          >
            <Download className="w-5 h-5 mr-2" /> Download Excel File
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

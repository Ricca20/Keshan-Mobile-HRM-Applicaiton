'use client'

import { useQuery } from '@tanstack/react-query'
import { FileText, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useState } from 'react'

type PaySheet = {
  id: string
  month: number
  year: number
  baseSalary: number
  paidDays: number
  unpaidDays: number
  deductions: number
  bonuses: number
  netPay: number
  bonusNote: string | null
  deductionNote: string | null
  status: 'DRAFT' | 'FINALIZED'
  finalizedAt: string
}

export default function EmployeePaysheetsPage() {
  const [selectedPaysheet, setSelectedPaysheet] = useState<PaySheet | null>(null)

  const { data: paysheets = [], isLoading } = useQuery<PaySheet[]>({
    queryKey: ['myPaysheets'],
    queryFn: async () => {
      const res = await fetch('/api/paysheets')
      if (!res.ok) throw new Error('Failed to fetch paysheets')
      return res.json()
    }
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Paysheets</h1>
        <p className="text-muted-foreground">View your salary history and payroll records.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar List */}
        <div className="md:col-span-1 space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : paysheets.length === 0 ? (
            <div className="text-center p-8 border rounded-xl bg-card text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No finalized paysheets available yet.</p>
            </div>
          ) : (
            paysheets.map(ps => (
              <Card 
                key={ps.id} 
                className={`cursor-pointer transition-colors hover:border-primary ${selectedPaysheet?.id === ps.id ? 'border-primary ring-1 ring-primary' : ''}`}
                onClick={() => setSelectedPaysheet(ps)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-lg">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{new Date(2000, ps.month - 1).toLocaleString('default', { month: 'long' })} {ps.year}</h3>
                    <p className="text-sm text-muted-foreground">Rs. {ps.netPay.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail View */}
        <div className="md:col-span-2">
          {selectedPaysheet ? (
            <Card className="sticky top-6">
              <CardHeader className="border-b pb-6">
                <CardTitle className="text-2xl">
                  {new Date(2000, selectedPaysheet.month - 1).toLocaleString('default', { month: 'long' })} {selectedPaysheet.year}
                </CardTitle>
                <CardDescription>
                  Finalized on {new Date(selectedPaysheet.finalizedAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Paid Days</p>
                    <p className="text-2xl font-semibold">{selectedPaysheet.paidDays}</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Unpaid Days</p>
                    <p className="text-2xl font-semibold">{selectedPaysheet.unpaidDays}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-lg border-b pb-2">Salary Breakdown</h4>
                  
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Base Salary</span>
                    <span className="font-medium">Rs. {selectedPaysheet.baseSalary.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 text-red-600">
                    <div className="flex flex-col">
                      <span>Deductions (Absences/Unpaid Leave)</span>
                      {selectedPaysheet.deductionNote && <span className="text-xs italic">Note: {selectedPaysheet.deductionNote}</span>}
                    </div>
                    <span className="font-medium">- Rs. {selectedPaysheet.deductions.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-1 text-green-600">
                    <div className="flex flex-col">
                      <span>Bonuses / Allowances</span>
                      {selectedPaysheet.bonusNote && <span className="text-xs italic">Note: {selectedPaysheet.bonusNote}</span>}
                    </div>
                    <span className="font-medium">+ Rs. {selectedPaysheet.bonuses.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-dashed mt-2">
                    <span className="font-bold text-xl">Net Pay</span>
                    <span className="font-bold text-2xl text-primary">Rs. {selectedPaysheet.netPay.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="hidden md:flex h-full min-h-[400px] border-2 border-dashed rounded-xl items-center justify-center text-muted-foreground">
              <p>Select a paysheet from the list to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

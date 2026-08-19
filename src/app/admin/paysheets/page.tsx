'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Download, CheckCircle2, PlayCircle, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

type PaySheet = {
  id: string
  user: { name: string, shop: { name: string } }
  month: number
  year: number
  baseSalary: number
  netPay: number
  status: 'DRAFT' | 'FINALIZED'
}

export default function AdminPaysheetsPage() {
  const queryClient = useQueryClient()
  const today = new Date()
  const [filterMonth, setFilterMonth] = useState(today.getMonth() + 1)
  const [filterYear, setFilterYear] = useState(today.getFullYear())

  const { data: paysheets = [], isLoading } = useQuery<PaySheet[]>({
    queryKey: ['paysheets', filterMonth, filterYear],
    queryFn: async () => {
      const res = await fetch(`/api/paysheets?month=${filterMonth}&year=${filterYear}`)
      if (!res.ok) throw new Error('Failed to fetch paysheets')
      return res.json()
    }
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/paysheets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: filterMonth, year: filterYear })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      return data
    },
    onSuccess: (data) => {
      alert(data.message)
      queryClient.invalidateQueries({ queryKey: ['paysheets'] })
    },
    onError: (err: any) => alert(err.message)
  })

  const handleExport = () => {
    window.location.href = `/api/paysheets/export?month=${filterMonth}&year=${filterYear}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paysheets</h1>
          <p className="text-muted-foreground">Generate, review, and finalize monthly payroll.</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="p-2 rounded-md border bg-background"
            value={filterMonth} 
            onChange={(e) => setFilterMonth(Number(e.target.value))}
          >
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <input 
            type="number" 
            className="w-24 p-2 rounded-md border bg-background"
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
          />
          <Button variant="outline" onClick={handleExport} disabled={paysheets.length === 0}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Paysheets Overview</CardTitle>
            <CardDescription>Showing records for {filterMonth}/{filterYear}</CardDescription>
          </div>
          <Button onClick={() => generateMutation.mutate()} isLoading={generateMutation.isPending}>
            <PlayCircle className="w-4 h-4 mr-2" /> Generate Paysheets
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : paysheets.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-xl mt-4">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No paysheets found</h3>
              <p>Click "Generate Paysheets" to calculate payroll for this month.</p>
            </div>
          ) : (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-sm font-medium text-muted-foreground">
                    <th className="p-3">Employee</th>
                    <th className="p-3">Shop</th>
                    <th className="p-3">Base Salary</th>
                    <th className="p-3">Net Pay</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paysheets.map(ps => (
                    <tr key={ps.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-3 font-medium">{ps.user.name}</td>
                      <td className="p-3 text-sm text-muted-foreground">{ps.user.shop.name}</td>
                      <td className="p-3">Rs. {ps.baseSalary.toLocaleString()}</td>
                      <td className="p-3 font-semibold text-primary">Rs. {ps.netPay.toLocaleString()}</td>
                      <td className="p-3">
                        <Badge variant={ps.status === 'FINALIZED' ? 'success' : 'warning'}>
                          {ps.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Link href={`/admin/paysheets/${ps.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-2" /> View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

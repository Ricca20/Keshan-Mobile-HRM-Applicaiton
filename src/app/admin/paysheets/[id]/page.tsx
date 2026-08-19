'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Save, FileText, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function PaysheetDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const [bonuses, setBonuses] = useState<number>(0)
  const [deductions, setDeductions] = useState<number>(0)
  const [bonusNote, setBonusNote] = useState('')
  const [deductionNote, setDeductionNote] = useState('')

  const { data: ps, isLoading } = useQuery<any>({
    queryKey: ['paysheet', id],
    queryFn: async () => {
      const res = await fetch(`/api/paysheets/${id}`)
      if (!res.ok) throw new Error('Failed to fetch paysheet')
      return res.json()
    }
  })

  useEffect(() => {
    if (ps) {
      setBonuses(ps.bonuses)
      setDeductions(ps.deductions)
      setBonusNote(ps.bonusNote || '')
      setDeductionNote(ps.deductionNote || '')
    }
  }, [ps])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/paysheets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bonuses, deductions, bonusNote, deductionNote })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paysheet', id] })
      alert('Paysheet updated')
    },
    onError: (err: any) => alert(err.message)
  })

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/paysheets/finalize/${id}`, {
        method: 'POST'
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to finalize')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paysheet', id] })
      queryClient.invalidateQueries({ queryKey: ['paysheets'] })
      alert('Paysheet finalized!')
    },
    onError: (err: any) => alert(err.message)
  })

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!ps) return <div>Paysheet not found</div>

  const isDraft = ps.status === 'DRAFT'
  // Preview net pay calculation
  const netPayPreview = ps.baseSalary - deductions + bonuses

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Paysheet Details</h1>
          <p className="text-muted-foreground">{ps.user.name} - {ps.month}/{ps.year}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Overview</CardTitle>
              <Badge variant={isDraft ? 'warning' : 'success'}>{ps.status}</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Shop</p>
                  <p className="font-medium">{ps.user.shop.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Paid Days</p>
                  <p className="font-medium">{ps.paidDays}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Unpaid Days</p>
                  <p className="font-medium">{ps.unpaidDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adjustments</CardTitle>
              <CardDescription>Manually override bonuses or deductions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bonuses (Rs)</label>
                  <input
                    type="number"
                    disabled={!isDraft}
                    className="w-full p-2 rounded-md border bg-background disabled:opacity-50"
                    value={bonuses}
                    onChange={(e) => setBonuses(Number(e.target.value))}
                  />
                  <input
                    type="text"
                    disabled={!isDraft}
                    placeholder="Bonus note..."
                    className="w-full p-2 rounded-md border bg-background text-sm disabled:opacity-50"
                    value={bonusNote}
                    onChange={(e) => setBonusNote(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-red-600">Deductions (Rs)</label>
                  <input
                    type="number"
                    disabled={!isDraft}
                    className="w-full p-2 rounded-md border bg-background disabled:opacity-50"
                    value={deductions}
                    onChange={(e) => setDeductions(Number(e.target.value))}
                  />
                  <input
                    type="text"
                    disabled={!isDraft}
                    placeholder="Deduction note..."
                    className="w-full p-2 rounded-md border bg-background text-sm disabled:opacity-50"
                    value={deductionNote}
                    onChange={(e) => setDeductionNote(e.target.value)}
                  />
                </div>
              </div>

              {isDraft && (
                <div className="flex justify-end pt-4">
                  <Button onClick={() => updateMutation.mutate()} isLoading={updateMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" /> Save Adjustments
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Salary:</span>
                <span className="font-medium">Rs. {ps.baseSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Bonuses:</span>
                <span className="font-medium">+ Rs. {bonuses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Deductions:</span>
                <span className="font-medium">- Rs. {deductions.toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t flex justify-between font-bold text-lg">
                <span>Net Pay:</span>
                <span className="text-primary">Rs. {netPayPreview.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {isDraft && (
            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl border border-yellow-200">
              <div className="flex items-center gap-2 font-medium mb-2">
                <AlertTriangle className="w-5 h-5" />
                Draft Status
              </div>
              <p className="text-sm mb-4">
                This paysheet is in draft. Once finalized, it will be visible to the employee and locked from further edits.
              </p>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                onClick={() => {
                  if (confirm('Are you sure? This cannot be undone.')) {
                    finalizeMutation.mutate()
                  }
                }}
                disabled={finalizeMutation.isPending || updateMutation.isPending}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Finalize Paysheet
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

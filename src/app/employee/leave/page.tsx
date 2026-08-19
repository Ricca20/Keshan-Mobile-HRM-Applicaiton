'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Clock, FileText, Send, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type LeaveBalance = {
  id: string
  year: number
  totalDays: number
  usedDays: number
  leaveType: { id: string, name: string, isPaid: boolean }
}

type LeaveRequest = {
  id: string
  leaveType: { name: string, isPaid: boolean }
  startDate: string
  endDate: string
  totalDays: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  approverNote?: string | null
}

export default function EmployeeLeavePage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: ''
  })

  const { data: balances = [], isLoading: loadingBalances } = useQuery<LeaveBalance[]>({
    queryKey: ['leaveBalances'],
    queryFn: async () => {
      const res = await fetch('/api/leave/balances')
      if (!res.ok) throw new Error('Failed to fetch balances')
      return res.json()
    }
  })

  const { data: requests = [], isLoading: loadingRequests } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequestsEmployee'],
    queryFn: async () => {
      const res = await fetch('/api/leave/requests')
      if (!res.ok) throw new Error('Failed to fetch requests')
      return res.json()
    }
  })

  const requestMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      setErrorMsg(null)
      const res = await fetch('/api/leave/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit request')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequestsEmployee'] })
      setIsModalOpen(false)
      setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' })
    },
    onError: (err: any) => {
      setErrorMsg(err.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    requestMutation.mutate(formData)
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Leave</h1>
          <p className="text-muted-foreground">Manage your time off and view balances.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Send className="w-4 h-4 mr-2" /> Request Leave
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingBalances ? (
          [1,2,3,4].map(i => <Card key={i} className="h-32 animate-pulse bg-muted/50" />)
        ) : balances.length === 0 ? (
          <div className="col-span-full p-6 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>Your leave balances have not been generated yet. Please contact your manager.</p>
          </div>
        ) : (
          balances.map(balance => {
            const remaining = balance.totalDays - balance.usedDays
            const percentage = (balance.usedDays / balance.totalDays) * 100
            
            return (
              <Card key={balance.id} className="relative overflow-hidden">
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-primary transition-all" 
                  style={{ width: `${percentage}%` }}
                />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-center">
                    {balance.leaveType.name}
                    <Badge variant={balance.leaveType.isPaid ? 'success' : 'secondary'} size="sm">
                      {balance.leaveType.isPaid ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{remaining} <span className="text-sm font-normal text-muted-foreground">days left</span></div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Used {balance.usedDays} of {balance.totalDays}
                  </p>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave History</CardTitle>
          <CardDescription>Your past and pending leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
             <div className="flex justify-center p-8">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
             </div>
          ) : requests.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              You haven't made any leave requests yet.
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(req => (
                <div key={req.id} className="flex flex-col md:flex-row justify-between p-4 border rounded-xl bg-card">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{req.leaveType.name}</h4>
                      <Badge variant={
                        req.status === 'APPROVED' ? 'success' : 
                        req.status === 'REJECTED' ? 'danger' : 'warning'
                      }>
                        {req.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {req.totalDays} days</span>
                    </div>
                    <p className="text-sm italic border-l-2 pl-2">"{req.reason}"</p>
                    {req.approverNote && (
                      <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded mt-2">
                        <strong>Note from Admin:</strong> {req.approverNote}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-4 md:mt-0 text-right">
                    Requested on {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-xl">
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Request Leave</CardTitle>
                <CardDescription>Submit a new time-off request.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {errorMsg && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{errorMsg}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Leave Type</label>
                  <select
                    required
                    className="w-full p-2 rounded-md border bg-background"
                    value={formData.leaveTypeId}
                    onChange={e => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  >
                    <option value="" disabled>Select a leave type</option>
                    {balances.map(b => (
                      <option key={b.leaveType.id} value={b.leaveType.id}>
                        {b.leaveType.name} ({b.totalDays - b.usedDays} days left)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]} // Cannot request in past
                      className="w-full p-2 rounded-md border bg-background"
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <input
                      type="date"
                      required
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      className="w-full p-2 rounded-md border bg-background"
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full p-2 rounded-md border bg-background resize-none"
                    placeholder="Why are you requesting this leave?"
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
              </CardContent>
              <div className="p-4 border-t flex justify-end gap-2 bg-muted/50 rounded-b-xl">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={requestMutation.isPending}>
                  Submit Request
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

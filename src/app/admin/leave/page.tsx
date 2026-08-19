'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useState } from 'react'

type LeaveRequest = {
  id: string
  user: { name: string, email: string, shop: { name: string } }
  leaveType: { name: string, isPaid: boolean }
  startDate: string
  endDate: string
  totalDays: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  approverNote?: string | null
}

export default function AdminLeaveRequestsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING')

  const { data: requests = [], isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leaveRequests', activeTab],
    queryFn: async () => {
      const url = activeTab === 'PENDING' 
        ? '/api/leave/requests?status=PENDING' 
        : '/api/leave/requests'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch leave requests')
      
      const data = await res.json()
      // Filter out pending from history tab client-side if needed, 
      // but passing status=PENDING handles the first tab.
      if (activeTab === 'HISTORY') {
        return data.filter((r: LeaveRequest) => r.status !== 'PENDING')
      }
      return data
    }
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string, status: string, note?: string }) => {
      const res = await fetch(`/api/leave/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approverNote: note })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to review request')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] })
    },
    onError: (err: any) => {
      alert(err.message)
    }
  })

  const handleReview = (id: string, status: 'APPROVED' | 'REJECTED') => {
    const note = prompt(`Enter optional note for ${status} (or leave blank):`)
    if (note !== null) { // null means user clicked cancel
      reviewMutation.mutate({ id, status, note })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">Review and manage employee leave requests.</p>
        </div>
        <Link href="/admin/leave/types">
          <Button variant="outline">
            Configure Leave Types
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'PENDING' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('PENDING')}
        >
          Pending Requests
        </button>
        <button
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('HISTORY')}
        >
          History
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No {activeTab.toLowerCase()} requests</h3>
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y">
              {requests.map(request => (
                <div key={request.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{request.user.name}</h3>
                        <p className="text-sm text-muted-foreground">{request.user.shop.name}</p>
                      </div>
                      <Badge variant={
                        request.status === 'APPROVED' ? 'success' : 
                        request.status === 'REJECTED' ? 'danger' : 'warning'
                      }>
                        {request.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-medium">{request.leaveType.name}</span>
                        <Badge variant="outline" size="sm">{request.leaveType.isPaid ? 'Paid' : 'Unpaid'}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{new Date(request.startDate).toLocaleDateString()} to {new Date(request.endDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-medium">{request.totalDays} Day(s)</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-1">Reason provided:</p>
                      <p className="text-sm text-muted-foreground italic border-l-2 pl-3 py-1">"{request.reason}"</p>
                    </div>
                    
                    {request.approverNote && (
                      <div className="mt-2 text-sm bg-blue-50 text-blue-800 p-2 rounded border border-blue-100">
                        <strong>Admin Note:</strong> {request.approverNote}
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-2 items-end justify-center md:min-w-[140px] border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
                    {request.status === 'PENDING' ? (
                      <>
                        <Button 
                          className="w-full bg-green-600 hover:bg-green-700" 
                          onClick={() => handleReview(request.id, 'APPROVED')}
                          disabled={reviewMutation.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                        </Button>
                        <Button 
                          variant="danger" 
                          className="w-full" 
                          onClick={() => handleReview(request.id, 'REJECTED')}
                          disabled={reviewMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Reject
                        </Button>
                      </>
                    ) : (
                      // Allow undoing an approved/rejected request
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => handleReview(request.id, request.status === 'APPROVED' ? 'REJECTED' : 'APPROVED')}
                        disabled={reviewMutation.isPending}
                      >
                        Change to {request.status === 'APPROVED' ? 'Rejected' : 'Approved'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

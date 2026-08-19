'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, LogIn, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useState } from 'react'

export default function EmployeeClockPage() {
  const queryClient = useQueryClient()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: status, isLoading } = useQuery<{
    isClockedIn: boolean
    lastLog: { type: string, timestamp: string, isValid: boolean, flagReason: string } | null
  }>({
    queryKey: ['clockStatus'],
    queryFn: async () => {
      const res = await fetch('/api/clock/status')
      if (!res.ok) throw new Error('Failed to fetch status')
      return res.json()
    }
  })

  const clockMutation = useMutation({
    mutationFn: async (type: 'in' | 'out') => {
      setErrorMsg(null)
      setSuccessMsg(null)
      
      const res = await fetch(`/api/clock/${type}`, { method: 'POST' })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || data.error || `Failed to clock ${type}`)
      }
      return { type, data }
    },
    onSuccess: ({ type }) => {
      setSuccessMsg(`Successfully clocked ${type}.`)
      queryClient.invalidateQueries({ queryKey: ['clockStatus'] })
    },
    onError: (err: any) => {
      setErrorMsg(err.message)
      // Even if failed, invalidating might update last log to show the flagged attempt
      queryClient.invalidateQueries({ queryKey: ['clockStatus'] })
    }
  })

  const handleAction = () => {
    if (status?.isClockedIn) {
      clockMutation.mutate('out')
    } else {
      clockMutation.mutate('in')
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pt-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Attendance</h1>
        <p className="text-muted-foreground">Make sure you are connected to the shop Wi-Fi before clocking in.</p>
      </div>

      {errorMsg && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Denied</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {successMsg && (
        <Alert className="bg-green-50 text-green-900 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{successMsg}</AlertDescription>
        </Alert>
      )}

      <Card className="border-primary/20 shadow-xl overflow-hidden">
        <div className="h-2 w-full bg-gradient-to-r from-primary to-blue-600" />
        <CardContent className="p-8 text-center space-y-8">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className={`inline-flex items-center justify-center p-4 rounded-full mb-4 ${status?.isClockedIn ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                  <Clock className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-semibold">
                  {status?.isClockedIn ? 'Clocked In' : 'Not Clocked In'}
                </h2>
                {status?.lastLog && (
                  <p className="text-sm text-muted-foreground">
                    Last {status.lastLog.type === 'IN' ? 'clock in' : 'clock out'} was at {new Date(status.lastLog.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                )}
              </div>

              <Button 
                size="lg" 
                className={`w-full h-16 text-lg rounded-xl shadow-lg transition-all ${status?.isClockedIn ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary hover:bg-primary/90'}`}
                onClick={handleAction}
                disabled={clockMutation.isPending}
              >
                {clockMutation.isPending ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                ) : status?.isClockedIn ? (
                  <LogOut className="mr-2 h-6 w-6" />
                ) : (
                  <LogIn className="mr-2 h-6 w-6" />
                )}
                {clockMutation.isPending 
                  ? 'Processing...' 
                  : status?.isClockedIn ? 'Clock Out' : 'Clock In'
                }
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

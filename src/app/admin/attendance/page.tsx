'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, AlertTriangle, CheckCircle2, Wifi, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type ClockLog = {
  id: string
  userId: string
  shopId: string
  type: 'IN' | 'OUT'
  timestamp: string
  isValid: boolean
  flagReason: string | null
  ipAddress: string
  user?: { name: string, email: string }
  shop?: { name: string }
}

export default function AdminAttendancePage() {
  const today = new Date().toISOString().split('T')[0]
  const [filterDate, setFilterDate] = useState(today)

  const { data: logs = [], isLoading } = useQuery<ClockLog[]>({
    queryKey: ['clockLogs', filterDate],
    queryFn: async () => {
      const res = await fetch(`/api/clock/logs?date=${filterDate}`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      return res.json()
    },
    refetchInterval: 30000 // Refetch every 30 seconds for live updates
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Attendance</h1>
          <p className="text-muted-foreground">Monitor real-time clock-in/out logs across all shops.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl">Activity Feed</CardTitle>
            <CardDescription>Viewing logs for selected date</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Input 
              type="date" 
              className="w-auto"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No activity today</h3>
              <p>No employees have clocked in or out on this date.</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {logs.map(log => {
                const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                
                return (
                  <div 
                    key={log.id} 
                    className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border ${log.isValid ? 'bg-card' : 'bg-red-50/50 border-red-200'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 rounded-full p-2 ${log.type === 'IN' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{log.user?.name}</h4>
                          <Badge variant={log.type === 'IN' ? 'default' : 'secondary'} className={log.type === 'IN' ? 'bg-green-600' : ''}>
                            {log.type === 'IN' ? 'Clocked In' : 'Clocked Out'}
                          </Badge>
                          {!log.isValid && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Flagged
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            {time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {log.shop?.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Wifi className="w-3 h-3" />
                            IP: {log.ipAddress}
                          </span>
                        </div>
                        {!log.isValid && log.flagReason && (
                          <div className="mt-2 text-sm text-red-600 bg-red-100/50 px-2 py-1 rounded inline-block">
                            {log.flagReason}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Add manual override button here if needed in future */}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

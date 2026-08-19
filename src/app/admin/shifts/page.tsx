'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Shift = {
  id: string
  userId: string
  shopId: string
  startTime: string
  endTime: string
  user?: { name: string }
  shop?: { name: string }
}

export default function AdminShiftsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<{
    userId: string
    shopId: string
    date: string
    startTime: string
    endTime: string
  }>({
    userId: '', shopId: '', date: '', startTime: '09:00', endTime: '18:00'
  })

  // Date filter
  const today = new Date().toISOString().split('T')[0]
  const [filterDate, setFilterDate] = useState(today)

  // Fetch reference data
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ['employees'],
    queryFn: async () => (await fetch('/api/employees')).json()
  })

  const { data: shops = [] } = useQuery<any[]>({
    queryKey: ['shops'],
    queryFn: async () => (await fetch('/api/shops')).json()
  })

  // Set default shop/user when data loads
  if (!formData.shopId && shops.length > 0) formData.shopId = shops[0].id
  if (!formData.userId && employees.length > 0) formData.userId = employees[0].id

  // Fetch shifts for the selected date
  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ['shifts', filterDate],
    queryFn: async () => {
      const start = new Date(filterDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(filterDate)
      end.setHours(23, 59, 59, 999)
      
      const res = await fetch(`/api/shifts?start=${start.toISOString()}&end=${end.toISOString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // Construct proper ISO strings for start/end
      const startDt = new Date(`${data.date}T${data.startTime}:00`).toISOString()
      const endDt = new Date(`${data.date}T${data.endTime}:00`).toISOString()

      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.userId,
          shopId: data.shopId,
          startTime: startDt,
          endTime: endDt,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      setShowForm(false)
    },
    onError: (err: any) => alert(err.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] })
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this shift?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shift Assignments</h1>
          <p className="text-muted-foreground">Schedule when employees are expected to work.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Assign Shift
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle>Assign New Shift</CardTitle>
            <CardDescription>Select an employee and time slot.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2 lg:col-span-1">
                  <label className="text-sm font-medium">Employee</label>
                  <select 
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.userId}
                    onChange={e => setFormData({...formData, userId: e.target.value})}
                  >
                    <option value="" disabled>Select employee</option>
                    {employees.filter(e => e.isActive).map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <label className="text-sm font-medium">Shop</label>
                  <select 
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.shopId}
                    onChange={e => setFormData({...formData, shopId: e.target.value})}
                  >
                    <option value="" disabled>Select shop</option>
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2 lg:col-span-1">
                  <label className="text-sm font-medium">Date</label>
                  <Input 
                    type="date"
                    required
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <label className="text-sm font-medium">Start Time</label>
                  <Input 
                    type="time"
                    required
                    value={formData.startTime} 
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                  />
                </div>

                <div className="space-y-2 lg:col-span-1">
                  <label className="text-sm font-medium">End Time</label>
                  <Input 
                    type="time"
                    required
                    value={formData.endTime} 
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Assign Shift'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl">Daily Schedule</CardTitle>
            <CardDescription>Viewing shifts for selected date</CardDescription>
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
          ) : shifts.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No shifts scheduled for this date.
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {shifts.map(shift => {
                const start = new Date(shift.startTime)
                const end = new Date(shift.endTime)
                const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                
                return (
                  <div key={shift.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {shift.user?.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{shift.user?.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(start)} - {formatTime(end)}
                          </span>
                          <span>•</span>
                          <span>{shift.shop?.name}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(shift.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

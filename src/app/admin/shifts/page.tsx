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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Shift Assignments</h1>
          <p className="text-slate-500 text-sm mt-1">Schedule when employees are expected to work.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="shadow-lg shadow-blue-500/20 w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Assign Shift
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-blue-100 shadow-xl shadow-blue-900/5 animate-fade-in">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6 rounded-t-2xl">
            <CardTitle>Assign New Shift</CardTitle>
            <CardDescription>Select an employee and time slot.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="space-y-1.5 lg:col-span-1">
                  <label className="block text-sm font-medium text-slate-700">Employee</label>
                  <select 
                    required
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none hover:border-slate-400 transition-all"
                    value={formData.userId}
                    onChange={e => setFormData({...formData, userId: e.target.value})}
                  >
                    <option value="" disabled>Select employee</option>
                    {employees.filter(e => e.isActive).map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 lg:col-span-1">
                  <label className="block text-sm font-medium text-slate-700">Shop</label>
                  <select 
                    required
                    className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none hover:border-slate-400 transition-all"
                    value={formData.shopId}
                    onChange={e => setFormData({...formData, shopId: e.target.value})}
                  >
                    <option value="" disabled>Select shop</option>
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="lg:col-span-1">
                  <Input 
                    label="Date"
                    type="date"
                    required
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>

                <div className="lg:col-span-1">
                  <Input 
                    label="Start Time"
                    type="time"
                    required
                    value={formData.startTime} 
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                  />
                </div>

                <div className="lg:col-span-1">
                  <Input 
                    label="End Time"
                    type="time"
                    required
                    value={formData.endTime} 
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={saveMutation.isPending} className="shadow-lg shadow-blue-500/20">
                  {saveMutation.isPending ? 'Saving...' : 'Assign Shift'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 bg-slate-50/50 border-b border-slate-100">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">Daily Schedule</CardTitle>
            <CardDescription>Viewing shifts for {new Date(filterDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</CardDescription>
          </div>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto mt-4 sm:mt-0">
            <Calendar className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
            <input 
              type="date" 
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-700 w-full outline-none px-2 py-1"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : shifts.length === 0 ? (
            <div className="text-center p-16 text-slate-400 bg-slate-50/30">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20 text-slate-500" />
              <p className="font-medium text-slate-500">No shifts scheduled for this date.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {shifts.map(shift => {
                const start = new Date(shift.startTime)
                const end = new Date(shift.endTime)
                const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                
                return (
                  <div key={shift.id} className="flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors bg-white group">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                        {shift.user?.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{shift.user?.name}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-1">
                          <span className="flex items-center gap-1.5 font-medium bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatTime(start)} - {formatTime(end)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:block"></span>
                          <span className="font-medium text-slate-600">{shift.shop?.name}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0" onClick={() => handleDelete(shift.id)}>
                      <Trash2 className="h-5 w-5" />
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

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type LeaveType = {
  id: string
  name: string
  daysAllowed: number
  isPaid: boolean
  isActive: boolean
}

export default function LeaveTypesPage() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<LeaveType | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    daysAllowed: 14,
    isPaid: true,
    isActive: true
  })

  const { data: types = [], isLoading } = useQuery<LeaveType[]>({
    queryKey: ['leaveTypes'],
    queryFn: async () => {
      const res = await fetch('/api/leave/types')
      if (!res.ok) throw new Error('Failed to fetch leave types')
      return res.json()
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = editingType ? `/api/leave/types/${editingType.id}` : '/api/leave/types'
      const method = editingType ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] })
      setIsModalOpen(false)
      setEditingType(null)
    },
    onError: (err: any) => {
      alert(err.message)
    }
  })

  const openModal = (type?: LeaveType) => {
    if (type) {
      setEditingType(type)
      setFormData({
        name: type.name,
        daysAllowed: type.daysAllowed,
        isPaid: type.isPaid,
        isActive: type.isActive
      })
    } else {
      setEditingType(null)
      setFormData({ name: '', daysAllowed: 14, isPaid: true, isActive: true })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Types</h1>
          <p className="text-muted-foreground">Manage leave policies and allowances.</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" /> Add Leave Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Leave Types</CardTitle>
          <CardDescription>Changes to allowed days affect new balances.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="divide-y border rounded-lg">
              {types.map(type => (
                <div key={type.id} className="flex items-center justify-between p-4 bg-card">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{type.name}</h3>
                      <Badge variant={type.isPaid ? 'success' : 'secondary'}>
                        {type.isPaid ? 'Paid' : 'Unpaid'}
                      </Badge>
                      {!type.isActive && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {type.daysAllowed} days allowed per year
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openModal(type)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {types.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No leave types configured.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simple Modal overlay for forms */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-xl">
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>{editingType ? 'Edit Leave Type' : 'New Leave Type'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Leave Name</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 rounded-md border bg-background"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Annual Leave"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Days Allowed per Year</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full p-2 rounded-md border bg-background"
                    value={formData.daysAllowed}
                    onChange={e => setFormData({ ...formData, daysAllowed: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPaid"
                    checked={formData.isPaid}
                    onChange={e => setFormData({ ...formData, isPaid: e.target.checked })}
                  />
                  <label htmlFor="isPaid" className="text-sm font-medium">Is this Paid Leave?</label>
                </div>
                {editingType && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-red-600">Active Status</label>
                  </div>
                )}
              </CardContent>
              <div className="p-4 border-t flex justify-end gap-2 bg-muted/50 rounded-b-xl">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={saveMutation.isPending}>
                  Save Leave Type
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Ban, CheckCircle2, User, Building, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Shop = {
  id: string
  name: string
}

type Employee = {
  id: string
  name: string
  email: string
  salary: number
  shopId: string
  isActive: boolean
  shop?: Shop
  createdAt: string
}

export default function AdminEmployeesPage() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Employee> & { password?: string }>({})
  const [showForm, setShowForm] = useState(false)

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    }
  })

  const { data: shops = [] } = useQuery<Shop[]>({
    queryKey: ['shops'],
    queryFn: async () => {
      const res = await fetch('/api/shops')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (employee: Partial<Employee> & { password?: string }) => {
      const url = employee.id ? `/api/employees/${employee.id}` : '/api/employees'
      const method = employee.id ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setShowForm(false)
      setIsEditing(null)
      setFormData({})
    },
    onError: (err: any) => {
      alert(err.message)
    }
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const handleEdit = (employee: Employee) => {
    setFormData({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      salary: employee.salary,
      shopId: employee.shopId,
      isActive: employee.isActive,
    })
    setIsEditing(employee.id)
    setShowForm(true)
  }

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'reactivate'
    if (confirm(`Are you sure you want to ${action} this employee?`)) {
      toggleActiveMutation.mutate({ id, isActive: !currentStatus })
    }
  }

  const handleAddNew = () => {
    setFormData({ isActive: true, salary: 0, shopId: shops[0]?.id || '' })
    setIsEditing(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage staff accounts, salaries, and shop assignments.</p>
        </div>
        {!showForm && (
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" /> Add Employee
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Employee' : 'Add New Employee'}</CardTitle>
            <CardDescription>
              {isEditing 
                ? "Update employee details. Leave password blank to keep it unchanged." 
                : "Create a new employee account. They will use the email and password to log in."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input 
                    required
                    placeholder="John Doe" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input 
                    required
                    type="email"
                    placeholder="john@phoneshop.lk" 
                    value={formData.email || ''} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {isEditing ? 'New Password (Optional)' : 'Password'}
                  </label>
                  <Input 
                    type="password"
                    required={!isEditing}
                    placeholder={isEditing ? 'Leave blank to keep unchanged' : 'Minimum 6 characters'}
                    value={formData.password || ''} 
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Monthly Salary (LKR)</label>
                  <Input 
                    type="number"
                    required
                    min="0"
                    placeholder="50000" 
                    value={formData.salary === undefined ? '' : formData.salary} 
                    onChange={e => setFormData({...formData, salary: parseInt(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign to Shop</label>
                  <select 
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.shopId || ''}
                    onChange={e => setFormData({...formData, shopId: e.target.value})}
                  >
                    <option value="" disabled>Select a shop...</option>
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save Employee'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoadingEmployees ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {employees.map(employee => (
            <Card key={employee.id} className={`hover:shadow-md transition-all ${!employee.isActive ? 'opacity-60 grayscale' : ''}`}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${employee.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {employee.name}
                      {!employee.isActive && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
                    </h3>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 flex-1 md:px-8 text-sm">
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1 mb-1"><Building className="h-3 w-3" /> Shop</span>
                    <span className="font-medium">{employee.shop?.name || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1 mb-1"><Banknote className="h-3 w-3" /> Salary</span>
                    <span className="font-medium">Rs. {employee.salary.toLocaleString()}</span>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <span className="text-muted-foreground block mb-1">Joined</span>
                    <span className="font-medium">{new Date(employee.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(employee)}>
                    <Edit2 className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  {employee.isActive ? (
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleToggleActive(employee.id, true)}>
                      <Ban className="h-4 w-4 mr-1" /> Deactivate
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="text-green-600 hover:bg-green-50" onClick={() => handleToggleActive(employee.id, false)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Reactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {employees.length === 0 && !showForm && (
            <div className="text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No employees found</h3>
              <p className="mb-4">Add your first employee to get started.</p>
              <Button onClick={handleAddNew}>Add Employee</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

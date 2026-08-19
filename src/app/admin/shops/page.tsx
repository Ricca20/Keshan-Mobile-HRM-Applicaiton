'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, MapPin, Wifi, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Shop = {
  id: string
  name: string
  address: string
  locationLat: number
  locationLng: number
  allowedIp: string
  radiusMeters: number
}

export default function AdminShopsPage() {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Shop>>({})
  const [showForm, setShowForm] = useState(false)

  const { data: shops = [], isLoading } = useQuery<Shop[]>({
    queryKey: ['shops'],
    queryFn: async () => {
      const res = await fetch('/api/shops')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (shop: Partial<Shop>) => {
      const url = shop.id ? `/api/shops/${shop.id}` : '/api/shops'
      const method = shop.id ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shop),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
      setShowForm(false)
      setIsEditing(null)
      setFormData({})
    },
    onError: (err: any) => {
      alert(err.message)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shops/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
    },
    onError: (err: any) => {
      alert(err.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const handleEdit = (shop: Shop) => {
    setFormData(shop)
    setIsEditing(shop.id)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this shop?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleAddNew = () => {
    setFormData({ radiusMeters: 100 })
    setIsEditing(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shops</h1>
          <p className="text-muted-foreground">Manage your store locations and security boundaries.</p>
        </div>
        {!showForm && (
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" /> Add Shop
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Shop' : 'Add New Shop'}</CardTitle>
            <CardDescription>Configure the shop's physical location and authorized Wi-Fi network.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Shop Name</label>
                  <Input 
                    required
                    placeholder="Main Branch" 
                    value={formData.name || ''} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input 
                    required
                    placeholder="123 Main St, Colombo" 
                    value={formData.address || ''} 
                    onChange={e => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                
                {/* We keep these visible but optional depending on user preference, they are used in the backend for GPS validation if enabled */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Latitude</label>
                  <Input 
                    type="number"
                    step="any"
                    placeholder="6.9271" 
                    value={formData.locationLat || ''} 
                    onChange={e => setFormData({...formData, locationLat: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Longitude</label>
                  <Input 
                    type="number"
                    step="any"
                    placeholder="79.8612" 
                    value={formData.locationLng || ''} 
                    onChange={e => setFormData({...formData, locationLng: parseFloat(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Wifi className="w-4 h-4" /> Allowed IP Address
                  </label>
                  <Input 
                    required
                    placeholder="203.0.113.1" 
                    value={formData.allowedIp || ''} 
                    onChange={e => setFormData({...formData, allowedIp: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">Employees must be connected to this IP to clock in.</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">GPS Radius (meters)</label>
                  <Input 
                    type="number"
                    required
                    placeholder="100" 
                    value={formData.radiusMeters || ''} 
                    onChange={e => setFormData({...formData, radiusMeters: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : 'Save Shop'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map(shop => (
            <Card key={shop.id} className="hover:shadow-md transition-shadow group">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Store className="w-5 h-5 text-primary" />
                    {shop.name}
                  </CardTitle>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(shop)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(shop.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="flex items-start gap-1 mt-1">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{shop.address}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 pt-2 border-t text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Allowed Network:</span>
                    <Badge variant="secondary" className="font-mono">{shop.allowedIp}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Geofence Radius:</span>
                    <span className="font-medium">{shop.radiusMeters}m</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>GPS:</span>
                    <span className="font-mono">{shop.locationLat}, {shop.locationLng}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {shops.length === 0 && !showForm && (
            <div className="col-span-full text-center p-12 border-2 border-dashed rounded-xl text-muted-foreground">
              <Store className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">No shops configured</h3>
              <p className="mb-4">Add your first shop to start managing employees.</p>
              <Button onClick={handleAddNew}>Add Your First Shop</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, FileText, User, Building, Phone, Mail, MapPin, DollarSign, Edit3, Plus, Trash2 } from 'lucide-react'
import DOMPurify from 'dompurify'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useEstimateStore, type Estimate, type EstimateService } from '@/lib/stores/estimate-store'

// Safe HTML sanitization
const sanitizeHtml = (html: string) => {
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(html)
  }
  return html // Server-side fallback
}

const quoteSchema = z.object({
  customer_name: z.string().min(2, 'Customer name is required'),
  customer_email: z.string().email('Valid email is required'),
  customer_phone: z.string().min(10, 'Valid phone number is required'),
  company_name: z.string().optional(),
  building_name: z.string().min(2, 'Building name is required'),
  building_address: z.string().min(5, 'Building address is required'),
  building_height_stories: z.number().min(1, 'Building height must be at least 1 story'),
  building_height_feet: z.number().optional(),
  building_type: z.string().optional(),
  status: z.enum(['draft', 'sent', 'approved', 'rejected']),
  notes: z.string().optional(),
})

type QuoteFormData = z.infer<typeof quoteSchema>

interface QuoteEditorProps {
  quoteId?: string
  onSave?: (quoteId: string) => void
  onCancel?: () => void
}

export function QuoteEditor({ quoteId, onSave, onCancel }: QuoteEditorProps) {
  const [isEditing, setIsEditing] = useState(!quoteId)
  const [notesContent, setNotesContent] = useState('')
  
  const {
    currentEstimate,
    services,
    isSaving,
    isLoading,
    setCustomerInfo,
    addService,
    removeService,
    saveEstimate,
    createEstimate,
    loadEstimate,
    calculateTotal,
  } = useEstimateStore()

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      company_name: '',
      building_name: '',
      building_address: '',
      building_height_stories: 1,
      building_height_feet: undefined,
      building_type: '',
      status: 'draft',
      notes: '',
    },
  })

  // Load quote data when component mounts
  useEffect(() => {
    if (quoteId) {
      loadEstimate(quoteId)
    }
  }, [quoteId, loadEstimate])

  // Update form when estimate data changes
  useEffect(() => {
    if (currentEstimate) {
      form.reset({
        customer_name: currentEstimate.customer_name || '',
        customer_email: currentEstimate.customer_email || '',
        customer_phone: currentEstimate.customer_phone || '',
        company_name: currentEstimate.company_name || '',
        building_name: currentEstimate.building_name || '',
        building_address: currentEstimate.building_address || '',
        building_height_stories: currentEstimate.building_height_stories || 1,
        building_height_feet: currentEstimate.building_height_feet || undefined,
        building_type: currentEstimate.building_type || '',
        status: currentEstimate.status || 'draft',
        notes: currentEstimate.notes || '',
      })
      setNotesContent(currentEstimate.notes || '')
    }
  }, [currentEstimate, form])

  const onSubmit = async (data: QuoteFormData) => {
    const quoteData = {
      ...data,
      notes: notesContent,
      total_price: calculateTotal(),
      services,
    }

    setCustomerInfo(quoteData)

    try {
      let resultQuoteId: string | null = null
      
      if (currentEstimate?.id) {
        const success = await saveEstimate()
        if (success) {
          resultQuoteId = currentEstimate.id
        }
      } else {
        resultQuoteId = await createEstimate()
      }

      if (resultQuoteId) {
        setIsEditing(false)
        onSave?.(resultQuoteId)
      }
    } catch (error) {
      console.error('Error saving quote:', error)
    }
  }

  const handleEditToggle = () => {
    setIsEditing(!isEditing)
  }

  const handleCancel = () => {
    if (currentEstimate) {
      form.reset()
      setIsEditing(false)
    } else {
      onCancel?.()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">
              {currentEstimate?.estimate_number || 'New Estimate'}
            </h1>
            {currentEstimate?.created_at && (
              <p className="text-muted-foreground">
                Created {new Date(currentEstimate.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {currentEstimate?.status && (
            <Badge className={getStatusColor(currentEstimate.status)}>
              {currentEstimate.status.charAt(0).toUpperCase() + currentEstimate.status.slice(1)}
            </Badge>
          )}
          {!isEditing && (
            <Button onClick={handleEditToggle} variant="outline">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-1">
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="email" disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-1">
                        <Phone className="h-4 w-4" />
                        <span>Phone</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Building Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Building Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="building_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="building_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>Address</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} disabled={!isEditing} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="building_height_stories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stories</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="1"
                          disabled={!isEditing}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="building_height_feet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (feet)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          disabled={!isEditing}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="building_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building Type</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} placeholder="e.g., Office, Retail" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Services</span>
                {isEditing && (
                  <Button type="button" variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No services added yet. Click &quot;Add Service&quot; to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <div key={service.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">
                            {service.serviceType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(service.calculationResult?.basePrice || 0)}
                          </p>
                        </div>
                        {isEditing && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeService(service.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quote Status and Total */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Quote Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isEditing}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <Label>Total Price</Label>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(calculateTotal())}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={notesContent}
                  onChange={(e) => setNotesContent(e.target.value)}
                  placeholder="Add any additional notes or comments..."
                  className="min-h-[150px]"
                  rows={6}
                />
              ) : (
                <div className="prose max-w-none">
                  {notesContent ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(notesContent) }} />
                  ) : (
                    <p className="text-muted-foreground">No notes added</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {isEditing && (
            <div className="flex items-center justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Quote'}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  )
}
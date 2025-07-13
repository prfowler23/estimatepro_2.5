'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useQuoteStore } from '@/lib/stores/quote-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  RefreshCw,
  User,
  Building2,
  Calculator,
  DollarSign
} from 'lucide-react'
import { SERVICE_TYPES } from '@/lib/calculations/constants'

interface QuoteData {
  id: string
  quote_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  company_name: string
  building_name: string
  building_address: string
  building_height_stories: number
  building_height_feet: number
  building_type: string
  total_price: number
  status: string
  notes: string
  services: QuoteService[]
}

interface QuoteService {
  id: string
  service_type: string
  area_sqft: number
  glass_sqft: number
  price: number
  labor_hours: number
  setup_hours: number
  rig_hours: number
  total_hours: number
  crew_size: number
  equipment_type: string
  equipment_days: number
  equipment_cost: number
  calculation_details: any
}

function QuoteEditContent() {
  const params = useParams()
  const router = useRouter()
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const fetchQuote = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', params.id)
        .single()

      if (quoteError) throw quoteError

      const { data: servicesData, error: servicesError } = await supabase
        .from('quote_services')
        .select('*')
        .eq('quote_id', params.id)

      if (servicesError) throw servicesError

      setQuote({
        ...quoteData,
        services: servicesData
      })
    } catch (error: any) {
      setError(error.message)
      console.error('Error fetching quote:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuote()
  }, [params.id])

  const updateQuoteField = (field: string, value: any) => {
    if (!quote) return
    
    setQuote(prev => prev ? { ...prev, [field]: value } : null)
    setHasChanges(true)
  }

  const removeService = async (serviceId: string) => {
    if (!quote) return

    try {
      const { error } = await supabase
        .from('quote_services')
        .delete()
        .eq('id', serviceId)

      if (error) throw error

      setQuote(prev => prev ? {
        ...prev,
        services: prev.services.filter(s => s.id !== serviceId),
        total_price: prev.services
          .filter(s => s.id !== serviceId)
          .reduce((sum, s) => sum + s.price, 0)
      } : null)
      setHasChanges(true)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const saveQuote = async () => {
    if (!quote) return

    try {
      setSaving(true)
      setError(null)

      const { error } = await supabase
        .from('quotes')
        .update({
          customer_name: quote.customer_name,
          customer_email: quote.customer_email,
          customer_phone: quote.customer_phone,
          company_name: quote.company_name,
          building_name: quote.building_name,
          building_address: quote.building_address,
          building_height_stories: quote.building_height_stories,
          building_height_feet: quote.building_height_feet,
          building_type: quote.building_type,
          total_price: quote.total_price,
          notes: quote.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id)

      if (error) throw error

      setHasChanges(false)
      router.push(`/quotes/${quote.id}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const calculateTotalPrice = () => {
    if (!quote) return 0
    return quote.services.reduce((sum, service) => sum + service.price, 0)
  }

  const getTotalEquipmentCost = () => {
    if (!quote) return 0
    return quote.services.reduce((sum, service) => sum + (service.equipment_cost || 0), 0)
  }

  const getTotalLaborHours = () => {
    if (!quote) return 0
    return quote.services.reduce((sum, service) => sum + service.total_hours, 0)
  }

  // Update total price when services change
  useEffect(() => {
    if (quote) {
      const newTotal = calculateTotalPrice()
      if (newTotal !== quote.total_price) {
        setQuote(prev => prev ? { ...prev, total_price: newTotal } : null)
        setHasChanges(true)
      }
    }
  }, [quote?.services])

  if (loading) {
    return (
      <div className='flex items-center justify-center py-8'>
        <RefreshCw className='h-6 w-6 animate-spin mr-2' />
        Loading quote...
      </div>
    )
  }

  if (error || !quote) {
    return (
      <div className='space-y-4'>
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>
            {error || 'Quote not found'}
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.back()}>
          <ArrowLeft className='h-4 w-4 mr-2' />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='outline' onClick={() => router.back()}>
            <ArrowLeft className='h-4 w-4 mr-2' />
            Back
          </Button>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>Edit Quote</h1>
            <p className='text-gray-600'>{quote.quote_number}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {hasChanges && (
            <Badge variant='outline' className='text-orange-600'>
              Unsaved Changes
            </Badge>
          )}
          <Button
            onClick={saveQuote}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
            ) : (
              <Save className='h-4 w-4 mr-2' />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <User className='h-5 w-5' />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='customer_name'>Customer Name *</Label>
              <Input
                id='customer_name'
                value={quote.customer_name}
                onChange={(e) => updateQuoteField('customer_name', e.target.value)}
                placeholder='John Smith'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='company_name'>Company Name</Label>
              <Input
                id='company_name'
                value={quote.company_name || ''}
                onChange={(e) => updateQuoteField('company_name', e.target.value)}
                placeholder='ABC Company'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='customer_email'>Email *</Label>
              <Input
                id='customer_email'
                type='email'
                value={quote.customer_email}
                onChange={(e) => updateQuoteField('customer_email', e.target.value)}
                placeholder='john@company.com'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='customer_phone'>Phone</Label>
              <Input
                id='customer_phone'
                value={quote.customer_phone}
                onChange={(e) => updateQuoteField('customer_phone', e.target.value)}
                placeholder='(555) 123-4567'
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Building Information */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Building2 className='h-5 w-5' />
            Building Information
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='building_name'>Building Name *</Label>
              <Input
                id='building_name'
                value={quote.building_name}
                onChange={(e) => updateQuoteField('building_name', e.target.value)}
                placeholder='Downtown Office Complex'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='building_type'>Building Type</Label>
              <Select 
                value={quote.building_type || ''} 
                onValueChange={(value) => updateQuoteField('building_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select building type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='office'>Office Building</SelectItem>
                  <SelectItem value='retail'>Retail/Commercial</SelectItem>
                  <SelectItem value='residential'>Residential</SelectItem>
                  <SelectItem value='hospital'>Hospital/Medical</SelectItem>
                  <SelectItem value='school'>School/Educational</SelectItem>
                  <SelectItem value='warehouse'>Warehouse/Industrial</SelectItem>
                  <SelectItem value='hotel'>Hotel/Hospitality</SelectItem>
                  <SelectItem value='other'>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='building_address'>Address *</Label>
              <Input
                id='building_address'
                value={quote.building_address}
                onChange={(e) => updateQuoteField('building_address', e.target.value)}
                placeholder='123 Main St, City, State 12345'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='height_stories'>Height (Stories) *</Label>
              <Input
                id='height_stories'
                type='number'
                value={quote.building_height_stories}
                onChange={(e) => updateQuoteField('building_height_stories', parseInt(e.target.value))}
                placeholder='10'
                min='1'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='height_feet'>Height (Feet)</Label>
              <Input
                id='height_feet'
                type='number'
                value={quote.building_height_feet || ''}
                onChange={(e) => updateQuoteField('building_height_feet', parseInt(e.target.value) || null)}
                placeholder='120'
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Calculator className='h-5 w-5' />
                Services
              </CardTitle>
              <CardDescription>
                Manage services included in this quote
              </CardDescription>
            </div>
            <Button>
              <Plus className='h-4 w-4 mr-2' />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {quote.services.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>
              <Calculator className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <p>No services added yet</p>
              <Button variant='outline' className='mt-2'>
                <Plus className='h-4 w-4 mr-2' />
                Add First Service
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead className='text-right'>Price</TableHead>
                  <TableHead className='w-[50px]'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <div className='font-medium'>
                          {SERVICE_TYPES[service.service_type as keyof typeof SERVICE_TYPES]}
                        </div>
                        <div className='text-sm text-gray-500'>
                          {service.service_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='text-sm space-y-1'>
                        {service.area_sqft > 0 && (
                          <div>{service.area_sqft.toLocaleString()} sq ft</div>
                        )}
                        {service.glass_sqft > 0 && (
                          <div>{service.glass_sqft.toLocaleString()} sq ft glass</div>
                        )}
                        <div className='text-gray-500'>
                          Crew: {service.crew_size} people
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='text-sm'>
                        <div className='font-medium'>{service.total_hours.toFixed(1)} total</div>
                        <div className='text-gray-500'>
                          {service.labor_hours.toFixed(1)} + {service.setup_hours.toFixed(1)} + {service.rig_hours.toFixed(1)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.equipment_type ? (
                        <div className='text-sm'>
                          <div>{service.equipment_type}</div>
                          {service.equipment_cost > 0 && (
                            <div className='text-gray-500'>
                              ${service.equipment_cost.toLocaleString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className='text-gray-400'>None</span>
                      )}
                    </TableCell>
                    <TableCell className='text-right font-medium'>
                      ${service.price.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => removeService(service.id)}
                        className='text-red-600 hover:text-red-700'
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Quote Summary */}
          {quote.services.length > 0 && (
            <div className='mt-6 pt-6 border-t'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
                <div className='text-center p-4 bg-blue-50 rounded-lg'>
                  <div className='text-2xl font-bold text-blue-700'>{quote.services.length}</div>
                  <div className='text-sm text-blue-600'>Services</div>
                </div>
                <div className='text-center p-4 bg-purple-50 rounded-lg'>
                  <div className='text-2xl font-bold text-purple-700'>{getTotalLaborHours().toFixed(1)}</div>
                  <div className='text-sm text-purple-600'>Total Hours</div>
                </div>
                <div className='text-center p-4 bg-orange-50 rounded-lg'>
                  <div className='text-2xl font-bold text-orange-700'>${getTotalEquipmentCost().toLocaleString()}</div>
                  <div className='text-sm text-orange-600'>Equipment Cost</div>
                </div>
              </div>
              
              <div className='space-y-2 max-w-sm ml-auto'>
                <div className='flex justify-between text-lg'>
                  <span>Services Total:</span>
                  <span className='font-medium'>${quote.total_price.toLocaleString()}</span>
                </div>
                {getTotalEquipmentCost() > 0 && (
                  <div className='flex justify-between text-lg'>
                    <span>Equipment Rental:</span>
                    <span className='font-medium'>${getTotalEquipmentCost().toLocaleString()}</span>
                  </div>
                )}
                <div className='flex justify-between text-xl font-bold text-primary pt-2 border-t'>
                  <span>Total Quote:</span>
                  <span>${(quote.total_price + getTotalEquipmentCost()).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
          <CardDescription>
            Additional information or special requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={quote.notes || ''}
            onChange={(e) => updateQuoteField('notes', e.target.value)}
            placeholder='Add any special notes, requirements, or additional information...'
            className='min-h-[100px]'
          />
        </CardContent>
      </Card>

      {/* Save Section */}
      <Card>
        <CardContent className='pt-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <DollarSign className='h-5 w-5 text-green-600' />
              <span className='text-lg font-semibold'>
                Total Quote: ${(quote.total_price + getTotalEquipmentCost()).toLocaleString()}
              </span>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                onClick={saveQuote}
                disabled={saving || !hasChanges}
              >
                {saving ? (
                  <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                ) : (
                  <Save className='h-4 w-4 mr-2' />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function QuoteEditPage() {
  return (
    <div className="container mx-auto py-8">
      <QuoteEditContent />
    </div>
  )
}
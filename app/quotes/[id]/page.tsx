'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { QuotePDFGenerator } from '@/lib/pdf/generator'
import { Button } from '@/components/ui/button'
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
  Download,
  Edit,
  Copy,
  Mail,
  Share2,
  AlertTriangle,
  RefreshCw,
  User,
  Building2,
  Calculator,
  DollarSign,
  Calendar,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
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
  created_at: string
  updated_at: string
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

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
}

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  approved: 'Approved',
  rejected: 'Rejected'
}

function QuoteDetailContent() {
  const params = useParams()
  const router = useRouter()
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleStatusChange = async (newStatus: string) => {
    if (!quote) return

    try {
      setUpdating(true)
      setError(null)

      const { error } = await supabase
        .from('quotes')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id)

      if (error) throw error

      setQuote(prev => prev ? { ...prev, status: newStatus } : null)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!quote) return
    
    try {
      await QuotePDFGenerator.downloadQuotePDF(quote)
    } catch (error) {
      console.error('Error generating PDF:', error)
      setError('Failed to generate PDF')
    }
  }

  const handleDuplicate = async () => {
    if (!quote) return

    try {
      setUpdating(true)
      setError(null)

      // Create new quote number
      const now = new Date()
      const year = now.getFullYear()
      const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 0).getTime()) / 86400000)
      const timeComponent = Math.floor((now.getTime() % 86400000) / 1000)
      const newQuoteNumber = `QTE-${year}-${dayOfYear.toString().padStart(3, '0')}-${timeComponent.toString().padStart(5, '0')}`

      // Duplicate quote
      const { data: newQuote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          quote_number: newQuoteNumber,
          customer_name: quote.customer_name + ' (Copy)',
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
          status: 'draft'
        })
        .select()
        .single()

      if (quoteError) throw quoteError

      // Duplicate services
      if (quote.services.length > 0) {
        const serviceInserts = quote.services.map(service => ({
          quote_id: newQuote.id,
          service_type: service.service_type,
          area_sqft: service.area_sqft,
          glass_sqft: service.glass_sqft,
          price: service.price,
          labor_hours: service.labor_hours,
          setup_hours: service.setup_hours,
          rig_hours: service.rig_hours,
          total_hours: service.total_hours,
          crew_size: service.crew_size,
          equipment_type: service.equipment_type,
          equipment_days: service.equipment_days,
          equipment_cost: service.equipment_cost,
          calculation_details: service.calculation_details
        }))

        const { error: duplicateServicesError } = await supabase
          .from('quote_services')
          .insert(serviceInserts)

        if (duplicateServicesError) throw duplicateServicesError
      }

      router.push(`/quotes/${newQuote.id}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setUpdating(false)
    }
  }

  const calculateTotalEquipmentCost = () => {
    if (!quote) return 0
    return quote.services.reduce((sum, service) => sum + (service.equipment_cost || 0), 0)
  }

  const calculateTotalLaborHours = () => {
    if (!quote) return 0
    return quote.services.reduce((sum, service) => sum + service.total_hours, 0)
  }

  const getStatusBadge = (status: string) => (
    <Badge className={STATUS_COLORS[status as keyof typeof STATUS_COLORS]}>
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
    </Badge>
  )

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
            <h1 className='text-3xl font-bold text-gray-900'>Quote Details</h1>
            <p className='text-gray-600'>{quote.quote_number}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={handleDownloadPDF}>
            <Download className='h-4 w-4 mr-2' />
            Download PDF
          </Button>
          <Button variant='outline' onClick={handleDuplicate} disabled={updating}>
            {updating ? (
              <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
            ) : (
              <Copy className='h-4 w-4 mr-2' />
            )}
            Duplicate
          </Button>
          <Button variant='outline'>
            <Mail className='h-4 w-4 mr-2' />
            Send Email
          </Button>
          <Link href={`/quotes/${quote.id}/edit`}>
            <Button>
              <Edit className='h-4 w-4 mr-2' />
              Edit Quote
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Status and Basic Info */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Status</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            {getStatusBadge(quote.status)}
            <Select 
              value={quote.status} 
              onValueChange={handleStatusChange}
              disabled={updating}
            >
              <SelectTrigger className='h-8'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='draft'>Draft</SelectItem>
                <SelectItem value='sent'>Sent</SelectItem>
                <SelectItem value='approved'>Approved</SelectItem>
                <SelectItem value='rejected'>Rejected</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              ${(quote.total_price + calculateTotalEquipmentCost()).toLocaleString()}
            </div>
            <div className='text-xs text-gray-500'>
              Services: ${quote.total_price.toLocaleString()}
              {calculateTotalEquipmentCost() > 0 && (
                <span> + Equipment: ${calculateTotalEquipmentCost().toLocaleString()}</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>{quote.services.length}</div>
            <div className='text-xs text-gray-500'>
              {calculateTotalLaborHours().toFixed(1)} total hours
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-sm font-medium'>
              {format(new Date(quote.created_at), 'MMM d, yyyy')}
            </div>
            <div className='text-xs text-gray-500'>
              Updated {format(new Date(quote.updated_at), 'MMM d, yyyy')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <User className='h-5 w-5' />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-3'>
              <div>
                <div className='text-sm font-medium text-gray-600'>Customer Name</div>
                <div className='text-lg font-medium'>{quote.customer_name}</div>
              </div>
              {quote.company_name && (
                <div>
                  <div className='text-sm font-medium text-gray-600'>Company</div>
                  <div>{quote.company_name}</div>
                </div>
              )}
            </div>
            <div className='space-y-3'>
              <div>
                <div className='text-sm font-medium text-gray-600'>Email</div>
                <div>{quote.customer_email}</div>
              </div>
              <div>
                <div className='text-sm font-medium text-gray-600'>Phone</div>
                <div>{quote.customer_phone}</div>
              </div>
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
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-3'>
              <div>
                <div className='text-sm font-medium text-gray-600'>Building Name</div>
                <div className='text-lg font-medium'>{quote.building_name}</div>
              </div>
              <div>
                <div className='text-sm font-medium text-gray-600'>Address</div>
                <div>{quote.building_address}</div>
              </div>
            </div>
            <div className='space-y-3'>
              <div>
                <div className='text-sm font-medium text-gray-600'>Height</div>
                <div>
                  {quote.building_height_stories} stories
                  {quote.building_height_feet && ` (${quote.building_height_feet} feet)`}
                </div>
              </div>
              {quote.building_type && (
                <div>
                  <div className='text-sm font-medium text-gray-600'>Building Type</div>
                  <div className='capitalize'>{quote.building_type.replace('_', ' ')}</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Calculator className='h-5 w-5' />
            Services Breakdown
          </CardTitle>
          <CardDescription>
            Detailed breakdown of all services included in this quote
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quote.services.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>
              <Calculator className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <p>No services added to this quote</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Labor Hours</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead className='text-right'>Price</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Quote Summary */}
          {quote.services.length > 0 && (
            <div className='mt-6 pt-6 border-t'>
              <div className='space-y-2 max-w-sm ml-auto'>
                <div className='flex justify-between text-lg'>
                  <span>Services Subtotal:</span>
                  <span className='font-medium'>${quote.total_price.toLocaleString()}</span>
                </div>
                {calculateTotalEquipmentCost() > 0 && (
                  <div className='flex justify-between text-lg'>
                    <span>Equipment Rental:</span>
                    <span className='font-medium'>${calculateTotalEquipmentCost().toLocaleString()}</span>
                  </div>
                )}
                <div className='flex justify-between text-xl font-bold text-primary pt-2 border-t'>
                  <span>Total Quote:</span>
                  <span>${(quote.total_price + calculateTotalEquipmentCost()).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileText className='h-5 w-5' />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='whitespace-pre-wrap text-gray-700'>{quote.notes}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function QuoteDetailPage() {
  return (
    <div className="container mx-auto py-8">
      <QuoteDetailContent />
    </div>
  )
}
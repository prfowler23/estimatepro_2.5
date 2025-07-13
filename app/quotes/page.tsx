'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Edit,
  Copy,
  Trash2,
  Mail,
  MoreHorizontal,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { QuotePDFGenerator } from '@/lib/pdf/generator'

interface Quote {
  id: string
  quote_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  company_name: string
  building_name: string
  building_address: string
  total_price: number
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  services_count?: number
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

function QuotesContent() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [error, setError] = useState<string | null>(null)

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('quotes')
        .select(`
          *,
          quote_services(count)
        `)

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      // Apply sorting
      const orderColumn = sortBy === 'date' ? 'created_at' : 
                         sortBy === 'amount' ? 'total_price' : 'customer_name'
      query = query.order(orderColumn, { ascending: sortOrder === 'asc' })

      const { data, error } = await query

      if (error) throw error

      // Add services count to each quote
      const quotesWithCounts = data.map(quote => ({
        ...quote,
        services_count: quote.quote_services?.[0]?.count || 0
      }))

      setQuotes(quotesWithCounts)
    } catch (error: any) {
      setError(error.message)
      console.error('Error fetching quotes:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchQuotes()
  }, [statusFilter, sortBy, sortOrder, fetchQuotes])

  const filteredQuotes = quotes.filter(quote => {
    const searchLower = searchTerm.toLowerCase()
    return (
      quote.customer_name.toLowerCase().includes(searchLower) ||
      quote.building_name.toLowerCase().includes(searchLower) ||
      quote.quote_number.toLowerCase().includes(searchLower) ||
      quote.customer_email.toLowerCase().includes(searchLower) ||
      (quote.company_name || '').toLowerCase().includes(searchLower)
    )
  })

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId)

      if (error) throw error

      await fetchQuotes() // Refresh the list
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDownloadPDF = async (quote: Quote) => {
    try {
      // Need to fetch full quote data with services
      const { data: fullQuote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quote.id)
        .single()

      if (quoteError) throw quoteError

      const { data: services, error: servicesError } = await supabase
        .from('quote_services')
        .select('*')
        .eq('quote_id', quote.id)

      if (servicesError) throw servicesError

      await QuotePDFGenerator.downloadQuotePDF({
        ...fullQuote,
        services
      })
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleDuplicateQuote = async (quote: Quote) => {
    try {
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
          total_price: quote.total_price,
          status: 'draft'
        })
        .select()
        .single()

      if (quoteError) throw quoteError

      // Get original services
      const { data: services, error: servicesError } = await supabase
        .from('quote_services')
        .select('*')
        .eq('quote_id', quote.id)

      if (servicesError) throw servicesError

      // Duplicate services
      if (services.length > 0) {
        const serviceInserts = services.map(service => ({
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

      await fetchQuotes() // Refresh the list
    } catch (error: any) {
      setError(error.message)
    }
  }

  const getStatusBadge = (status: string) => (
    <Badge className={STATUS_COLORS[status as keyof typeof STATUS_COLORS]}>
      {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
    </Badge>
  )

  const getTotalRevenue = () => {
    return filteredQuotes
      .filter(q => q.status === 'approved')
      .reduce((sum, q) => sum + q.total_price, 0)
  }

  const getQuoteStats = () => {
    const total = filteredQuotes.length
    const draft = filteredQuotes.filter(q => q.status === 'draft').length
    const sent = filteredQuotes.filter(q => q.status === 'sent').length
    const approved = filteredQuotes.filter(q => q.status === 'approved').length
    const rejected = filteredQuotes.filter(q => q.status === 'rejected').length

    return { total, draft, sent, approved, rejected }
  }

  const stats = getQuoteStats()

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Quotes</h1>
          <p className='text-gray-600'>Manage and track all your project estimates</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={fetchQuotes}>
            <RefreshCw className='h-4 w-4 mr-2' />
            Refresh
          </Button>
          <Link href='/calculator'>
            <Button>
              <Plus className='h-4 w-4 mr-2' />
              New Quote
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Total Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-gray-600'>{stats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>{stats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              ${getTotalRevenue().toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg'>Filters & Search</CardTitle>
            <div className='flex items-center gap-2'>
              <Filter className='h-4 w-4 text-gray-500' />
              <span className='text-sm text-gray-500'>
                {filteredQuotes.length} of {quotes.length} quotes
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <div className='relative'>
              <Search className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
              <Input
                placeholder='Search quotes...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder='Filter by status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Statuses</SelectItem>
                <SelectItem value='draft'>Draft</SelectItem>
                <SelectItem value='sent'>Sent</SelectItem>
                <SelectItem value='approved'>Approved</SelectItem>
                <SelectItem value='rejected'>Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder='Sort by' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='date'>Date Created</SelectItem>
                <SelectItem value='amount'>Quote Amount</SelectItem>
                <SelectItem value='customer'>Customer Name</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder='Order' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='desc'>Newest First</SelectItem>
                <SelectItem value='asc'>Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <RefreshCw className='h-6 w-6 animate-spin mr-2' />
              Loading quotes...
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className='text-center py-8'>
              <FileText className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>No quotes found</h3>
              <p className='text-gray-500 mb-4'>
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first quote'
                }
              </p>
              <Link href='/calculator'>
                <Button>
                  <Plus className='h-4 w-4 mr-2' />
                  Create First Quote
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className='w-[50px]'></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map((quote) => (
                  <TableRow key={quote.id} className='hover:bg-gray-50'>
                    <TableCell className='font-mono text-sm'>
                      {quote.quote_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className='font-medium'>{quote.customer_name}</div>
                        {quote.company_name && (
                          <div className='text-sm text-gray-500'>{quote.company_name}</div>
                        )}
                        <div className='text-sm text-gray-500'>{quote.customer_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className='font-medium'>{quote.building_name}</div>
                        <div className='text-sm text-gray-500'>{quote.building_address}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline'>
                        {quote.services_count} service{quote.services_count !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='font-medium'>${quote.total_price.toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(quote.status)}
                    </TableCell>
                    <TableCell className='text-sm text-gray-500'>
                      {format(new Date(quote.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='sm'>
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem asChild>
                            <Link href={`/quotes/${quote.id}`}>
                              <Eye className='mr-2 h-4 w-4' />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/quotes/${quote.id}/edit`}>
                              <Edit className='mr-2 h-4 w-4' />
                              Edit Quote
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateQuote(quote)}>
                            <Copy className='mr-2 h-4 w-4' />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPDF(quote)}>
                            <Download className='mr-2 h-4 w-4' />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className='mr-2 h-4 w-4' />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteQuote(quote.id)}
                            className='text-red-600'
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function QuotesPage() {
  return (
    <div className="container mx-auto py-8">
      <QuotesContent />
    </div>
  )
}
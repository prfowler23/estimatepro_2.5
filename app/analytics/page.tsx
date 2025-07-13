'use client'

import { useState, useEffect } from 'react'
import { AnalyticsOverview } from '@/components/analytics/analytics-overview'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  RefreshCw,
  Download,
  Calendar,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Filter
} from 'lucide-react'
import { AnalyticsService, type AnalyticsData } from '@/lib/analytics/data'

interface DateRange {
  label: string
  value: string
  days: number
}

const DATE_RANGES: DateRange[] = [
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'Last 12 months', value: '12m', days: 365 },
  { label: 'All time', value: 'all', days: 0 }
]

function AnalyticsContent() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30d')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check database connection first
      const isConnected = await AnalyticsService.checkDatabaseConnection()
      if (!isConnected) {
        throw new Error('Unable to connect to database. Please check your connection.')
      }
      
      const analyticsData = await AnalyticsService.getFullAnalyticsData()
      setData(analyticsData)
      setLastUpdated(new Date())
      
      // Log the data for debugging
      console.log('Analytics data loaded:', analyticsData)
    } catch (error: any) {
      setError(error.message || 'Failed to load analytics data')
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  const handleExportData = async () => {
    if (!data) return

    try {
      // Create CSV data
      const csvData = [
        ['Metric', 'Value'],
        ['Total Revenue', data.overview.totalRevenue.toString()],
        ['Total Quotes', data.overview.totalQuotes.toString()],
        ['Average Quote Value', data.overview.avgQuoteValue.toString()],
        ['Conversion Rate', data.overview.conversionRate.toString()],
        ['Active Projects', data.overview.activeProjects.toString()],
        ['Monthly Growth', data.overview.monthlyGrowth.toString()],
        ['Year over Year Growth', data.overview.yearOverYear.toString()],
        ['Top Service', data.overview.topService],
        ['Total Customers', data.customers.totalCustomers.toString()],
        ['New Customers', data.customers.newCustomers.toString()],
        ['Repeat Customers', data.customers.repeatCustomers.toString()],
      ]

      const csvContent = csvData.map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const formatLastUpdated = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getInsights = () => {
    if (!data) return []

    const insights = []

    // Revenue insights
    if (data.overview.monthlyGrowth > 10) {
      insights.push({
        type: 'positive',
        title: 'Strong Revenue Growth',
        description: `Revenue is up ${data.overview.monthlyGrowth.toFixed(1)}% from last month`,
        icon: TrendingUp
      })
    } else if (data.overview.monthlyGrowth < -10) {
      insights.push({
        type: 'warning',
        title: 'Revenue Decline',
        description: `Revenue is down ${Math.abs(data.overview.monthlyGrowth).toFixed(1)}% from last month`,
        icon: AlertTriangle
      })
    }

    // Conversion insights
    if (data.overview.conversionRate < 30) {
      insights.push({
        type: 'warning',
        title: 'Low Conversion Rate',
        description: `Conversion rate is ${data.overview.conversionRate.toFixed(1)}%. Consider follow-up strategies.`,
        icon: AlertTriangle
      })
    }

    // Service insights
    const topService = data.services[0]
    if (topService && topService.monthlyGrowth > 20) {
      insights.push({
        type: 'positive',
        title: 'Service Growth Opportunity',
        description: `${topService.serviceName} is growing ${topService.monthlyGrowth.toFixed(1)}% monthly`,
        icon: TrendingUp
      })
    }

    return insights
  }

  const insights = getInsights()

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Analytics Dashboard</h1>
          <p className='text-gray-600'>
            Business intelligence and performance insights
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <div className='text-sm text-gray-500'>
            Last updated: {formatLastUpdated(lastUpdated)}
          </div>
          <Button variant='outline' onClick={handleExportData} disabled={!data}>
            <Download className='h-4 w-4 mr-2' />
            Export
          </Button>
          <Button onClick={fetchAnalyticsData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg'>Filters</CardTitle>
            <div className='flex items-center gap-2'>
              <Filter className='h-4 w-4 text-gray-500' />
              <span className='text-sm text-gray-500'>Data Range</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <Calendar className='h-4 w-4 text-gray-500' />
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className='w-40'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className='text-sm text-gray-500'>
              Showing data for {DATE_RANGES.find(r => r.value === dateRange)?.label.toLowerCase()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <TrendingUp className='h-5 w-5' />
              Key Insights
            </CardTitle>
            <CardDescription>
              AI-powered insights and recommendations based on your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {insights.map((insight, index) => {
                const Icon = insight.icon
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.type === 'positive'
                        ? 'bg-green-50 border-green-500'
                        : 'bg-yellow-50 border-yellow-500'
                    }`}
                  >
                    <div className='flex items-center gap-2 mb-2'>
                      <Icon className={`h-4 w-4 ${
                        insight.type === 'positive' ? 'text-green-600' : 'text-yellow-600'
                      }`} />
                      <h4 className='font-medium text-sm'>{insight.title}</h4>
                    </div>
                    <p className='text-sm text-gray-600'>{insight.description}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && !data && (
        <Card>
          <CardContent className='flex items-center justify-center py-12'>
            <div className='text-center'>
              <RefreshCw className='h-8 w-8 animate-spin mx-auto mb-4 text-blue-600' />
              <h3 className='text-lg font-medium mb-2'>Loading Analytics</h3>
              <p className='text-gray-500'>Analyzing your business data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Dashboard or Empty State */}
      {!loading && data && !error && (
        data.overview.totalQuotes === 0 ? (
          <Card>
            <CardContent className='flex items-center justify-center py-12'>
              <div className='text-center'>
                <BarChart3 className='h-12 w-12 mx-auto mb-4 text-gray-400' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>No Quote Data Available</h3>
                <p className='text-gray-500 mb-4'>
                  Create your first quote to start seeing analytics and insights
                </p>
                <div className='flex gap-2 justify-center'>
                  <Button variant='outline' onClick={fetchAnalyticsData}>
                    <RefreshCw className='h-4 w-4 mr-2' />
                    Refresh Data
                  </Button>
                  <Button asChild>
                    <a href='/calculator'>Create Quote</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <AnalyticsOverview data={data} />
        )
      )}

      {/* True Empty State */}
      {!loading && !data && !error && (
        <Card>
          <CardContent className='flex items-center justify-center py-12'>
            <div className='text-center'>
              <BarChart3 className='h-12 w-12 mx-auto mb-4 text-gray-400' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>Analytics Unavailable</h3>
              <p className='text-gray-500 mb-4'>
                Unable to load analytics data
              </p>
              <Button onClick={fetchAnalyticsData}>
                <RefreshCw className='h-4 w-4 mr-2' />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <AnalyticsContent />
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { AnalyticsOverview } from '@/components/analytics/analytics-overview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  RefreshCw,
  BarChart3,
  AlertTriangle,
  TrendingUp
} from 'lucide-react'
import { AnalyticsService, type AnalyticsData } from '@/lib/analytics/data'

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
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
      
    } catch (error: any) {
      setError(error.message || 'Failed to load dashboard data')
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Business overview and key metrics</p>
        </div>
        <Button onClick={fetchDashboardData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && !data && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-medium mb-2">Loading Dashboard</h3>
              <p className="text-muted-foreground">Fetching your business data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Content */}
      {!loading && data && !error && (
        data.overview.totalQuotes === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first estimate to start seeing dashboard insights
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={fetchDashboardData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button asChild>
                    <a href="/calculator">Create Estimate</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <AnalyticsOverview data={data} />
        )
      )}

      {/* Empty State */}
      {!loading && !data && !error && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard Unavailable</h3>
              <p className="text-muted-foreground mb-4">
                Unable to load dashboard data
              </p>
              <Button onClick={fetchDashboardData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
import { supabase } from '@/lib/supabase/client'
import { startOfMonth, endOfMonth, subMonths, format, startOfYear, endOfYear } from 'date-fns'

export interface AnalyticsData {
  overview: OverviewMetrics
  revenue: RevenueData
  services: ServiceMetrics[]
  customers: CustomerMetrics
  conversion: ConversionData
  locations: LocationMetrics[]
  trends: TrendData
}

export interface OverviewMetrics {
  totalQuotes: number
  totalRevenue: number
  avgQuoteValue: number
  conversionRate: number
  activeProjects: number
  monthlyGrowth: number
  yearOverYear: number
  topService: string
}

export interface RevenueData {
  monthly: MonthlyRevenue[]
  quarterly: QuarterlyRevenue[]
  yearly: YearlyRevenue[]
  breakdown: ServiceRevenueBreakdown[]
}

export interface MonthlyRevenue {
  month: string
  revenue: number
  quotes: number
  avgValue: number
}

export interface QuarterlyRevenue {
  quarter: string
  revenue: number
  quotes: number
  growth: number
}

export interface YearlyRevenue {
  year: string
  revenue: number
  quotes: number
  growth: number
}

export interface ServiceRevenueBreakdown {
  service: string
  revenue: number
  percentage: number
  quotes: number
  avgValue: number
}

export interface ServiceMetrics {
  serviceType: string
  serviceName: string
  totalQuotes: number
  totalRevenue: number
  avgPrice: number
  avgHours: number
  conversionRate: number
  trend: 'up' | 'down' | 'stable'
  monthlyGrowth: number
}

export interface CustomerMetrics {
  totalCustomers: number
  newCustomers: number
  repeatCustomers: number
  avgCustomerValue: number
  topCustomers: TopCustomer[]
  customersByType: CustomerTypeBreakdown[]
}

export interface TopCustomer {
  name: string
  company: string
  totalRevenue: number
  totalQuotes: number
  lastQuote: string
}

export interface CustomerTypeBreakdown {
  type: string
  count: number
  revenue: number
  percentage: number
}

export interface ConversionData {
  overall: number
  byService: ServiceConversion[]
  byLocation: LocationConversion[]
  funnel: ConversionFunnel[]
}

export interface ServiceConversion {
  service: string
  drafts: number
  sent: number
  approved: number
  rejected: number
  rate: number
}

export interface LocationConversion {
  location: string
  rate: number
  revenue: number
  quotes: number
}

export interface ConversionFunnel {
  stage: string
  count: number
  percentage: number
}

export interface LocationMetrics {
  location: string
  totalQuotes: number
  totalRevenue: number
  avgQuoteValue: number
  conversionRate: number
  topService: string
  growth: number
}

export interface TrendData {
  quoteVolume: TrendPoint[]
  revenue: TrendPoint[]
  avgQuoteValue: TrendPoint[]
  conversionRate: TrendPoint[]
}

export interface TrendPoint {
  date: string
  value: number
  change?: number
}

export class AnalyticsService {
  static async checkDatabaseConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('quotes')
        .select('id')
        .limit(1)
      
      return !error
    } catch (error) {
      console.error('Database connection check failed:', error)
      return false
    }
  }
  static async getOverviewMetrics(): Promise<OverviewMetrics> {
    try {
      const currentMonth = new Date()
      const lastMonth = subMonths(currentMonth, 1)
      const lastYear = new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1)

      // Total quotes
      const { count: totalQuotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })

      if (quotesError) {
        console.error('Error fetching quotes count:', quotesError)
        throw new Error(`Database error: ${quotesError.message}`)
      }

      // Total revenue (approved quotes only)
      const { data: approvedQuotes, error: revenueError } = await supabase
        .from('quotes')
        .select('total_price')
        .eq('status', 'approved')

      if (revenueError) {
        console.warn('Error fetching revenue data:', revenueError)
      }

      const totalRevenue = approvedQuotes?.reduce((sum, quote) => sum + quote.total_price, 0) || 0

      // Average quote value
      const avgQuoteValue = totalQuotes ? totalRevenue / totalQuotes : 0

      // Conversion rate
      const { count: sentQuotes } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['sent', 'approved', 'rejected'])

      const { count: approvedCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')

      const conversionRate = sentQuotes ? (approvedCount! / sentQuotes!) * 100 : 0

      // Active projects (sent + approved)
      const { count: activeProjects } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['sent', 'approved'])

      // Monthly growth
      const { data: currentMonthQuotes } = await supabase
        .from('quotes')
        .select('total_price')
        .eq('status', 'approved')
        .gte('created_at', startOfMonth(currentMonth).toISOString())
        .lte('created_at', endOfMonth(currentMonth).toISOString())

      const { data: lastMonthQuotes } = await supabase
        .from('quotes')
        .select('total_price')
        .eq('status', 'approved')
        .gte('created_at', startOfMonth(lastMonth).toISOString())
        .lte('created_at', endOfMonth(lastMonth).toISOString())

      const currentMonthRevenue = currentMonthQuotes?.reduce((sum, q) => sum + q.total_price, 0) || 0
      const lastMonthRevenue = lastMonthQuotes?.reduce((sum, q) => sum + q.total_price, 0) || 0
      const monthlyGrowth = lastMonthRevenue ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

      // Year over year growth
      const { data: lastYearQuotes } = await supabase
        .from('quotes')
        .select('total_price')
        .eq('status', 'approved')
        .gte('created_at', startOfMonth(lastYear).toISOString())
        .lte('created_at', endOfMonth(lastYear).toISOString())

      const lastYearRevenue = lastYearQuotes?.reduce((sum, q) => sum + q.total_price, 0) || 0
      const yearOverYear = lastYearRevenue ? ((currentMonthRevenue - lastYearRevenue) / lastYearRevenue) * 100 : 0

      // Top service
      const { data: serviceData } = await supabase
        .from('quote_services')
        .select('service_type, price')
        .order('price', { ascending: false })

      const serviceRevenue = serviceData?.reduce((acc, service) => {
        acc[service.service_type] = (acc[service.service_type] || 0) + service.price
        return acc
      }, {} as Record<string, number>) || {}

      const topService = Object.entries(serviceRevenue).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'

      return {
        totalQuotes: totalQuotes || 0,
        totalRevenue,
        avgQuoteValue,
        conversionRate,
        activeProjects: activeProjects || 0,
        monthlyGrowth,
        yearOverYear,
        topService
      }
    } catch (error) {
      console.error('Error fetching overview metrics:', error)
      throw error
    }
  }

  static async getRevenueData(): Promise<RevenueData> {
    try {
      // Monthly revenue for last 12 months
      const monthlyData: MonthlyRevenue[] = []
      for (let i = 11; i >= 0; i--) {
        const month = subMonths(new Date(), i)
        const { data: quotes } = await supabase
          .from('quotes')
          .select('total_price')
          .eq('status', 'approved')
          .gte('created_at', startOfMonth(month).toISOString())
          .lte('created_at', endOfMonth(month).toISOString())

        const revenue = quotes?.reduce((sum, q) => sum + q.total_price, 0) || 0
        const quoteCount = quotes?.length || 0
        const avgValue = quoteCount ? revenue / quoteCount : 0

        monthlyData.push({
          month: format(month, 'MMM yyyy'),
          revenue,
          quotes: quoteCount,
          avgValue
        })
      }

      // Service revenue breakdown
      const { data: serviceData } = await supabase
        .from('quote_services')
        .select(`
          service_type,
          price,
          quotes!inner(status)
        `)
        .eq('quotes.status', 'approved')

      const serviceBreakdown = serviceData?.reduce((acc, service) => {
        const existing = acc.find(s => s.service === service.service_type)
        if (existing) {
          existing.revenue += service.price
          existing.quotes += 1
        } else {
          acc.push({
            service: service.service_type,
            revenue: service.price,
            percentage: 0, // Will calculate below
            quotes: 1,
            avgValue: service.price
          })
        }
        return acc
      }, [] as ServiceRevenueBreakdown[]) || []

      // Calculate percentages and average values
      const totalServiceRevenue = serviceBreakdown.reduce((sum, s) => sum + s.revenue, 0)
      serviceBreakdown.forEach(service => {
        service.percentage = totalServiceRevenue ? (service.revenue / totalServiceRevenue) * 100 : 0
        service.avgValue = service.quotes ? service.revenue / service.quotes : 0
      })

      return {
        monthly: monthlyData,
        quarterly: [], // TODO: Implement if needed
        yearly: [], // TODO: Implement if needed
        breakdown: serviceBreakdown.sort((a, b) => b.revenue - a.revenue)
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error)
      throw error
    }
  }

  static async getServiceMetrics(): Promise<ServiceMetrics[]> {
    try {
      const { data: serviceData, error } = await supabase
        .from('quote_services')
        .select(`
          service_type,
          price,
          total_hours,
          quotes!inner(status, created_at)
        `)

      if (error) {
        console.warn('Error fetching service metrics:', error)
        return []
      }

      if (!serviceData || serviceData.length === 0) {
        console.log('No service data found')
        return []
      }

      const currentMonth = new Date()
      const lastMonth = subMonths(currentMonth, 1)

      const serviceMetrics = serviceData.reduce((acc, service) => {
        const existing = acc.find(s => s.serviceType === service.service_type)
        const quote = Array.isArray(service.quotes) ? service.quotes[0] : service.quotes
        const isApproved = quote?.status === 'approved'
        const isCurrentMonth = new Date(quote?.created_at || '') >= startOfMonth(currentMonth)
        const isLastMonth = new Date(quote?.created_at || '') >= startOfMonth(lastMonth) && 
                            new Date(quote?.created_at || '') < startOfMonth(currentMonth)

        if (existing) {
          existing.totalQuotes += 1
          if (isApproved) {
            existing.totalRevenue += service.price
          }
          existing.avgHours = (existing.avgHours * (existing.totalQuotes - 1) + service.total_hours) / existing.totalQuotes
          
          if (isCurrentMonth) existing.currentMonthQuotes += 1
          if (isLastMonth) existing.lastMonthQuotes += 1
        } else {
          acc.push({
            serviceType: service.service_type,
            serviceName: service.service_type, // TODO: Map to friendly names
            totalQuotes: 1,
            totalRevenue: isApproved ? service.price : 0,
            avgPrice: 0, // Will calculate below
            avgHours: service.total_hours,
            conversionRate: 0, // Will calculate below
            trend: 'stable' as const,
            monthlyGrowth: 0,
            currentMonthQuotes: isCurrentMonth ? 1 : 0,
            lastMonthQuotes: isLastMonth ? 1 : 0
          })
        }
        return acc
      }, [] as any[]) || []

      // Calculate final metrics
      serviceMetrics.forEach(service => {
        service.avgPrice = service.totalQuotes ? service.totalRevenue / service.totalQuotes : 0
        
        // Calculate conversion rate (approved / total)
        const approvedCount = serviceData?.filter(s => {
          const quote = Array.isArray(s.quotes) ? s.quotes[0] : s.quotes
          return s.service_type === service.serviceType && quote?.status === 'approved'
        }).length || 0
        service.conversionRate = service.totalQuotes ? (approvedCount / service.totalQuotes) * 100 : 0
        
        // Calculate monthly growth and trend
        service.monthlyGrowth = service.lastMonthQuotes ? 
          ((service.currentMonthQuotes - service.lastMonthQuotes) / service.lastMonthQuotes) * 100 : 0
        
        service.trend = service.monthlyGrowth > 5 ? 'up' : 
                       service.monthlyGrowth < -5 ? 'down' : 'stable'

        // Clean up temporary fields
        delete service.currentMonthQuotes
        delete service.lastMonthQuotes
      })

      return serviceMetrics.sort((a, b) => b.totalRevenue - a.totalRevenue)
    } catch (error) {
      console.error('Error fetching service metrics:', error)
      throw error
    }
  }

  static async getCustomerMetrics(): Promise<CustomerMetrics> {
    try {
      const { data: quotes } = await supabase
        .from('quotes')
        .select('customer_name, company_name, total_price, status, created_at')
        .order('created_at', { ascending: false })

      if (!quotes) return {
        totalCustomers: 0,
        newCustomers: 0,
        repeatCustomers: 0,
        avgCustomerValue: 0,
        topCustomers: [],
        customersByType: []
      }

      // Group by customer
      const customerData = quotes.reduce((acc, quote) => {
        const key = `${quote.customer_name}-${quote.company_name || ''}`
        if (!acc[key]) {
          acc[key] = {
            name: quote.customer_name,
            company: quote.company_name || '',
            quotes: [],
            totalRevenue: 0,
            firstQuote: quote.created_at
          }
        }
        acc[key].quotes.push(quote)
        if (quote.status === 'approved') {
          acc[key].totalRevenue += quote.total_price
        }
        return acc
      }, {} as Record<string, any>)

      const customers = Object.values(customerData)
      const totalCustomers = customers.length
      const currentMonth = startOfMonth(new Date())
      const newCustomers = customers.filter(c => new Date(c.firstQuote) >= currentMonth).length
      const repeatCustomers = customers.filter(c => c.quotes.length > 1).length
      const totalRevenue = customers.reduce((sum, c) => sum + c.totalRevenue, 0)
      const avgCustomerValue = totalCustomers ? totalRevenue / totalCustomers : 0

      // Top customers
      const topCustomers: TopCustomer[] = customers
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10)
        .map(customer => ({
          name: customer.name,
          company: customer.company,
          totalRevenue: customer.totalRevenue,
          totalQuotes: customer.quotes.length,
          lastQuote: customer.quotes[0].created_at
        }))

      // Customer types breakdown (by company vs individual)
      const withCompany = customers.filter(c => c.company).length
      const withoutCompany = customers.filter(c => !c.company).length
      const companyRevenue = customers.filter(c => c.company).reduce((sum, c) => sum + c.totalRevenue, 0)
      const individualRevenue = customers.filter(c => !c.company).reduce((sum, c) => sum + c.totalRevenue, 0)

      const customersByType = [
        {
          type: 'Business',
          count: withCompany,
          revenue: companyRevenue,
          percentage: totalCustomers ? (withCompany / totalCustomers) * 100 : 0
        },
        {
          type: 'Individual',
          count: withoutCompany,
          revenue: individualRevenue,
          percentage: totalCustomers ? (withoutCompany / totalCustomers) * 100 : 0
        }
      ]

      return {
        totalCustomers,
        newCustomers,
        repeatCustomers,
        avgCustomerValue,
        topCustomers,
        customersByType
      }
    } catch (error) {
      console.error('Error fetching customer metrics:', error)
      throw error
    }
  }

  static async getConversionData(): Promise<ConversionData> {
    try {
      const { data: quotes } = await supabase
        .from('quotes')
        .select('status, quote_services(service_type)')

      if (!quotes) return {
        overall: 0,
        byService: [],
        byLocation: [],
        funnel: []
      }

      // Overall conversion
      const totalSent = quotes.filter(q => ['sent', 'approved', 'rejected'].includes(q.status)).length
      const totalApproved = quotes.filter(q => q.status === 'approved').length
      const overall = totalSent ? (totalApproved / totalSent) * 100 : 0

      // Conversion funnel
      const totalQuotes = quotes.length
      const drafts = quotes.filter(q => q.status === 'draft').length
      const sent = quotes.filter(q => q.status === 'sent').length
      const approved = quotes.filter(q => q.status === 'approved').length
      const rejected = quotes.filter(q => q.status === 'rejected').length

      const funnel: ConversionFunnel[] = [
        {
          stage: 'Created',
          count: totalQuotes,
          percentage: 100
        },
        {
          stage: 'Sent',
          count: sent + approved + rejected,
          percentage: totalQuotes ? ((sent + approved + rejected) / totalQuotes) * 100 : 0
        },
        {
          stage: 'Approved',
          count: approved,
          percentage: totalQuotes ? (approved / totalQuotes) * 100 : 0
        }
      ]

      return {
        overall,
        byService: [], // TODO: Implement if needed
        byLocation: [], // TODO: Implement if needed
        funnel
      }
    } catch (error) {
      console.error('Error fetching conversion data:', error)
      throw error
    }
  }

  static async getFullAnalyticsData(): Promise<AnalyticsData> {
    try {
      console.log('Starting analytics data fetch...')
      const [overview, revenue, services, customers, conversion] = await Promise.all([
        this.getOverviewMetrics(),
        this.getRevenueData(),
        this.getServiceMetrics(),
        this.getCustomerMetrics(),
        this.getConversionData()
      ])

      console.log('Analytics data fetched successfully:', {
        totalQuotes: overview.totalQuotes,
        totalRevenue: overview.totalRevenue,
        servicesCount: services.length,
        customersCount: customers.totalCustomers
      })

      return {
        overview,
        revenue,
        services,
        customers,
        conversion,
        locations: [], // TODO: Implement
        trends: {
          quoteVolume: [],
          revenue: [],
          avgQuoteValue: [],
          conversionRate: []
        }
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      throw error
    }
  }
}
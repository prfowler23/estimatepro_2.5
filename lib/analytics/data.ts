import { supabase } from "@/lib/supabase/client";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
} from "date-fns";
import { getServiceById } from "@/lib/constants/services";
// Analytics data moved to API route: /api/analytics/metrics

// Create client function for this file since it's used in client components
const createClient = () => supabase;

export interface AnalyticsData {
  overview: OverviewMetrics;
  revenue: RevenueData;
  services: ServiceMetrics[];
  customers: CustomerMetrics;
  conversion: ConversionData;
  locations: LocationMetrics[];
  trends: TrendData;
}

export interface OverviewMetrics {
  totalQuotes: number;
  totalEstimates: number; // Added for new terminology
  totalRevenue: number;
  avgQuoteValue: number;
  avgEstimateValue: number; // Added for new terminology
  conversionRate: number;
  activeProjects: number;
  monthlyGrowth: number;
  yearOverYear: number;
  topService: string;
}

export interface RevenueData {
  monthly: MonthlyRevenue[];
  quarterly: QuarterlyRevenue[];
  yearly: YearlyRevenue[];
  breakdown: ServiceRevenueBreakdown[];
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  estimates: number;
  avgValue: number;
}

export interface QuarterlyRevenue {
  quarter: string;
  revenue: number;
  estimates: number;
  growth: number;
}

export interface YearlyRevenue {
  year: string;
  revenue: number;
  estimates: number;
  growth: number;
}

export interface ServiceRevenueBreakdown {
  service: string;
  revenue: number;
  percentage: number;
  estimates: number;
  avgValue: number;
}

export interface ServiceMetrics {
  serviceType: string;
  serviceName: string;
  totalQuotes: number;
  totalEstimates: number; // Added for new terminology
  totalRevenue: number;
  avgPrice: number;
  avgHours: number;
  conversionRate: number;
  trend: "up" | "down" | "stable";
  monthlyGrowth: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomers: number;
  avgCustomerValue: number;
  topCustomers: TopCustomer[];
  customersByType: CustomerTypeBreakdown[];
}

export interface TopCustomer {
  name: string;
  company: string;
  totalRevenue: number;
  totalQuotes: number;
  lastQuote: string;
}

export interface CustomerTypeBreakdown {
  type: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface ConversionData {
  overall: number;
  byService: ServiceConversion[];
  byLocation: LocationConversion[];
  funnel: ConversionFunnel[];
}

export interface ServiceConversion {
  service: string;
  drafts: number;
  sent: number;
  approved: number;
  rejected: number;
  rate: number;
}

export interface LocationConversion {
  location: string;
  rate: number;
  revenue: number;
  estimates: number;
}

export interface ConversionFunnel {
  stage: string;
  count: number;
  percentage: number;
}

export interface LocationMetrics {
  location: string;
  totalQuotes: number;
  totalRevenue: number;
  avgQuoteValue: number;
  conversionRate: number;
  topService: string;
  growth: number;
}

export interface TrendData {
  quoteVolume: TrendPoint[];
  revenue: TrendPoint[];
  avgQuoteValue: TrendPoint[];
  conversionRate: TrendPoint[];
}

export interface TrendPoint {
  date: string;
  value: number;
  change?: number;
}

export class AnalyticsService {
  static async checkDatabaseConnection(): Promise<boolean> {
    const supabase = createClient();
    try {
      const { error } = await supabase.from("estimates").select("id").limit(1);

      return !error;
    } catch (error) {
      console.error("Database connection check failed:", error);
      return false;
    }
  }
  static async getOverviewMetrics(): Promise<OverviewMetrics> {
    const supabase = createClient();
    try {
      const currentMonth = new Date();
      const lastMonth = subMonths(currentMonth, 1);
      const lastYear = new Date(
        currentMonth.getFullYear() - 1,
        currentMonth.getMonth(),
        1,
      );

      // Total estimates
      const { count: totalQuotes, error: estimatesError } = await supabase
        .from("estimates")
        .select("*", { count: "exact", head: true });

      if (estimatesError) {
        console.error("Error fetching estimates count:", estimatesError);
        throw new Error(`Database error: ${estimatesError.message}`);
      }

      // Total revenue (approved estimates only)
      const { data: approvedQuotes, error: revenueError } = await supabase
        .from("estimates")
        .select("total_price")
        .eq("status", "approved");

      if (revenueError) {
        console.warn("Error fetching revenue data:", revenueError);
      }

      const totalRevenue =
        approvedQuotes?.reduce((sum, quote) => sum + quote.total_price, 0) || 0;

      // Average quote value
      const avgQuoteValue = totalQuotes ? totalRevenue / totalQuotes : 0;

      // Conversion rate
      const { count: sentQuotes } = await supabase
        .from("estimates")
        .select("*", { count: "exact", head: true })
        .in("status", ["sent", "approved", "rejected"]);

      const { count: approvedCount } = await supabase
        .from("estimates")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      const conversionRate = sentQuotes
        ? (approvedCount! / sentQuotes!) * 100
        : 0;

      // Active projects (sent + approved)
      const { count: activeProjects } = await supabase
        .from("estimates")
        .select("*", { count: "exact", head: true })
        .in("status", ["sent", "approved"]);

      // Monthly growth
      const { data: currentMonthQuotes } = await supabase
        .from("estimates")
        .select("total_price")
        .eq("status", "approved")
        .gte("created_at", startOfMonth(currentMonth).toISOString())
        .lte("created_at", endOfMonth(currentMonth).toISOString());

      const { data: lastMonthQuotes } = await supabase
        .from("estimates")
        .select("total_price")
        .eq("status", "approved")
        .gte("created_at", startOfMonth(lastMonth).toISOString())
        .lte("created_at", endOfMonth(lastMonth).toISOString());

      const currentMonthRevenue =
        currentMonthQuotes?.reduce((sum, q) => sum + q.total_price, 0) || 0;
      const lastMonthRevenue =
        lastMonthQuotes?.reduce((sum, q) => sum + q.total_price, 0) || 0;
      const monthlyGrowth = lastMonthRevenue
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

      // Year over year growth
      const { data: lastYearQuotes } = await supabase
        .from("estimates")
        .select("total_price")
        .eq("status", "approved")
        .gte("created_at", startOfMonth(lastYear).toISOString())
        .lte("created_at", endOfMonth(lastYear).toISOString());

      const lastYearRevenue =
        lastYearQuotes?.reduce((sum, q) => sum + q.total_price, 0) || 0;
      const yearOverYear = lastYearRevenue
        ? ((currentMonthRevenue - lastYearRevenue) / lastYearRevenue) * 100
        : 0;

      // Top service
      const { data: serviceData } = await supabase
        .from("estimate_services")
        .select("service_type, price")
        .order("price", { ascending: false });

      const serviceRevenue =
        serviceData?.reduce(
          (acc, service) => {
            acc[service.service_type] =
              (acc[service.service_type] || 0) + service.price;
            return acc;
          },
          {} as Record<string, number>,
        ) || {};

      const topService =
        Object.entries(serviceRevenue).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "N/A";

      return {
        totalQuotes: totalQuotes || 0,
        totalRevenue,
        avgQuoteValue,
        conversionRate,
        activeProjects: activeProjects || 0,
        monthlyGrowth,
        yearOverYear,
        topService,
      };
    } catch (error) {
      console.error("Error fetching overview metrics:", error);
      throw error;
    }
  }

  static async getRevenueData(): Promise<RevenueData> {
    const supabase = createClient();
    try {
      // Generate monthly revenue data for the last 12 months
      const monthlyData: MonthlyRevenue[] = await this.getMonthlyRevenueData();

      // Service revenue breakdown
      const { data: serviceData } = await supabase
        .from("estimate_services")
        .select(
          `
          service_type,
          price,
          estimates!inner(status)
        `,
        )
        .eq("estimates.status", "approved");

      const serviceBreakdown =
        serviceData?.reduce((acc, service) => {
          const existing = acc.find((s) => s.service === service.service_type);
          if (existing) {
            existing.revenue += service.price;
            existing.estimates += 1;
          } else {
            acc.push({
              service: service.service_type,
              revenue: service.price,
              percentage: 0, // Will calculate below
              estimates: 1,
              avgValue: service.price,
            });
          }
          return acc;
        }, [] as ServiceRevenueBreakdown[]) || [];

      // Calculate percentages and average values
      const totalServiceRevenue = serviceBreakdown.reduce(
        (sum, s) => sum + s.revenue,
        0,
      );
      serviceBreakdown.forEach((service) => {
        service.percentage = totalServiceRevenue
          ? (service.revenue / totalServiceRevenue) * 100
          : 0;
        service.avgValue = service.estimates
          ? service.revenue / service.estimates
          : 0;
      });

      return {
        monthly: monthlyData,
        quarterly: await this.getQuarterlyRevenueData(),
        yearly: await this.getYearlyRevenueData(),
        breakdown: serviceBreakdown.sort((a, b) => b.revenue - a.revenue),
      };
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      throw error;
    }
  }

  static async getServiceMetrics(): Promise<ServiceMetrics[]> {
    const supabase = createClient();
    try {
      // Service data now available via /api/analytics/metrics?metric=service_metrics
      const serviceData = [];

      // Map to expected ServiceMetrics interface
      return serviceData.map((service) => ({
        serviceType: service.serviceType,
        serviceName: service.serviceName,
        totalQuotes: service.totalQuotes,
        totalEstimates: service.totalEstimates,
        totalRevenue: service.totalRevenue,
        avgPrice: service.avgPrice,
        avgHours: service.avgHours,
        conversionRate: service.conversionRate,
        trend: service.trend,
        monthlyGrowth: service.monthlyGrowth,
      }));
    } catch (error) {
      console.error("Error fetching service metrics:", error);
      throw error;
    }
  }

  static async getCustomerMetrics(): Promise<CustomerMetrics> {
    const supabase = createClient();
    try {
      const { data: estimates } = await supabase
        .from("estimates")
        .select("customer_name, company_name, total_price, status, created_at")
        .order("created_at", { ascending: false });

      if (!estimates)
        return {
          totalCustomers: 0,
          newCustomers: 0,
          repeatCustomers: 0,
          avgCustomerValue: 0,
          topCustomers: [],
          customersByType: [],
        };

      // Group by customer
      const customerData = estimates.reduce(
        (acc, quote) => {
          const key = `${quote.customer_name}-${quote.company_name || ""}`;
          if (!acc[key]) {
            acc[key] = {
              name: quote.customer_name,
              company: quote.company_name || "",
              estimates: [],
              totalRevenue: 0,
              firstQuote: quote.created_at,
            };
          }
          acc[key].estimates.push(quote);
          if (quote.status === "approved") {
            acc[key].totalRevenue += quote.total_price;
          }
          return acc;
        },
        {} as Record<string, any>,
      );

      const customers = Object.values(customerData);
      const totalCustomers = customers.length;
      const currentMonth = startOfMonth(new Date());
      const newCustomers = customers.filter(
        (c) => new Date(c.firstQuote) >= currentMonth,
      ).length;
      const repeatCustomers = customers.filter(
        (c) => c.estimates.length > 1,
      ).length;
      const totalRevenue = customers.reduce(
        (sum, c) => sum + c.totalRevenue,
        0,
      );
      const avgCustomerValue = totalCustomers
        ? totalRevenue / totalCustomers
        : 0;

      // Top customers
      const topCustomers: TopCustomer[] = customers
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10)
        .map((customer) => ({
          name: customer.name,
          company: customer.company,
          totalRevenue: customer.totalRevenue,
          totalQuotes: customer.estimates.length,
          lastQuote: customer.estimates[0].created_at,
        }));

      // Customer types breakdown (by company vs individual)
      const withCompany = customers.filter((c) => c.company).length;
      const withoutCompany = customers.filter((c) => !c.company).length;
      const companyRevenue = customers
        .filter((c) => c.company)
        .reduce((sum, c) => sum + c.totalRevenue, 0);
      const individualRevenue = customers
        .filter((c) => !c.company)
        .reduce((sum, c) => sum + c.totalRevenue, 0);

      const customersByType = [
        {
          type: "Business",
          count: withCompany,
          revenue: companyRevenue,
          percentage: totalCustomers ? (withCompany / totalCustomers) * 100 : 0,
        },
        {
          type: "Individual",
          count: withoutCompany,
          revenue: individualRevenue,
          percentage: totalCustomers
            ? (withoutCompany / totalCustomers) * 100
            : 0,
        },
      ];

      return {
        totalCustomers,
        newCustomers,
        repeatCustomers,
        avgCustomerValue,
        topCustomers,
        customersByType,
      };
    } catch (error) {
      console.error("Error fetching customer metrics:", error);
      throw error;
    }
  }

  static async getConversionData(): Promise<ConversionData> {
    const supabase = createClient();
    try {
      const { data: estimates } = await supabase
        .from("estimates")
        .select("status, estimate_services(service_type)");

      if (!estimates)
        return {
          overall: 0,
          byService: [],
          byLocation: [],
          funnel: [],
        };

      // Overall conversion
      const totalSent = estimates.filter((q) =>
        ["sent", "approved", "rejected"].includes(q.status),
      ).length;
      const totalApproved = estimates.filter(
        (q) => q.status === "approved",
      ).length;
      const overall = totalSent ? (totalApproved / totalSent) * 100 : 0;

      // Conversion funnel
      const totalQuotes = estimates.length;
      const drafts = estimates.filter((q) => q.status === "draft").length;
      const sent = estimates.filter((q) => q.status === "sent").length;
      const approved = estimates.filter((q) => q.status === "approved").length;
      const rejected = estimates.filter((q) => q.status === "rejected").length;

      const funnel: ConversionFunnel[] = [
        {
          stage: "Created",
          count: totalQuotes,
          percentage: 100,
        },
        {
          stage: "Sent",
          count: sent + approved + rejected,
          percentage: totalQuotes
            ? ((sent + approved + rejected) / totalQuotes) * 100
            : 0,
        },
        {
          stage: "Approved",
          count: approved,
          percentage: totalQuotes ? (approved / totalQuotes) * 100 : 0,
        },
      ];

      return {
        overall,
        byService: await this.getConversionByService(),
        byLocation: await this.getConversionByLocation(),
        funnel,
      };
    } catch (error) {
      console.error("Error fetching conversion data:", error);
      throw error;
    }
  }

  static async getFullAnalyticsData(): Promise<AnalyticsData> {
    const supabase = createClient();
    try {
      console.log("Starting analytics data fetch...");
      const [overview, revenue, services, customers, conversion] =
        await Promise.all([
          this.getOverviewMetrics(),
          this.getRevenueData(),
          this.getServiceMetrics(),
          this.getCustomerMetrics(),
          this.getConversionData(),
        ]);

      console.log("Analytics data fetched successfully:", {
        totalQuotes: overview.totalQuotes,
        totalRevenue: overview.totalRevenue,
        servicesCount: services.length,
        customersCount: customers.totalCustomers,
      });

      return {
        overview,
        revenue,
        services,
        customers,
        conversion,
        locations: await this.getLocationAnalytics(),
        trends: {
          quoteVolume: [],
          revenue: [],
          avgQuoteValue: [],
          conversionRate: [],
        },
      };
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      throw error;
    }
  }

  // Helper method to map service type to friendly names
  private static mapServiceName(serviceType: string): string {
    const service = getServiceById(serviceType);
    return service?.name || serviceType;
  }

  // Get quarterly revenue data
  private static async getQuarterlyRevenueData(): Promise<ChartDataPoint[]> {
    const supabase = createClient();
    try {
      const now = new Date();
      const quarters = [];

      // Get last 4 quarters
      for (let i = 3; i >= 0; i--) {
        const quarterStart = startOfQuarter(subMonths(now, i * 3));
        const quarterEnd = endOfQuarter(quarterStart);

        const { data: estimates } = await supabase
          .from("estimates")
          .select("estimate_services(price)")
          .eq("status", "approved")
          .gte("created_at", quarterStart.toISOString())
          .lte("created_at", quarterEnd.toISOString());

        const revenue =
          estimates?.reduce((sum, estimate) => {
            return (
              sum +
                (estimate.estimate_services as any[])?.reduce(
                  (serviceSum, service) => serviceSum + (service.price || 0),
                  0,
                ) || 0
            );
          }, 0) || 0;

        quarters.push({
          date: format(quarterStart, "yyyy-QQ"),
          value: revenue,
        });
      }

      return quarters;
    } catch (error) {
      console.error("Error fetching quarterly revenue data:", error);
      return [];
    }
  }

  // Get yearly revenue data
  private static async getYearlyRevenueData(): Promise<ChartDataPoint[]> {
    const supabase = createClient();
    try {
      const now = new Date();
      const years = [];

      // Get last 3 years
      for (let i = 2; i >= 0; i--) {
        const yearStart = startOfYear(new Date(now.getFullYear() - i, 0, 1));
        const yearEnd = endOfYear(yearStart);

        const { data: estimates } = await supabase
          .from("estimates")
          .select("estimate_services(price)")
          .eq("status", "approved")
          .gte("created_at", yearStart.toISOString())
          .lte("created_at", yearEnd.toISOString());

        const revenue =
          estimates?.reduce((sum, estimate) => {
            return (
              sum +
                (estimate.estimate_services as any[])?.reduce(
                  (serviceSum, service) => serviceSum + (service.price || 0),
                  0,
                ) || 0
            );
          }, 0) || 0;

        years.push({
          date: format(yearStart, "yyyy"),
          value: revenue,
        });
      }

      return years;
    } catch (error) {
      console.error("Error fetching yearly revenue data:", error);
      return [];
    }
  }

  // Get conversion data by service
  private static async getConversionByService(): Promise<any[]> {
    const supabase = createClient();
    try {
      const { data: estimates } = await supabase
        .from("estimates")
        .select("status, estimate_services(service_type)")
        .gte("created_at", startOfYear(new Date()).toISOString());

      if (!estimates) return [];

      const serviceStats: Record<string, { total: number; approved: number }> =
        {};

      estimates.forEach((estimate) => {
        const services = estimate.estimate_services as any[];
        services?.forEach((service) => {
          const serviceType = service.service_type;
          if (!serviceStats[serviceType]) {
            serviceStats[serviceType] = { total: 0, approved: 0 };
          }
          serviceStats[serviceType].total += 1;
          if (estimate.status === "approved") {
            serviceStats[serviceType].approved += 1;
          }
        });
      });

      return Object.entries(serviceStats).map(([serviceType, stats]) => ({
        service: this.mapServiceName(serviceType),
        conversionRate:
          stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
        totalQuotes: stats.total,
        approvedQuotes: stats.approved,
      }));
    } catch (error) {
      console.error("Error fetching conversion by service:", error);
      return [];
    }
  }

  // Get conversion data by location (based on building address)
  private static async getConversionByLocation(): Promise<any[]> {
    const supabase = createClient();
    try {
      const { data: estimates } = await supabase
        .from("estimates")
        .select("status, building_address")
        .gte("created_at", startOfYear(new Date()).toISOString());

      if (!estimates) return [];

      const locationStats: Record<string, { total: number; approved: number }> =
        {};

      estimates.forEach((estimate) => {
        // Extract city from address (simplified)
        const city =
          estimate.building_address?.split(",")[1]?.trim() || "Unknown";
        if (!locationStats[city]) {
          locationStats[city] = { total: 0, approved: 0 };
        }
        locationStats[city].total += 1;
        if (estimate.status === "approved") {
          locationStats[city].approved += 1;
        }
      });

      return Object.entries(locationStats)
        .map(([city, stats]) => ({
          location: city,
          conversionRate:
            stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
          totalQuotes: stats.total,
          approvedQuotes: stats.approved,
        }))
        .sort((a, b) => b.totalQuotes - a.totalQuotes)
        .slice(0, 10); // Top 10 locations
    } catch (error) {
      console.error("Error fetching conversion by location:", error);
      return [];
    }
  }

  // Get monthly revenue data for the last 12 months
  private static async getMonthlyRevenueData(): Promise<MonthlyRevenue[]> {
    const supabase = createClient();
    try {
      const now = new Date();
      const months: MonthlyRevenue[] = [];

      // Get last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(monthStart);

        const { data: estimates } = await supabase
          .from("estimates")
          .select("total_price")
          .eq("status", "approved")
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        const { count: estimateCount } = await supabase
          .from("estimates")
          .select("*", { count: "exact", head: true })
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        const revenue =
          estimates?.reduce(
            (sum, estimate) => sum + (estimate.total_price || 0),
            0,
          ) || 0;
        const avgValue =
          estimateCount && estimateCount > 0 ? revenue / estimateCount : 0;

        months.push({
          month: format(monthStart, "MMM"),
          revenue,
          estimates: estimateCount || 0,
          avgValue,
        });
      }

      return months;
    } catch (error) {
      console.error("Error fetching monthly revenue data:", error);
      return [];
    }
  }

  // Get location analytics data
  private static async getLocationAnalytics(): Promise<any[]> {
    const supabase = createClient();
    try {
      const { data: estimates } = await supabase
        .from("estimates")
        .select("building_address, estimate_services(price, service_type)")
        .eq("status", "approved")
        .gte("created_at", startOfYear(new Date()).toISOString());

      if (!estimates) return [];

      const locationStats: Record<
        string,
        {
          totalRevenue: number;
          quoteCount: number;
          topServices: Record<string, number>;
        }
      > = {};

      estimates.forEach((estimate) => {
        const city =
          estimate.building_address?.split(",")[1]?.trim() || "Unknown";
        if (!locationStats[city]) {
          locationStats[city] = {
            totalRevenue: 0,
            quoteCount: 0,
            topServices: {},
          };
        }

        locationStats[city].quoteCount += 1;

        const services = estimate.estimate_services as any[];
        services?.forEach((service) => {
          locationStats[city].totalRevenue += service.price || 0;
          const serviceName = this.mapServiceName(service.service_type);
          locationStats[city].topServices[serviceName] =
            (locationStats[city].topServices[serviceName] || 0) + 1;
        });
      });

      return Object.entries(locationStats)
        .map(([city, stats]) => ({
          city,
          totalRevenue: stats.totalRevenue,
          quoteCount: stats.quoteCount,
          avgQuoteValue:
            stats.quoteCount > 0 ? stats.totalRevenue / stats.quoteCount : 0,
          topService:
            Object.entries(stats.topServices).sort(
              ([, a], [, b]) => b - a,
            )[0]?.[0] || "None",
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 15); // Top 15 locations
    } catch (error) {
      console.error("Error fetching location analytics:", error);
      return [];
    }
  }
}

import {
  UnifiedAnalyticsService,
  AIMetrics,
} from "@/lib/services/analytics-service-unified";
import type { AnalyticsData } from "@/lib/analytics/data";

describe("UnifiedAnalyticsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("AI Metrics Calculation", () => {
    it("should calculate AI metrics correctly", () => {
      const mockData: AnalyticsData = {
        overview: {
          totalQuotes: 50,
          totalEstimates: 50,
          totalRevenue: 100000,
          avgQuoteValue: 2000,
          avgEstimateValue: 2000,
          conversionRate: 0.8,
          activeProjects: 10,
          monthlyGrowth: 15,
          yearOverYear: 25,
          topService: "Window Cleaning",
        },
        revenue: {
          monthly: [
            { month: "2024-01", revenue: 25000, estimates: 12, avgValue: 2083 },
          ],
          quarterly: [
            { quarter: "Q1 2024", revenue: 75000, estimates: 36, growth: 15 },
          ],
          yearly: [
            { year: "2024", revenue: 300000, estimates: 150, growth: 25 },
          ],
          breakdown: [
            {
              service: "WC",
              revenue: 60000,
              percentage: 60,
              estimates: 30,
              avgValue: 2000,
            },
          ],
        },
        services: [
          {
            serviceType: "WC",
            serviceName: "Window Cleaning",
            totalQuotes: 30,
            totalEstimates: 30,
            totalRevenue: 60000,
            avgPrice: 2000,
            avgHours: 4,
            conversionRate: 0.85,
            trend: "up" as const,
            monthlyGrowth: 10,
          },
        ],
        customers: {
          totalCustomers: 25,
          newCustomers: 5,
          repeatCustomers: 20,
          avgCustomerValue: 4000,
          topCustomers: [
            {
              name: "Test Corp",
              company: "Test Company",
              totalRevenue: 10000,
              totalQuotes: 5,
              lastQuote: "2024-01-15",
            },
          ],
          customersByType: [
            { type: "commercial", count: 20, revenue: 80000, percentage: 80 },
          ],
        },
        conversion: {
          overall: 0.8,
          byService: [
            {
              service: "WC",
              drafts: 10,
              sent: 8,
              approved: 6,
              rejected: 2,
              rate: 0.75,
            },
          ],
          byLocation: [
            { location: "Downtown", rate: 0.85, revenue: 50000, estimates: 25 },
          ],
          funnel: [{ stage: "Initial", count: 100, percentage: 100 }],
        },
        locations: [
          {
            location: "Downtown",
            totalQuotes: 25,
            totalRevenue: 50000,
            avgQuoteValue: 2000,
            conversionRate: 0.85,
            topService: "WC",
            growth: 12,
          },
        ],
        trends: {
          quoteVolume: [{ date: "2024-01", value: 25, change: 5 }],
          revenue: [{ date: "2024-01", value: 50000, change: 10000 }],
          avgQuoteValue: [{ date: "2024-01", value: 2000, change: 100 }],
          conversionRate: [{ date: "2024-01", value: 0.8, change: 0.05 }],
        },
      };

      const result = UnifiedAnalyticsService.calculateAIMetrics(mockData);

      expect(result).toBeDefined();
      expect(typeof result.aiSavedHours).toBe("number");
      expect(typeof result.photoAccuracy).toBe("number");
      expect(typeof result.avgEstimateTime).toBe("number");
      expect(typeof result.automationRate).toBe("number");
    });

    it("should handle null data gracefully", () => {
      const result = UnifiedAnalyticsService.calculateAIMetrics(null);

      expect(result).toBeDefined();
      expect(result.aiSavedHours).toBe(0);
      expect(result.photoAccuracy).toBe(0);
      expect(result.avgEstimateTime).toBe(0);
      expect(result.automationRate).toBe(0);
    });

    it("should handle empty data", () => {
      const emptyData: AnalyticsData = {
        overview: {
          totalQuotes: 0,
          totalEstimates: 0,
          totalRevenue: 0,
          avgQuoteValue: 0,
          avgEstimateValue: 0,
          conversionRate: 0,
          activeProjects: 0,
          monthlyGrowth: 0,
          yearOverYear: 0,
          topService: "",
        },
        revenue: { monthly: [], quarterly: [], yearly: [], breakdown: [] },
        services: [],
        customers: {
          totalCustomers: 0,
          newCustomers: 0,
          repeatCustomers: 0,
          avgCustomerValue: 0,
          topCustomers: [],
          customersByType: [],
        },
        conversion: { overall: 0, byService: [], byLocation: [], funnel: [] },
        locations: [],
        trends: {
          quoteVolume: [],
          revenue: [],
          avgQuoteValue: [],
          conversionRate: [],
        },
      };

      const result = UnifiedAnalyticsService.calculateAIMetrics(emptyData);

      expect(result).toBeDefined();
      expect(typeof result.aiSavedHours).toBe("number");
      expect(typeof result.photoAccuracy).toBe("number");
    });
  });

  describe("Service Integration", () => {
    it("should have calculateAIMetrics method", () => {
      expect(typeof UnifiedAnalyticsService.calculateAIMetrics).toBe(
        "function",
      );
    });
  });

  describe("Static Methods", () => {
    it("should have all required static methods", () => {
      expect(typeof UnifiedAnalyticsService.calculateAIMetrics).toBe(
        "function",
      );
      expect(typeof UnifiedAnalyticsService.calculateTrends).toBe("function");
      expect(typeof UnifiedAnalyticsService.calculateTimeRangeMetrics).toBe(
        "function",
      );
    });
  });

  describe("Performance", () => {
    it("should complete AI metrics calculation quickly", () => {
      const startTime = Date.now();
      const mockData: AnalyticsData = {
        overview: {
          totalQuotes: 1000,
          totalEstimates: 1000,
          totalRevenue: 500000,
          avgQuoteValue: 500,
          avgEstimateValue: 500,
          conversionRate: 0.95,
          activeProjects: 50,
          monthlyGrowth: 20,
          yearOverYear: 30,
          topService: "Window Cleaning",
        },
        revenue: { monthly: [], quarterly: [], yearly: [], breakdown: [] },
        services: [],
        customers: {
          totalCustomers: 200,
          newCustomers: 25,
          repeatCustomers: 175,
          avgCustomerValue: 2500,
          topCustomers: [],
          customersByType: [],
        },
        conversion: {
          overall: 0.95,
          byService: [],
          byLocation: [],
          funnel: [],
        },
        locations: [],
        trends: {
          quoteVolume: [],
          revenue: [],
          avgQuoteValue: [],
          conversionRate: [],
        },
      };
      UnifiedAnalyticsService.calculateAIMetrics(mockData);
      const endTime = Date.now();

      // Should complete within 100ms (mocked response is instant)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle large datasets efficiently", () => {
      const largeData: AnalyticsData = {
        overview: {
          totalQuotes: 10000,
          totalEstimates: 10000,
          totalRevenue: 5000000,
          avgQuoteValue: 500,
          avgEstimateValue: 500,
          conversionRate: 0.95,
          activeProjects: 500,
          monthlyGrowth: 25,
          yearOverYear: 35,
          topService: "Window Cleaning",
        },
        revenue: { monthly: [], quarterly: [], yearly: [], breakdown: [] },
        services: [],
        customers: {
          totalCustomers: 2000,
          newCustomers: 250,
          repeatCustomers: 1750,
          avgCustomerValue: 2500,
          topCustomers: [],
          customersByType: [],
        },
        conversion: {
          overall: 0.95,
          byService: [],
          byLocation: [],
          funnel: [],
        },
        locations: [],
        trends: {
          quoteVolume: [],
          revenue: [],
          avgQuoteValue: [],
          conversionRate: [],
        },
      };

      expect(() =>
        UnifiedAnalyticsService.calculateAIMetrics(largeData),
      ).not.toThrow();
    });
  });

  describe("Integration", () => {
    it("should have all required static methods", () => {
      expect(typeof UnifiedAnalyticsService.calculateAIMetrics).toBe(
        "function",
      );
      expect(typeof UnifiedAnalyticsService.calculateTrends).toBe("function");
      expect(typeof UnifiedAnalyticsService.calculateTimeRangeMetrics).toBe(
        "function",
      );
    });
  });

  describe("Error Boundary", () => {
    it("should not crash on unexpected inputs", () => {
      expect(() =>
        UnifiedAnalyticsService.calculateAIMetrics(undefined as any),
      ).not.toThrow();
      expect(() =>
        UnifiedAnalyticsService.calculateAIMetrics("" as any),
      ).not.toThrow();
      expect(() =>
        UnifiedAnalyticsService.calculateAIMetrics([] as any),
      ).not.toThrow();
    });
  });
});

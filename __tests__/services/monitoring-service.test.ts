// Monitoring Service Tests - Updated for Unified Service

jest.mock("@/lib/services/monitoring-service-unified", () => ({
  unifiedMonitoringService: {
    getMetrics: jest.fn().mockImplementation(async () => ({
      current: {
        responseTime: 150,
        errorRate: 0.1,
        throughput: 100,
      },
      health: {
        status: "healthy",
        uptime: 99.9,
        lastCheck: new Date().toISOString(),
      },
    })),

    cancelRequests: jest.fn(),

    getPerformanceData: jest.fn().mockImplementation(async () => ({
      cpuUsage: 45,
      memoryUsage: 67,
      diskUsage: 23,
    })),

    submitMetric: jest.fn().mockImplementation(async () => ({ success: true })),

    getAlerts: jest.fn().mockImplementation(async () => []),

    acknowledgeAlert: jest
      .fn()
      .mockImplementation(async () => ({ success: true })),

    resolveAlert: jest.fn().mockImplementation(async () => ({ success: true })),

    getConfig: jest.fn().mockImplementation(async () => ({
      enabled: true,
      interval: 30000,
      retentionDays: 30,
      autoRefresh: true,
      refreshInterval: 30000,
      alertThresholds: {
        cpu: { warning: 70, critical: 90 },
        memory: { warning: 80, critical: 95 },
      },
    })),

    updateConfig: jest.fn().mockImplementation(async () => ({ success: true })),

    exportMetrics: jest.fn().mockImplementation(async () => new Blob()),
  },
}));

import { unifiedMonitoringService as monitoringService } from "@/lib/services/monitoring-service-unified";

// Mock fetch globally
global.fetch = jest.fn();

describe("UnifiedMonitoringService", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    // Cancel any pending requests after each test
    monitoringService.cancelRequests();
  });

  describe("getMetrics", () => {
    it("fetches metrics successfully", async () => {
      const mockMetrics = {
        current: {
          cpu: { usage: 50, load: [1, 2, 3] },
          memory: { used: 4000000000, total: 8000000000, percentage: 50 },
        },
        health: {
          checks: [],
          status: "healthy",
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMetrics,
      });

      const result = await monitoringService.getMetrics({
        hours: 24,
        include: ["current", "health"],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/monitoring/metrics?hours=24&include=current%2Chealth",
        expect.objectContaining({
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
      expect(result).toEqual(mockMetrics);
    });

    it("handles fetch errors gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      await expect(monitoringService.getMetrics({ hours: 24 })).rejects.toThrow(
        "Failed to fetch metrics: Internal Server Error",
      );
    });

    it("cancels previous requests when making a new one", async () => {
      const abortSpy = jest.spyOn(AbortController.prototype, "abort");

      // Start first request
      const promise1 = monitoringService.getMetrics({ hours: 24 });

      // Start second request immediately (should cancel first)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ current: {} }),
      });

      const promise2 = monitoringService.getMetrics({ hours: 48 });

      // First abort should have been called
      expect(abortSpy).toHaveBeenCalledTimes(1);

      await promise2;

      abortSpy.mockRestore();
    });
  });

  describe("submitMetric", () => {
    it("submits custom metrics successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await monitoringService.submitMetric("user_action", {
        action: "button_click",
        duration: 100,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/monitoring/metrics",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "user_action",
            data: {
              action: "button_click",
              duration: 100,
            },
          }),
        }),
      );
    });

    it("handles submission errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
      });

      await expect(
        monitoringService.submitMetric("invalid", {}),
      ).rejects.toThrow("Failed to submit metric: Bad Request");
    });
  });

  describe("getAlerts", () => {
    it("fetches alerts with filters", async () => {
      const mockAlerts = [
        {
          id: "1",
          type: "cpu",
          severity: "warning",
          message: "High CPU usage",
          timestamp: Date.now(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerts,
      });

      const result = await monitoringService.getAlerts({
        severity: "warning",
        resolved: false,
        limit: 10,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/monitoring/alerts?severity=warning&resolved=false&limit=10",
      );
      expect(result).toEqual(mockAlerts);
    });

    it("fetches all alerts when no filters provided", async () => {
      const mockAlerts = [
        {
          id: "1",
          type: "cpu",
          severity: "warning",
          message: "High CPU usage",
          timestamp: Date.now(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAlerts,
      });

      const result = await monitoringService.getAlerts();

      expect(global.fetch).toHaveBeenCalledWith("/api/monitoring/alerts?");
      expect(result).toEqual(mockAlerts);
    });
  });

  describe("acknowledgeAlert", () => {
    it("acknowledges an alert successfully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await monitoringService.acknowledgeAlert("alert-123", "user-456");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/monitoring/alerts/alert-123/acknowledge",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: "user-456" }),
        }),
      );
    });
  });

  describe("resolveAlert", () => {
    it("resolves an alert with resolution message", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await monitoringService.resolveAlert("alert-123", "Issue was fixed");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/monitoring/alerts/alert-123/resolve",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ resolution: "Issue was fixed" }),
        }),
      );
    });
  });

  describe("getConfig", () => {
    it("fetches monitoring configuration", async () => {
      const mockConfig = {
        enabled: true,
        interval: 30000,
        retentionDays: 30,
        autoRefresh: true,
        refreshInterval: 30000,
        alertThresholds: {
          cpu: { warning: 70, critical: 90 },
          memory: { warning: 80, critical: 95 },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const result = await monitoringService.getConfig();

      expect(global.fetch).toHaveBeenCalledWith("/api/monitoring/config");
      expect(result).toEqual(mockConfig);
    });
  });

  describe("updateConfig", () => {
    it("updates monitoring configuration", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const configUpdate = {
        autoRefresh: false,
        refreshInterval: 60000,
      };

      await monitoringService.updateConfig(configUpdate);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/monitoring/config",
        expect.objectContaining({
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(configUpdate),
        }),
      );
    });
  });

  describe("exportMetrics", () => {
    it("exports metrics as JSON", async () => {
      const mockBlob = new Blob(['{"data": "test"}'], {
        type: "application/json",
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const result = await monitoringService.exportMetrics("json", {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
        metrics: ["cpu", "memory"],
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/monitoring/export?format=json"),
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it("exports metrics as CSV", async () => {
      const mockBlob = new Blob(["cpu,memory\n50,75"], {
        type: "text/csv",
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const result = await monitoringService.exportMetrics("csv");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/monitoring/export?format=csv",
      );
      expect(result).toBeInstanceOf(Blob);
    });

    it("handles export errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Export failed",
      });

      await expect(monitoringService.exportMetrics("json")).rejects.toThrow(
        "Failed to export metrics: Export failed",
      );
    });
  });

  describe("cancelRequests", () => {
    it("cancels pending requests", () => {
      const abortSpy = jest.spyOn(AbortController.prototype, "abort");

      // Start a request
      monitoringService.getMetrics({ hours: 24 });

      // Cancel it
      monitoringService.cancelRequests();

      expect(abortSpy).toHaveBeenCalled();

      abortSpy.mockRestore();
    });
  });
});

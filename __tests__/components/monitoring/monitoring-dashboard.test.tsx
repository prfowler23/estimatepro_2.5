// MonitoringDashboard Component Tests

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MonitoringDashboard } from "@/components/monitoring/monitoring-dashboard";
import { unifiedMonitoringService } from "@/lib/services/monitoring-service-unified";

// Mock the monitoring service
jest.mock("@/lib/services/monitoring-service-unified", () => ({
  unifiedMonitoringService: {
    getMetrics: jest.fn(),
    getAlerts: jest.fn(),
    exportMetrics: jest.fn(),
    getHealthChecks: jest.fn(),
    getDashboardStats: jest.fn(),
  },
  useMonitoringMetrics: jest.fn(() => ({
    data: null,
    loading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useMonitoringAlerts: jest.fn(() => ({
    alerts: [],
    loading: false,
    error: null,
    acknowledgeAlert: jest.fn(),
    resolveAlert: jest.fn(),
  })),
}));

// Mock the toast hook (correct path)
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock Lucide icons to avoid issues with SVG rendering
jest.mock("lucide-react", () => ({
  Activity: () => <div data-testid="activity-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Server: () => <div data-testid="server-icon" />,
  Database: () => <div data-testid="database-icon" />,
  Cpu: () => <div data-testid="cpu-icon" />,
  MemoryStick: () => <div data-testid="memory-stick-icon" />,
  HardDrive: () => <div data-testid="hard-drive-icon" />,
  Network: () => <div data-testid="network-icon" />,
  Users: () => <div data-testid="users-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Bell: () => <div data-testid="bell-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  FileDown: () => <div data-testid="file-down-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  LineChart: () => <div data-testid="line-chart-icon" />,
  PieChart: () => <div data-testid="pie-chart-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
}));

const mockMetricsData = {
  current: {
    timestamp: Date.now(),
    cpu: { usage: 45.5, load: [1.2, 1.5, 1.8] },
    memory: { used: 4000000000, total: 8000000000, percentage: 50 },
    disk: { used: 500000000000, total: 1000000000000, percentage: 50 },
    network: { bytesIn: 1000000, bytesOut: 2000000, connectionsActive: 25 },
    application: {
      uptime: 86400000,
      responseTime: 150,
      errorRate: 0.5,
      activeUsers: 100,
    },
    database: { connections: 10, queryTime: 50, transactionRate: 100 },
  },
  health: {
    checks: [
      {
        name: "Database",
        status: "healthy" as const,
        lastCheck: Date.now() - 60000,
        message: "Database connection active",
      },
      {
        name: "API",
        status: "warning" as const,
        lastCheck: Date.now() - 30000,
        message: "API response time elevated",
      },
    ],
    status: "warning" as const,
  },
  stats: {
    uptime: 86400000,
    totalRequests: 10000,
    totalErrors: 50,
    peakCpuUsage: 85,
    peakMemoryUsage: 75,
  },
};

const mockAlerts = [
  {
    id: "alert-1",
    type: "cpu-usage",
    severity: "warning" as const,
    message: "CPU usage high: 85%",
    timestamp: Date.now() - 300000,
    resolved: false,
  },
  {
    id: "alert-2",
    type: "error-rate",
    severity: "critical" as const,
    message: "Error rate critical: 5%",
    timestamp: Date.now() - 600000,
    resolved: true,
  },
];

describe("MonitoringDashboard", () => {
  let mockService: typeof unifiedMonitoringService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockService = unifiedMonitoringService;

    // Setup default mock implementations
    (mockService.getMetrics as jest.Mock).mockResolvedValue({
      data: mockMetricsData,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    (mockService.getAlerts as jest.Mock).mockResolvedValue({
      alerts: mockAlerts,
      loading: false,
      error: null,
      acknowledgeAlert: jest.fn(),
      resolveAlert: jest.fn(),
    });

    (mockService.exportMetrics as jest.Mock) = jest
      .fn()
      .mockResolvedValue(new Blob(["test data"], { type: "application/json" }));
  });

  it("renders without crashing", () => {
    render(<MonitoringDashboard />);
    expect(screen.getByText("System Monitoring")).toBeInTheDocument();
  });

  it("displays system metrics correctly", () => {
    render(<MonitoringDashboard />);

    // Check uptime display
    expect(screen.getByText("System Uptime")).toBeInTheDocument();
    expect(screen.getByText("1d 0h")).toBeInTheDocument();

    // Check response time
    expect(screen.getByText("Response Time")).toBeInTheDocument();
    expect(screen.getByText("150ms")).toBeInTheDocument();

    // Check active users
    expect(screen.getByText("Active Users")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();

    // Check error rate
    expect(screen.getByText("Error Rate")).toBeInTheDocument();
    expect(screen.getByText("0.5%")).toBeInTheDocument();
  });

  it("displays health checks with correct status", () => {
    render(<MonitoringDashboard />);

    expect(screen.getByText("System Health")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("Database connection active")).toBeInTheDocument();
    expect(screen.getByText("API")).toBeInTheDocument();
    expect(screen.getByText("API response time elevated")).toBeInTheDocument();
  });

  it("shows loading state when data is being fetched", () => {
    (mockService.getMetrics as jest.Mock).mockResolvedValue({
      data: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<MonitoringDashboard />);

    // Check for loading indicators (skeleton components)
    const skeletons = document.querySelectorAll('[class*="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state when data fetch fails", () => {
    (mockService.getMetrics as jest.Mock).mockResolvedValue({
      data: null,
      loading: false,
      error: new Error("Failed to fetch"),
      refetch: jest.fn(),
    });

    render(<MonitoringDashboard />);

    expect(
      screen.getByText(/Failed to load monitoring data/i),
    ).toBeInTheDocument();
  });

  it("handles refresh button click", async () => {
    const refetchMock = jest.fn().mockResolvedValue({});
    (mockService.getMetrics as jest.Mock).mockResolvedValue({
      data: mockMetricsData,
      loading: false,
      error: null,
      refetch: refetchMock,
    });

    render(<MonitoringDashboard />);

    const refreshButton = screen.getByRole("button", {
      name: /refresh dashboard/i,
    });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalled();
    });
  });

  it("renders different tabs correctly", () => {
    render(<MonitoringDashboard />);

    // Check tabs exist
    expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /resources/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /alerts/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /analytics/i })).toBeInTheDocument();

    // Switch to resources tab
    fireEvent.click(screen.getByRole("tab", { name: /resources/i }));
    expect(screen.getByText("Resource Usage")).toBeInTheDocument();

    // Switch to alerts tab
    fireEvent.click(screen.getByRole("tab", { name: /alerts/i }));
    expect(screen.getByText("Recent Alerts")).toBeInTheDocument();
  });

  it("displays alerts in the alerts panel", () => {
    render(<MonitoringDashboard />);

    fireEvent.click(screen.getByRole("tab", { name: /alerts/i }));

    expect(screen.getByText("CPU usage high: 85%")).toBeInTheDocument();
    expect(screen.getByText("Error rate critical: 5%")).toBeInTheDocument();
  });

  it("shows resource usage with progress bars", () => {
    render(<MonitoringDashboard />);

    // Check CPU usage
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("45.5%")).toBeInTheDocument();

    // Check Memory usage
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();

    // Check Disk usage
    expect(screen.getByText("Disk")).toBeInTheDocument();

    // Check Network
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.getByText("25 active")).toBeInTheDocument();
  });

  it("opens settings dialog when settings button is clicked", () => {
    render(<MonitoringDashboard />);

    const settingsButton = screen.getByRole("button", {
      name: /dashboard settings/i,
    });
    fireEvent.click(settingsButton);

    expect(screen.getByText("Dashboard Settings")).toBeInTheDocument();
    expect(screen.getByText("Auto Refresh")).toBeInTheDocument();
    expect(screen.getByText("Refresh Interval")).toBeInTheDocument();
  });

  it("handles export functionality", async () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = jest.fn();

    // Mock document methods
    const mockClick = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();

    jest.spyOn(document, "createElement").mockImplementation(
      () =>
        ({
          href: "",
          download: "",
          click: mockClick,
        }) as any,
    );

    jest
      .spyOn(document.body, "appendChild")
      .mockImplementation(mockAppendChild);
    jest
      .spyOn(document.body, "removeChild")
      .mockImplementation(mockRemoveChild);

    render(<MonitoringDashboard />);

    // Open settings dialog
    const settingsButton = screen.getByRole("button", {
      name: /dashboard settings/i,
    });
    fireEvent.click(settingsButton);

    // Click export JSON button
    const exportButton = screen.getByRole("button", { name: /export json/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockService.exportMetrics).toHaveBeenCalledWith(
        "json",
        expect.any(Object),
      );
    });
  });

  it("handles auto-refresh toggle", () => {
    render(<MonitoringDashboard />);

    // Open settings dialog
    const settingsButton = screen.getByRole("button", {
      name: /dashboard settings/i,
    });
    fireEvent.click(settingsButton);

    // Find and click the auto-refresh toggle
    const autoRefreshButton = screen.getByRole("button", { name: /enabled/i });
    expect(autoRefreshButton).toBeInTheDocument();

    fireEvent.click(autoRefreshButton);

    // After clicking, it should show "Disabled"
    expect(
      screen.getByRole("button", { name: /disabled/i }),
    ).toBeInTheDocument();
  });

  it("applies correct status colors based on thresholds", () => {
    render(<MonitoringDashboard />);

    // Response time should show healthy status (150ms < 1000ms)
    const responseTimeCard = screen.getByText("150ms").closest("div");
    expect(responseTimeCard).toHaveClass("text-green-600");

    // Error rate should show healthy status (0.5% < 2%)
    const errorRateCard = screen.getByText("0.5%").closest("div");
    expect(errorRateCard).toHaveClass("text-green-600");
  });

  it("displays correct formatting for large numbers", () => {
    const largeNumberData = {
      ...mockMetricsData,
      current: {
        ...mockMetricsData.current,
        application: {
          ...mockMetricsData.current.application,
          activeUsers: 1500000,
        },
      },
    };

    (mockService.getMetrics as jest.Mock).mockResolvedValue({
      data: largeNumberData,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<MonitoringDashboard />);

    // Should format as "1.5M"
    expect(screen.getByText("1.5M")).toBeInTheDocument();
  });
});

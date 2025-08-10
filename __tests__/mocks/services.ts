// Service mocks for testing
import { jest } from "@jest/globals";

// AI Service Mock
export const mockAIService = {
  analyzeBuilding: jest.fn().mockImplementation(async () => ({
    findings: {
      surfaceArea: 5000,
      windowCount: 50,
      stories: 2,
    },
    confidence: 0.95,
    fileId: "test-file-id",
  })),

  extractContactInfo: jest.fn().mockImplementation(async () => ({
    customer: {
      name: "John Doe",
      email: "john@example.com",
      phone: "123-456-7890",
      address: "123 Main St",
    },
  })),

  recommendServices: jest
    .fn()
    .mockImplementation(async () => ["WC", "PW", "SW"]),

  validateScope: jest.fn().mockImplementation(async () => ({
    isValid: true,
    confidence: 0.95,
    warnings: ["Consider safety equipment for high floors"],
  })),
};

// Monitoring Service Mock
export const mockMonitoringService = {
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
};

// Session Recovery Service Mock
export const mockSessionRecoveryService = {
  saveSession: jest.fn().mockImplementation(async () => true),

  restoreSession: jest.fn().mockImplementation(async () => ({
    id: "test-session-id",
    data: { step: 1, formData: {} },
    timestamp: new Date().toISOString(),
  })),

  clearSession: jest.fn().mockImplementation(async () => true),

  hasRecoverableSession: jest.fn().mockImplementation(async () => true),
};

// Estimate Business Service Mock
export const mockEstimateBusinessService = {
  create: jest.fn().mockImplementation(async () => ({
    id: "test-estimate-id",
    status: "draft",
    totalPrice: 1000,
  })),

  update: jest.fn().mockImplementation(async () => true),

  delete: jest.fn().mockImplementation(async () => true),

  getById: jest.fn().mockImplementation(async () => ({
    id: "test-estimate-id",
    projectName: "Test Project",
    clientName: "Test Client",
  })),

  list: jest.fn().mockImplementation(async () => [
    {
      id: "test-estimate-1",
      projectName: "Project 1",
    },
  ]),
};

// Facade Analysis Service Mock
export const mockFacadeAnalysisService = {
  analyzeImages: jest.fn().mockImplementation(async () => ({
    id: "test-analysis-id",
    results: {
      buildingType: "commercial",
      materialTypes: ["brick", "glass"],
      windowCount: 45,
      surfaceArea: 5000,
    },
    confidence: 0.92,
  })),

  uploadImage: jest.fn().mockImplementation(async () => ({
    id: "test-image-id",
    url: "test-image-url",
  })),

  getAnalysis: jest.fn().mockImplementation(async () => ({
    id: "test-analysis-id",
    status: "completed",
    results: {},
  })),
};

// Cross-step Validation Service Mock
export const mockCrossStepValidationService = {
  validateStep: jest.fn().mockImplementation(async () => ({
    isValid: true,
    errors: [],
    warnings: [],
  })),

  validateDependencies: jest.fn().mockImplementation(async () => ({
    isValid: true,
    missingData: [],
  })),
};

// Export all mocks for easy importing
export const serviceMocks = {
  mockAIService,
  mockMonitoringService,
  mockSessionRecoveryService,
  mockEstimateBusinessService,
  mockFacadeAnalysisService,
  mockCrossStepValidationService,
};

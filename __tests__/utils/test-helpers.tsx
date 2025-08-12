/**
 * Enhanced Test Helpers for EstimatePro
 * Provides reusable utilities for testing
 */

import { render, RenderOptions } from "@testing-library/react";
import { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Data Generators
export const generateMockUser = (overrides = {}) => ({
  id: "test-user-123",
  email: "test@example.com",
  name: "Test User",
  role: "user",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

export const generateMockEstimate = (overrides = {}) => ({
  id: "test-estimate-123",
  title: "Test Estimate",
  status: "draft",
  total_amount: 1500.0,
  customer_name: "Test Customer",
  customer_email: "customer@example.com",
  services: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

export const generateMockService = (overrides = {}) => ({
  id: "test-service-123",
  name: "Window Cleaning",
  type: "window_cleaning",
  base_price: 100.0,
  quantity: 1,
  unit: "window",
  total: 100.0,
  ...overrides,
});

export const generateMockAnalytics = (overrides = {}) => ({
  total_estimates: 25,
  active_estimates: 8,
  completed_estimates: 15,
  revenue_this_month: 12500.0,
  conversion_rate: 0.65,
  average_estimate_value: 1850.0,
  ...overrides,
});

export const generateMockFacadeAnalysis = (overrides = {}) => ({
  id: "test-analysis-123",
  building_height: 25.5,
  window_count: 48,
  materials: ["glass", "brick", "metal"],
  confidence_score: 0.92,
  analysis_date: "2024-01-01T00:00:00Z",
  recommendations: [
    "Professional cleaning recommended",
    "Consider protective coating",
  ],
  ...overrides,
});

// Supabase Mock Helpers
export const createMockSupabaseResponse = <T,>(
  data: T | null = null,
  error: any = null,
) => ({
  data,
  error,
  count: data ? (Array.isArray(data) ? data.length : 1) : 0,
  status: error ? 400 : 200,
  statusText: error ? "Bad Request" : "OK",
});

export const createMockSupabaseClient = () => {
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(createMockSupabaseResponse(null)),
    maybeSingle: jest.fn().mockResolvedValue(createMockSupabaseResponse(null)),
    match: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
  }));

  return {
    from: mockFrom,
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue(createMockSupabaseResponse(generateMockUser())),
      getSession: jest.fn().mockResolvedValue(createMockSupabaseResponse(null)),
      signInWithPassword: jest
        .fn()
        .mockResolvedValue(createMockSupabaseResponse(generateMockUser())),
      signUp: jest
        .fn()
        .mockResolvedValue(createMockSupabaseResponse(generateMockUser())),
      signOut: jest.fn().mockResolvedValue(createMockSupabaseResponse({})),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest
          .fn()
          .mockResolvedValue(
            createMockSupabaseResponse({ path: "test-file.jpg" }),
          ),
        download: jest
          .fn()
          .mockResolvedValue(createMockSupabaseResponse(new Blob())),
        remove: jest.fn().mockResolvedValue(createMockSupabaseResponse({})),
        list: jest.fn().mockResolvedValue(createMockSupabaseResponse([])),
      })),
    },
  };
};

// AI Service Mock Helpers
export const createMockOpenAIResponse = (
  content: string = "Test AI response",
) => ({
  choices: [
    {
      message: {
        content,
        role: "assistant",
      },
      finish_reason: "stop",
    },
  ],
  usage: {
    prompt_tokens: 100,
    completion_tokens: 50,
    total_tokens: 150,
  },
});

export const createMockAIService = () => ({
  analyzePhoto: jest.fn().mockResolvedValue({
    analysis: "Mock photo analysis",
    confidence: 0.95,
    recommendations: ["Test recommendation"],
  }),
  generateEstimate: jest.fn().mockResolvedValue({
    services: [generateMockService()],
    total: 100.0,
    confidence: 0.88,
  }),
  analyzeFacade: jest.fn().mockResolvedValue(generateMockFacadeAnalysis()),
  chat: jest.fn().mockResolvedValue({
    response: "Mock AI chat response",
    conversation_id: "test-conversation-123",
  }),
});

// React Testing Library Helpers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {},
) => {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const Wrapper = ({ children }: { children: ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};

// Test Utilities
export const waitForAsync = (timeout = 100) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

export const mockConsoleError = () => {
  const originalError = console.error;
  console.error = jest.fn();

  return () => {
    console.error = originalError;
  };
};

export const mockConsoleWarn = () => {
  const originalWarn = console.warn;
  console.warn = jest.fn();

  return () => {
    console.warn = originalWarn;
  };
};

// Form Testing Helpers
export const mockFormData = (data: Record<string, any> = {}) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
};

export const createMockFile = (
  name = "test.jpg",
  type = "image/jpeg",
  size = 1024,
) => {
  const file = new File(["mock file content"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

// API Testing Helpers
export const mockFetch = (response: any, ok = true, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
    blob: () => Promise.resolve(new Blob([JSON.stringify(response)])),
    headers: new Headers(),
  });
};

export const mockFetchError = (error = "Network error") => {
  global.fetch = jest.fn().mockRejectedValue(new Error(error));
};

// Local Storage Mock
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
};

// Session Storage Mock
export const mockSessionStorage = () => {
  return mockLocalStorage(); // Same interface as localStorage
};

// Intersection Observer Mock
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  global.IntersectionObserver = mockIntersectionObserver;
};

// Resize Observer Mock
export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  global.ResizeObserver = mockResizeObserver;
};

// Error Boundary Testing Helper
export const TestErrorBoundary = ({ children }: { children: ReactNode }) => {
  try {
    return <>{children}</>;
  } catch (error) {
    return <div data-testid="error-boundary">Error caught</div>;
  }
};

// Test Environment Helpers
export const setupTestEnvironment = () => {
  // Set up all common mocks
  mockIntersectionObserver();
  mockResizeObserver();

  // Mock window properties
  Object.defineProperty(window, "localStorage", {
    value: mockLocalStorage(),
  });

  Object.defineProperty(window, "sessionStorage", {
    value: mockSessionStorage(),
  });

  // Mock matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Performance Testing Helpers
export const measurePerformance = async (fn: () => Promise<void> | void) => {
  const start = performance.now();
  await fn();
  const end = performance.now();
  return end - start;
};

export const expectPerformance = (duration: number, maxDuration: number) => {
  expect(duration).toBeLessThanOrEqual(maxDuration);
};

// Custom Jest Matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(items: any[]): R;
      toHaveValidationError(field: string): R;
    }
  }
}

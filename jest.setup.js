import "@testing-library/jest-dom";

// Add custom matchers
expect.extend({
  toBeOneOf(received, items) {
    const pass = items.includes(received);
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be one of [${items.join(", ")}]`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be one of [${items.join(", ")}]`,
        pass: false,
      };
    }
  },
});

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NzQ4NzQ4OCwiZXhwIjoxOTYzMDYzNDg4fQ.test-signature-placeholder-for-testing-purposes";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQ3NDg3NDg4LCJleHAiOjE5NjMwNjM0ODh9.test-service-signature-placeholder-for-testing-purposes";
process.env.OPENAI_API_KEY =
  "sk-proj-test1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
process.env.RESEND_API_KEY = "re_test_key_1234567890abcdef1234567890abcdef";
process.env.EMAIL_FROM = "test@example.com";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_NAME = "EstimatePro";
process.env.NEXT_PUBLIC_APP_VERSION = "2.5";
process.env.NODE_ENV = "test";

// AI Configuration
process.env.AI_CACHE_TTL = "3600";
process.env.AI_RATE_LIMIT_PER_MINUTE = "100";
process.env.AI_MAX_RETRIES = "3";
process.env.AI_ENABLE_CACHING = "true";
process.env.AI_ENABLE_LOGGING = "false";

// Feature Flags
process.env.NEXT_PUBLIC_ENABLE_AI = "true";
process.env.NEXT_PUBLIC_ENABLE_3D = "false";
process.env.NEXT_PUBLIC_ENABLE_WEATHER = "true";
process.env.NEXT_PUBLIC_ENABLE_DRONE = "false";
process.env.NEXT_PUBLIC_ENABLE_GUIDED_FLOW = "true";
process.env.NEXT_PUBLIC_DEBUG = "false";

// Performance & Reliability
process.env.ENABLE_DATABASE_OPTIMIZATION = "true";
process.env.ENABLE_LAZY_LOADING = "true";
process.env.RETRY_ATTEMPTS = "3";
process.env.CACHE_TTL = "1800";

// Security
process.env.API_RATE_LIMIT_PER_MINUTE = "100";
process.env.API_RATE_LIMIT_WINDOW = "60000";

// Monitoring
process.env.ENABLE_ERROR_MONITORING = "false";
process.env.ENABLE_PERFORMANCE_MONITORING = "false";

// Mock jose library
jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
  SignJWT: jest.fn(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn(),
  })),
}));

// Mock focus-management globally
jest.mock("@/components/ui/focus-management", () => ({
  FocusManager: ({ children }) => children,
  useFocusManager: () => ({
    registerFocusable: jest.fn(),
    unregisterFocusable: jest.fn(),
    focusNext: jest.fn(),
    focusPrevious: jest.fn(),
    focusFirst: jest.fn(),
    focusLast: jest.fn(),
    trapFocus: jest.fn(() => jest.fn()),
    announceToScreenReader: jest.fn(),
    currentFocusId: null,
  }),
  useFocusable: () => ({ current: null }),
}));

// Note: @/hooks/use-toast doesn't exist, hook is at @/components/ui/use-toast

// Mock use-toast from components/ui location as well
jest.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
    dismiss: jest.fn(),
    toasts: [],
  }),
  toast: jest.fn(),
}));

// Mock fetch globally for services that use it
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve({ data: {} }),
    text: () => Promise.resolve(""),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
    clone: jest.fn(),
  }),
);

// Mock real-time-pricing-service-unified
jest.mock("@/lib/services/real-time-pricing-service-unified", () => ({
  UnifiedRealTimePricingService: jest.fn().mockImplementation(() => ({
    calculateRealTimePricing: jest.fn().mockReturnValue({
      totalCost: 5000,
      confidence: "high",
      missingData: [],
      breakdown: [],
      metadata: {},
    }),
    subscribeToChanges: jest.fn(),
    unsubscribeFromChanges: jest.fn(),
    cleanup: jest.fn(),
  })),
}));

// Mock unified services specifically
jest.mock("@/lib/services/workflow-service-unified", () => ({
  unifiedWorkflowService: {
    validateStep: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      blockedSteps: [],
      confidence: "high",
      lastValidated: new Date(),
    }),
    validateCrossStepDependencies: jest.fn().mockReturnValue({
      isValid: true,
      warnings: [],
      errors: [],
      suggestions: [],
      blockedSteps: [],
      confidence: "high",
      lastValidated: new Date(),
    }),
    startRealTimeValidation: jest.fn(),
    stopRealTimeValidation: jest.fn(),
    subscribe: jest.fn(),
    notifyValidationChange: jest.fn(),
    addValidationRule: jest.fn(),
    removeValidationRule: jest.fn(),
    isValidating: false,
    cleanup: jest.fn(),
  },
  AutoSaveService: jest.fn().mockImplementation(() => ({
    enableAutoSave: jest.fn(),
    disableAutoSave: jest.fn(),
    saveNow: jest.fn().mockResolvedValue({ success: true }),
    getStatus: jest
      .fn()
      .mockReturnValue({ isEnabled: true, lastSave: new Date() }),
    cleanup: jest.fn(),
  })),
}));

// Mock analytics-service-unified
jest.mock("@/lib/services/analytics-service-unified", () => ({
  UnifiedAnalyticsService: {
    calculateAIMetrics: jest.fn().mockReturnValue({
      totalRequests: 100,
      successRate: 0.95,
      averageResponseTime: 1200,
      costPer1000: 2.5,
      modelsUsed: ["gpt-4-turbo"],
      errorRate: 0.05,
      tokens: {
        input: 10000,
        output: 5000,
        total: 15000,
      },
    }),
    trackEvent: jest.fn().mockResolvedValue(undefined),
    getMetrics: jest.fn().mockResolvedValue({
      events: [],
      summary: { totalEvents: 0, uniqueUsers: 0 },
    }),
    cleanup: jest.fn(),
  },
}));

// Mock estimate-service-unified
jest.mock("@/lib/services/estimate-service-unified", () => ({
  unifiedEstimateService: {
    createEstimate: jest.fn().mockResolvedValue({
      id: "test-estimate-123",
      status: "draft",
      totalCost: 5000,
    }),
    updateEstimate: jest.fn().mockResolvedValue({ success: true }),
    deleteEstimate: jest.fn().mockResolvedValue({ success: true }),
    getEstimate: jest.fn().mockResolvedValue({
      id: "test-estimate-123",
      status: "draft",
      totalCost: 5000,
    }),
    validateEstimate: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
    }),
    cleanup: jest.fn(),
  },
}));

// Mock resource-service-unified
jest.mock("@/lib/services/resource-service-unified", () => ({
  unifiedResourceService: {
    getResourceStatus: jest.fn().mockReturnValue({
      cpu: 50,
      memory: 60,
      disk: 70,
      network: 80,
    }),
    optimizeResources: jest.fn().mockResolvedValue({ success: true }),
    monitorPerformance: jest.fn(),
    cleanup: jest.fn(),
  },
}));

// Mock @supabase/ssr
jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
  createBrowserClient: jest.fn(() => ({
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  usePathname() {
    return "";
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Next.js server for API routes
jest.mock("next/server", () => {
  class MockHeaders {
    constructor(init = {}) {
      this.headers = new Map(Object.entries(init));
    }
    get(key) {
      return this.headers.get(key) || null;
    }
    set(key, value) {
      this.headers.set(key, value);
    }
  }

  class NextRequest {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || "GET";
      this.headers = new MockHeaders(init.headers || {});
      this.body = init.body;
      this._jsonBody = null;
    }
    async json() {
      if (!this._jsonBody && this.body) {
        this._jsonBody = JSON.parse(this.body);
      }
      return this._jsonBody || {};
    }
  }

  class NextResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = new MockHeaders(init.headers || {});
    }
    json() {
      return Promise.resolve(this.body);
    }
    static json(body, init = {}) {
      return new NextResponse(body, init);
    }
  }

  return {
    NextRequest,
    NextResponse,
  };
});

// Mock Supabase
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock Supabase admin
jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock universal client
jest.mock("@/lib/supabase/universal-client", () => ({
  createUniversalClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// Mock OpenAI
jest.mock("openai", () => {
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Test response" } }],
        }),
      },
    },
  }));

  // Set the constructor properly for default export
  MockOpenAI.prototype.constructor = MockOpenAI;

  return MockOpenAI;
});

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }),
);

// Mock window.location for Jest 30+
// Comment out for now to get tests running
// global.window.location = {
//   ...window.location,
//   href: "http://localhost:3000",
//   origin: "http://localhost:3000",
//   protocol: "http:",
//   host: "localhost:3000",
//   hostname: "localhost",
//   port: "3000",
//   pathname: "/",
//   search: "",
//   hash: "",
//   assign: jest.fn(),
//   reload: jest.fn(),
//   replace: jest.fn(),
// };

// Mock window.matchMedia
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

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock Next.js Request/Response objects
global.Request = jest.fn().mockImplementation((url, init) => ({
  url,
  method: init?.method || "GET",
  headers: new Map(Object.entries(init?.headers || {})),
  json: jest.fn().mockResolvedValue(init?.body ? JSON.parse(init.body) : {}),
}));

global.Response = jest.fn().mockImplementation((body, init) => ({
  body,
  status: init?.status || 200,
  headers: new Map(Object.entries(init?.headers || {})),
  json: jest
    .fn()
    .mockResolvedValue(typeof body === "string" ? JSON.parse(body) : body),
}));

// NextResponse mock is in __mocks__/next/server.js

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

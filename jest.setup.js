import "@testing-library/jest-dom";

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NzQ4NzQ4OCwiZXhwIjoxOTYzMDYzNDg4fQ.test-signature-placeholder-for-testing-purposes";
process.env.SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQ3NDg3NDg4LCJleHAiOjE5NjMwNjM0ODh9.test-service-signature-placeholder-for-testing-purposes";
process.env.OPENAI_API_KEY =
  "sk-proj-test1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
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

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

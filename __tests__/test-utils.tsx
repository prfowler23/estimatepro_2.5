import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProviders } from "@/components/providers/app-providers";

// Mock the focus-management module
jest.mock("@/components/ui/focus-management", () => ({
  FocusManager: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
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
  useFocusable: () => React.useRef(null),
}));

// Note: use-toast hook is at @/components/ui/use-toast, not @/hooks/use-toast

// Create a custom render function that includes all providers
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialRoute?: string;
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const customRender = (ui: ReactElement, options?: CustomRenderOptions) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };

// Mock factories
export const createMockEstimate = (overrides = {}) => ({
  id: "test-estimate-id",
  project_name: "Test Project",
  client_name: "Test Client",
  client_email: "test@example.com",
  client_phone: "123-456-7890",
  status: "draft",
  total_amount: 1000,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: "test-user-id",
  ...overrides,
});

export const createMockService = (overrides = {}) => ({
  id: "test-service-id",
  estimate_id: "test-estimate-id",
  service_name: "Window Cleaning",
  service_type: "window_cleaning",
  quantity: 1,
  unit_price: 100,
  total_price: 100,
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: "test-user-id",
  email: "test@example.com",
  user_metadata: {
    full_name: "Test User",
  },
  ...overrides,
});

// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: createMockUser() },
      error: null,
    }),
    signIn: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest
        .fn()
        .mockResolvedValue({ data: { path: "test-path" }, error: null }),
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
};

// Mock next/navigation
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
};

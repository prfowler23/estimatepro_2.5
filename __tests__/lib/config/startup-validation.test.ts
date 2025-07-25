import {
  startupValidator,
  StartupValidator,
  StartupValidationResult,
} from "@/lib/config/startup-validation";

// Mock the environment validation module
jest.mock("@/lib/config/env-validation", () => ({
  validateEnvWithWarnings: jest.fn(() => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
    SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
    OPENAI_API_KEY: "sk-test-key",
    RESEND_API_KEY: "re_test_key",
    EMAIL_FROM: "test@example.com",
    NEXT_PUBLIC_ENABLE_AI: true,
    NEXT_PUBLIC_DEBUG: false,
  })),
  validateClientSideEnv: jest.fn(),
}));

// Mock Supabase client
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

describe("Startup Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("StartupValidator", () => {
    it("should create singleton instance", () => {
      const instance1 = StartupValidator.getInstance();
      const instance2 = StartupValidator.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should validate startup successfully", async () => {
      const validator = StartupValidator.getInstance();
      const result = await validator.validateStartup();

      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.warnings).toBeInstanceOf(Array);
      expect(result.missingConfig).toBeInstanceOf(Array);
      expect(result.databaseStatus).toBeDefined();
      expect(result.features).toBeDefined();
    });

    it("should return cached result on subsequent calls", async () => {
      const validator = StartupValidator.getInstance();

      const result1 = await validator.validateStartup();
      const result2 = await validator.validateStartup();

      expect(result1).toBe(result2);
    });
  });

  describe("Startup validator instance", () => {
    it("should be accessible via exported instance", () => {
      expect(startupValidator).toBeDefined();
      expect(startupValidator).toBeInstanceOf(StartupValidator);
    });

    it("should validate startup configuration", async () => {
      const result = await startupValidator.validateStartup();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe("boolean");
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.missingConfig)).toBe(true);
      expect(["connected", "disconnected", "error"]).toContain(
        result.databaseStatus,
      );
      expect(typeof result.features).toBe("object");
    });
  });

  describe("Validation components", () => {
    it("should handle environment validation", async () => {
      const validator = StartupValidator.getInstance();
      const result = await validator.validateStartup();

      // Should not throw and should complete validation
      expect(result).toBeDefined();
    });

    it("should handle database connection validation", async () => {
      const validator = StartupValidator.getInstance();
      const result = await validator.validateStartup();

      expect(["connected", "disconnected", "error"]).toContain(
        result.databaseStatus,
      );
    });

    it("should validate feature flags", async () => {
      const validator = StartupValidator.getInstance();
      const result = await validator.validateStartup();

      expect(typeof result.features).toBe("object");
      expect(result.features).toBeDefined();
    });
  });
});

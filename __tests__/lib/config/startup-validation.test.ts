import {
  performStartupValidation,
  validateDatabaseConnection,
  validateAIServiceConnection,
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

describe("Startup Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("performStartupValidation", () => {
    it("should pass all validations successfully", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      expect(() => performStartupValidation()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        "🚀 Starting server-side validation...",
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "✅ All server-side validations passed",
      );

      consoleSpy.mockRestore();
    });

    it("should handle validation errors in production", () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
      });

      const {
        validateEnvWithWarnings,
      } = require("@/lib/config/env-validation");
      validateEnvWithWarnings.mockImplementation(() => {
        throw new Error("Validation failed");
      });

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("Process exit");
      });

      expect(() => performStartupValidation()).toThrow("Process exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ Server-side validation failed:",
        "Validation failed",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
      Object.defineProperty(process.env, "NODE_ENV", {
        value: originalEnv,
        writable: true,
      });
    });

    it("should continue in development mode despite errors", () => {
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "development",
        writable: true,
      });

      const {
        validateEnvWithWarnings,
      } = require("@/lib/config/env-validation");
      validateEnvWithWarnings.mockImplementation(() => {
        throw new Error("Validation failed");
      });

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      expect(() => performStartupValidation()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ Server-side validation failed:",
        "Validation failed",
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "⚠️  Continuing in development mode despite validation errors",
      );

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      Object.defineProperty(process.env, "NODE_ENV", {
        value: originalEnv,
        writable: true,
      });
    });
  });

  describe("validateDatabaseConnection", () => {
    it("should validate database connection successfully", async () => {
      const mockFetch = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await expect(validateDatabaseConnection()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        "🔍 Validating database connection...",
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "✅ Database connection validation passed",
      );

      mockFetch.mockRestore();
      consoleSpy.mockRestore();
    });

    it("should handle database connection failure", async () => {
      const mockFetch = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await expect(validateDatabaseConnection()).rejects.toThrow(
        "Database connection failed: 500",
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ Database connection validation failed:",
        "Database connection failed: 500",
      );

      mockFetch.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("should handle 401 as expected response", async () => {
      const mockFetch = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await expect(validateDatabaseConnection()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        "✅ Database connection validation passed",
      );

      mockFetch.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe("validateAIServiceConnection", () => {
    it("should validate AI service connection successfully", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await expect(validateAIServiceConnection()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        "🔍 Validating AI service connection...",
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "✅ AI service validation passed",
      );

      consoleSpy.mockRestore();
    });

    it("should skip validation when AI is disabled", async () => {
      const {
        validateEnvWithWarnings,
      } = require("@/lib/config/env-validation");
      validateEnvWithWarnings.mockReturnValue({
        NEXT_PUBLIC_ENABLE_AI: false,
        OPENAI_API_KEY: "sk-test-key",
      });

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await expect(validateAIServiceConnection()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        "ℹ️  AI features disabled, skipping AI service validation",
      );

      consoleSpy.mockRestore();
    });

    it("should handle invalid OpenAI API key", async () => {
      const {
        validateEnvWithWarnings,
      } = require("@/lib/config/env-validation");
      validateEnvWithWarnings.mockReturnValue({
        NEXT_PUBLIC_ENABLE_AI: true,
        OPENAI_API_KEY: "invalid-key",
      });

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await expect(validateAIServiceConnection()).rejects.toThrow(
        "Invalid OpenAI API key format",
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "❌ AI service validation failed:",
        "Invalid OpenAI API key format",
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

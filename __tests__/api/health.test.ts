import { GET, HEAD } from "@/app/api/health/route";
import { NextRequest } from "next/server";
import {
  createClient,
  createUniversalClient,
} from "@/lib/supabase/universal-client";

// Re-export the mocks for this test file
jest.mock("@/lib/supabase/universal-client", () => ({
  createClient: jest.fn(),
  createUniversalClient: jest.fn(),
}));

const mockedCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>;
const mockedCreateUniversalClient =
  createUniversalClient as jest.MockedFunction<typeof createUniversalClient>;

describe("/api/health", () => {
  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set default environment variable
    process.env.NEXT_PUBLIC_APP_VERSION = "2.5.0";

    // Override the default mock for this test
    mockedCreateClient.mockReturnValue(mockSupabaseClient as any);
    mockedCreateUniversalClient.mockReturnValue(mockSupabaseClient as any);
  });

  afterEach(() => {
    // Clean up environment variable
    delete process.env.NEXT_PUBLIC_APP_VERSION;
  });

  describe("GET /api/health", () => {
    it("should return healthy status when database is accessible", async () => {
      // Mock successful database query
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: "test-id" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/health");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("healthy");
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBe("2.5.0");
      expect(response.headers.get("Cache-Control")).toBe(
        "no-cache, no-store, must-revalidate",
      );
    });

    it("should return unhealthy status with 503 when database is not accessible", async () => {
      // Mock database error
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: "CONNECTION_ERROR",
          message: "Database connection failed",
        },
      });

      const request = new NextRequest("http://localhost/api/health");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe("unhealthy");
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBe("2.5.0");
    });

    it("should handle no rows returned as healthy", async () => {
      // Mock PGRST116 error (no rows returned) - this is actually healthy
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });

      const request = new NextRequest("http://localhost/api/health");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("healthy");
    });

    it("should use default version when environment variable is not set", async () => {
      delete process.env.NEXT_PUBLIC_APP_VERSION;

      mockSupabaseClient.single.mockResolvedValue({
        data: { id: "test-id" },
        error: null,
      });

      const request = new NextRequest("http://localhost/api/health");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.version).toBe("1.0.0");
    });

    it("should handle import errors gracefully", async () => {
      // Mock import failure
      mockedCreateClient.mockImplementation(() => {
        throw new Error("Import failed");
      });

      const request = new NextRequest("http://localhost/api/health");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe("unhealthy");
    });

    it("should handle unexpected errors", async () => {
      // Mock unexpected error
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const request = new NextRequest("http://localhost/api/health");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe("unhealthy");
      expect(data.timestamp).toBeDefined();
      expect(data.version).toBe("2.5.0"); // Version is included in the response
    });

    it("should not expose sensitive information in error cases", async () => {
      // Mock database error with sensitive information
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: {
          code: "AUTH_ERROR",
          message: "Authentication failed with password: secret123",
        },
      });

      const request = new NextRequest("http://localhost/api/health");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe("unhealthy");
      // Should not contain the error message with sensitive data
      expect(JSON.stringify(data)).not.toContain("secret123");
      expect(JSON.stringify(data)).not.toContain("password");
    });
  });

  describe("HEAD /api/health", () => {
    it("should return 200 for healthy database", async () => {
      // Mock successful database query - HEAD doesn't use .single()
      const freshMockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: "test-id" }],
          error: null,
        }),
      };

      mockedCreateClient.mockReturnValue(freshMockClient as any);
      mockedCreateUniversalClient.mockReturnValue(freshMockClient as any);

      const request = new NextRequest("http://localhost/api/health", {
        method: "HEAD",
      });
      const response = await HEAD(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(
        "no-cache, no-store, must-revalidate",
      );
      // HEAD requests should have no body
      expect(response.body).toBeNull();
    });

    it("should return 503 for unhealthy database", async () => {
      // Mock database error
      mockSupabaseClient.limit.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const request = new NextRequest("http://localhost/api/health", {
        method: "HEAD",
      });
      const response = await HEAD(request);

      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toBe(
        "no-cache, no-store, must-revalidate",
      );
      expect(response.body).toBeNull();
    });

    it("should handle import errors in HEAD request", async () => {
      // Mock import failure
      mockedCreateClient.mockImplementation(() => {
        throw new Error("Import failed");
      });

      const request = new NextRequest("http://localhost/api/health", {
        method: "HEAD",
      });
      const response = await HEAD(request);

      expect(response.status).toBe(503);
      expect(response.body).toBeNull();
    });
  });

  describe("Cache headers", () => {
    it("should always include no-cache headers", async () => {
      const scenarios = [
        {
          mockResponse: { data: { id: "test" }, error: null },
          expectedStatus: 200,
        },
        {
          mockResponse: { data: null, error: { code: "ERROR" } },
          expectedStatus: 503,
        },
      ];

      for (const scenario of scenarios) {
        mockSupabaseClient.single.mockResolvedValue(scenario.mockResponse);

        const request = new NextRequest("http://localhost/api/health");
        const response = await GET(request);

        expect(response.headers.get("Cache-Control")).toBe(
          "no-cache, no-store, must-revalidate",
        );
      }
    });
  });

  describe("Database query verification", () => {
    it("should query the profiles table with correct parameters", async () => {
      // Set up a fresh mock for this specific test
      const freshMockClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "test-id" },
          error: null,
        }),
      };

      mockedCreateClient.mockReturnValue(freshMockClient as any);

      const request = new NextRequest("http://localhost/api/health");
      await GET(request);

      expect(freshMockClient.from).toHaveBeenCalledWith("profiles");
      expect(freshMockClient.select).toHaveBeenCalledWith("id");
      expect(freshMockClient.limit).toHaveBeenCalledWith(1);
      expect(freshMockClient.single).toHaveBeenCalled();
    });
  });
});

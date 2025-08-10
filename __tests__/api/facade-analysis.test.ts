import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "@/app/api/facade-analysis/route";
import { POST as AnalyzePost } from "@/app/api/facade-analysis/[id]/analyze/route";

// Mock dependencies
jest.mock("@/lib/supabase/universal-client");
jest.mock("@/lib/services/facade-analysis-service");
jest.mock("@/lib/auth/auth-middleware");

describe("/api/facade-analysis", () => {
  const mockFacadeData = {
    id: "facade-test-1",
    buildingName: "Test Building",
    buildingAddress: "123 Test St",
    buildingType: "commercial",
    buildingHeight: 30,
    stories: 2,
    images: [
      {
        id: "1",
        name: "front.jpg",
        size: 1024000,
        type: "image/jpeg",
        url: "https://example.com/front.jpg",
      },
    ],
    aiAnalysis: {
      windowCount: 15,
      materials: [
        {
          type: "brick",
          coverage: 0.8,
          condition: "good",
          cleaningDifficulty: "medium",
        },
      ],
      measurements: {
        totalWallArea: 1800,
        windowArea: 300,
        accessibilityRating: 0.8,
        riskFactors: [],
      },
      recommendations: [
        {
          service: "window-cleaning",
          priority: "high",
          estimatedCost: 600,
          reasoning: "Regular maintenance needed",
        },
      ],
      confidence: 0.88,
      analysisTime: new Date(),
    },
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      version: "8.0",
      analysisModel: "gpt-4-vision",
    },
  };

  beforeEach(() => {
    // Mock authentication middleware
    const mockAuth = require("@/lib/auth/auth-middleware");
    mockAuth.validateAuth = jest.fn().mockResolvedValue({
      user: { id: "user-123", email: "test@example.com" },
      error: null,
    });

    // Mock Supabase client
    const mockSupabase =
      require("@/lib/supabase/universal-client").createClient();
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockFacadeData,
        error: null,
      }),
    });

    // Mock facade analysis service
    const mockFacadeService = require("@/lib/services/facade-analysis-service");
    mockFacadeService.FacadeAnalysisService.mockImplementation(() => ({
      analyzeFacadeImages: jest.fn().mockResolvedValue({
        windowCount: 15,
        materials: mockFacadeData.aiAnalysis?.materials,
        measurements: mockFacadeData.aiAnalysis?.measurements,
        recommendations: mockFacadeData.aiAnalysis?.recommendations,
        confidence: 0.88,
      }),
      saveFacadeAnalysis: jest.fn().mockResolvedValue("facade-test-1"),
      validateImages: jest.fn().mockReturnValue(true),
    }));

    jest.clearAllMocks();
  });

  describe("GET /api/facade-analysis", () => {
    test("should return facade analyses for authenticated user", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("analyses");
      expect(Array.isArray(data.analyses)).toBe(true);
    });

    test("should handle pagination parameters", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis?page=2&limit=5",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("analyses");
      expect(data).toHaveProperty("pagination");
    });

    test("should return 401 for unauthenticated requests", async () => {
      const mockAuth = require("@/lib/auth/auth-middleware");
      mockAuth.validateAuth.mockResolvedValueOnce({
        user: null,
        error: new Error("Unauthorized"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    test("should handle database errors gracefully", async () => {
      const mockSupabase =
        require("@/lib/supabase/universal-client").createClient();
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: new Error("Database connection failed"),
        }),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
      );
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/facade-analysis", () => {
    const validCreateRequest = {
      buildingName: "New Test Building",
      buildingAddress: "456 New St",
      buildingType: "residential",
      buildingHeight: 25,
      stories: 2,
      images: [
        {
          id: "new-1",
          name: "new-front.jpg",
          size: 900000,
          type: "image/jpeg",
          url: "https://example.com/new-front.jpg",
          data: "mock-base64-data",
        },
      ],
    };

    test("should create new facade analysis", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
        {
          method: "POST",
          body: JSON.stringify(validCreateRequest),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("buildingName");
      expect(data.buildingName).toBe(validCreateRequest.buildingName);
    });

    test("should validate required fields", async () => {
      const invalidRequest = {
        buildingName: "", // Missing required field
        buildingAddress: "456 New St",
        buildingType: "residential",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
        {
          method: "POST",
          body: JSON.stringify(invalidRequest),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error");
      expect(data.error).toContain("buildingName");
    });

    test("should validate image format and size", async () => {
      const invalidImageRequest = {
        ...validCreateRequest,
        images: [
          {
            id: "invalid-1",
            name: "document.pdf",
            size: 15 * 1024 * 1024, // 15MB - too large
            type: "application/pdf", // Invalid type
            url: "https://example.com/document.pdf",
          },
        ],
      };

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
        {
          method: "POST",
          body: JSON.stringify(invalidImageRequest),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("image");
    });

    test("should handle malformed JSON", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
        {
          method: "POST",
          body: "invalid-json",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    test("should return 401 for unauthenticated requests", async () => {
      const mockAuth = require("@/lib/auth/auth-middleware");
      mockAuth.validateAuth.mockResolvedValueOnce({
        user: null,
        error: new Error("Unauthorized"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
        {
          method: "POST",
          body: JSON.stringify(validCreateRequest),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/facade-analysis/[id]/analyze", () => {
    test("should trigger AI analysis for existing facade", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis/facade-test-1/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await AnalyzePost(request, {
        params: Promise.resolve({ id: "facade-test-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("analysis");
      expect(data.analysis).toHaveProperty("windowCount");
      expect(data.analysis).toHaveProperty("confidence");
      expect(data.analysis.confidence).toBeGreaterThan(0.8);
    });

    test("should return 404 for non-existent facade", async () => {
      const mockSupabase =
        require("@/lib/supabase/universal-client").createClient();
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error("No rows returned"),
        }),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis/non-existent/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await AnalyzePost(request, {
        params: Promise.resolve({ id: "non-existent" }),
      });

      expect(response.status).toBe(404);
    });

    test("should handle AI analysis failures gracefully", async () => {
      const mockFacadeService = require("@/lib/services/facade-analysis-service");
      mockFacadeService.FacadeAnalysisService.mockImplementationOnce(() => ({
        analyzeFacadeImages: jest
          .fn()
          .mockRejectedValue(new Error("AI analysis failed")),
      }));

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis/facade-test-1/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await AnalyzePost(request, {
        params: Promise.resolve({ id: "facade-test-1" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty("error");
    });

    test("should return 401 for unauthenticated requests", async () => {
      const mockAuth = require("@/lib/auth/auth-middleware");
      mockAuth.validateAuth.mockResolvedValueOnce({
        user: null,
        error: new Error("Unauthorized"),
      });

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis/facade-test-1/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await AnalyzePost(request, {
        params: Promise.resolve({ id: "facade-test-1" }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Rate Limiting", () => {
    test("should enforce rate limits for analysis requests", async () => {
      // Mock rate limiter to return too many requests
      const mockRateLimit = jest.fn().mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 60000,
      });

      jest.doMock("@/lib/utils/rate-limiter", () => ({
        rateLimitCheck: mockRateLimit,
      }));

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis/facade-test-1/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await AnalyzePost(request, {
        params: Promise.resolve({ id: "facade-test-1" }),
      });

      expect(response.status).toBe(429);
    });
  });

  describe("Input Sanitization", () => {
    test("should sanitize building name input", async () => {
      const maliciousRequest = {
        buildingName: "<script>alert('xss')</script>Malicious Building",
        buildingAddress: "456 Safe St",
        buildingType: "commercial",
        buildingHeight: 30,
        stories: 2,
        images: [
          {
            id: "safe-1",
            name: "safe.jpg",
            size: 900000,
            type: "image/jpeg",
            url: "https://example.com/safe.jpg",
            data: "safe-base64-data",
          },
        ],
      };

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
        {
          method: "POST",
          body: JSON.stringify(maliciousRequest),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.buildingName).not.toContain("<script>");
      expect(data.buildingName).toContain("Malicious Building");
    });

    test("should validate SQL injection attempts", async () => {
      const sqlInjectionRequest = {
        buildingName: "Building'; DROP TABLE facade_analyses;--",
        buildingAddress: "456 Attack St",
        buildingType: "commercial",
        buildingHeight: 30,
        stories: 2,
        images: [],
      };

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
        {
          method: "POST",
          body: JSON.stringify(sqlInjectionRequest),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await POST(request);

      // Should either sanitize or reject the request
      expect(response.status).toBeOneOf([201, 400]);
    });
  });

  describe("Performance", () => {
    test("should complete analysis within reasonable time", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis/facade-test-1/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const startTime = Date.now();
      const response = await AnalyzePost(request, {
        params: Promise.resolve({ id: "facade-test-1" }),
      });
      const duration = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    test("should handle concurrent requests efficiently", async () => {
      const requests = Array(5)
        .fill(null)
        .map((_, index) =>
          AnalyzePost(
            new NextRequest(
              `http://localhost:3000/api/facade-analysis/facade-test-${index}/analyze`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              },
            ),
            { params: Promise.resolve({ id: `facade-test-${index}` }) },
          ),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle unexpected server errors", async () => {
      // Mock unexpected error in service
      const mockFacadeService = require("@/lib/services/facade-analysis-service");
      mockFacadeService.FacadeAnalysisService.mockImplementationOnce(() => {
        throw new Error("Unexpected server error");
      });

      const request = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
        {
          method: "POST",
          body: JSON.stringify({
            buildingName: "Test Building",
            buildingAddress: "123 Test St",
            buildingType: "commercial",
            images: [],
          }),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
    });

    test("should provide helpful error messages", async () => {
      const invalidRequest = new NextRequest(
        "http://localhost:3000/api/facade-analysis",
        {
          method: "POST",
          body: JSON.stringify({
            buildingName: "",
            buildingAddress: "",
          }),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const response = await POST(invalidRequest);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("error");
      expect(data).toHaveProperty("details");
      expect(Array.isArray(data.details)).toBe(true);
    });
  });
});

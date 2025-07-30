import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { ToolExecutor } from "@/lib/ai/tools/tool-executor";
import { toolDefinitions, toolSchemas } from "@/lib/ai/tools/tool-definitions";
import { ToolHandler } from "@/lib/ai/tools/tool-handler";

// Mock services
jest.mock("@/lib/services/facade-analysis-service");
jest.mock("@/lib/services/calculator-service");
jest.mock("@/lib/services/estimate-service");
jest.mock("@/lib/services/weather-service");
jest.mock("@/lib/services/risk-assessment-service");
jest.mock("@/lib/services/ai-service");

describe("AI Assistant Integration Tests", () => {
  let toolExecutor: ToolExecutor;
  let toolHandler: ToolHandler;

  beforeEach(() => {
    toolExecutor = new ToolExecutor();
    toolHandler = new ToolHandler();
    jest.clearAllMocks();
  });

  describe("Tool Definitions", () => {
    it("should have all required tools defined", () => {
      const expectedTools = [
        "analyzePhoto",
        "calculateService",
        "searchEstimates",
        "getWeather",
        "createQuote",
        "analyzeRisk",
        "findSimilarProjects",
      ];

      expectedTools.forEach((tool) => {
        expect(toolSchemas).toHaveProperty(tool);
        expect(
          toolDefinitions.find((def) => def.function.name === tool),
        ).toBeTruthy();
      });
    });

    it("should have valid OpenAI function definitions", () => {
      toolDefinitions.forEach((def) => {
        expect(def).toHaveProperty("type", "function");
        expect(def.function).toHaveProperty("name");
        expect(def.function).toHaveProperty("description");
        expect(def.function).toHaveProperty("parameters");
      });
    });
  });

  describe("Photo Analysis Tool", () => {
    it("should analyze facade photos", async () => {
      const params = {
        imageUrl: "https://example.com/building.jpg",
        analysisType: "facade" as const,
      };

      const result = await toolExecutor.execute("analyzePhoto", params);

      expect(result.success).toBe(true);
      expect(result.metadata?.toolName).toBe("analyzePhoto");
      expect(result.metadata?.analysisType).toBe("facade");
    });

    it("should validate image URL format", async () => {
      const params = {
        imageUrl: "not-a-url",
        analysisType: "facade" as const,
      };

      const result = await toolExecutor.execute("analyzePhoto", params);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid parameters");
    });
  });

  describe("Service Calculator Tool", () => {
    it("should calculate window cleaning service", async () => {
      const params = {
        serviceType: "window-cleaning",
        parameters: {
          glassArea: 5000,
          stories: 10,
          location: "CA-Los Angeles",
        },
      };

      const result = await toolExecutor.execute("calculateService", params);

      expect(result.success).toBe(true);
      expect(result.metadata?.toolName).toBe("calculateService");
      expect(result.metadata?.serviceType).toBe("window-cleaning");
    });

    it("should handle service type aliases", async () => {
      const params = {
        serviceType: "windows",
        parameters: {
          squareFootage: 5000,
          floors: 10,
        },
      };

      const result = await toolExecutor.execute("calculateService", params);

      expect(result.success).toBe(true);
    });
  });

  describe("Estimate Search Tool", () => {
    it("should search estimates by query", async () => {
      const params = {
        query: "ABC Company",
        limit: 10,
      };

      const result = await toolExecutor.execute("searchEstimates", params);

      expect(result.success).toBe(true);
      expect(result.metadata?.toolName).toBe("searchEstimates");
      expect(result.data).toBeInstanceOf(Array);
    });

    it("should filter by status", async () => {
      const params = {
        status: "pending" as const,
        limit: 5,
      };

      const result = await toolExecutor.execute("searchEstimates", params);

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
    });
  });

  describe("Weather Tool", () => {
    it("should fetch weather forecast", async () => {
      const params = {
        location: "Seattle, WA",
        days: 3,
      };

      const result = await toolExecutor.execute("getWeather", params);

      expect(result.success).toBe(true);
      expect(result.metadata?.toolName).toBe("getWeather");
      expect(result.metadata?.location).toBe("Seattle, WA");
    });
  });

  describe("Quote Creation Tool", () => {
    it("should create a quote with services", async () => {
      const params = {
        services: [
          {
            type: "window-cleaning",
            price: 5000,
            description: "Window cleaning for 10-story building",
          },
        ],
        customerInfo: {
          name: "ABC Company",
          email: "contact@abc.com",
          phone: "555-1234",
        },
      };

      const result = await toolExecutor.execute("createQuote", params);

      expect(result.success).toBe(true);
      expect(result.metadata?.toolName).toBe("createQuote");
      expect(result.data).toHaveProperty("id");
      expect(result.data).toHaveProperty("totalAmount");
    });
  });

  describe("Risk Analysis Tool", () => {
    it("should analyze project risks", async () => {
      const params = {
        projectDescription: "High-rise window cleaning in windy area",
        factors: ["weather", "height", "access"],
      };

      const result = await toolExecutor.execute("analyzeRisk", params);

      expect(result.success).toBe(true);
      expect(result.metadata?.toolName).toBe("analyzeRisk");
      expect(result.data).toHaveProperty("overallRisk");
      expect(result.data).toHaveProperty("factors");
      expect(result.data).toHaveProperty("recommendations");
    });
  });

  describe("Similar Projects Tool", () => {
    it("should find similar projects", async () => {
      const params = {
        projectType: "window-cleaning",
        budget: {
          min: 10000,
          max: 50000,
        },
        features: ["high-rise", "monthly-service"],
      };

      const result = await toolExecutor.execute("findSimilarProjects", params);

      expect(result.success).toBe(true);
      expect(result.metadata?.toolName).toBe("findSimilarProjects");
      expect(result.data).toHaveProperty("projects");
      expect(result.data.projects).toBeInstanceOf(Array);
    });
  });

  describe("Tool Handler", () => {
    it("should handle multiple tool calls", async () => {
      const toolCalls = [
        {
          id: "1",
          type: "function" as const,
          function: {
            name: "getWeather",
            arguments: JSON.stringify({
              location: "Seattle",
              days: 1,
            }),
          },
        },
        {
          id: "2",
          type: "function" as const,
          function: {
            name: "calculateService",
            arguments: JSON.stringify({
              serviceType: "window-cleaning",
              parameters: { glassArea: 5000, stories: 10 },
            }),
          },
        },
      ];

      const results = await toolHandler.handleToolCalls(toolCalls);

      expect(results).toHaveLength(2);
      expect(results[0].toolCallId).toBe("1");
      expect(results[1].toolCallId).toBe("2");
    });

    it("should use cache for repeated tool calls", async () => {
      const toolCall = {
        id: "1",
        type: "function" as const,
        function: {
          name: "getWeather",
          arguments: JSON.stringify({
            location: "Seattle",
            days: 1,
          }),
        },
      };

      // First call
      const result1 = await toolHandler.handleToolCalls([toolCall]);

      // Second call (should use cache)
      const result2 = await toolHandler.handleToolCalls([toolCall]);

      expect(result1[0].result).toEqual(result2[0].result);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complex calculation request", async () => {
      // Simulate AI processing a natural language request
      const userRequest =
        "Calculate window cleaning for a 20-story office building with 10,000 sq ft of glass in Los Angeles";

      // AI would extract these parameters
      const params = {
        serviceType: "window-cleaning",
        parameters: {
          glassArea: 10000,
          stories: 20,
          location: "CA-Los Angeles",
        },
      };

      const result = await toolExecutor.execute("calculateService", params);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("totalPrice");
      expect(result.data).toHaveProperty("laborHours");
      expect(result.data).toHaveProperty("breakdown");
    });

    it("should handle photo analysis with follow-up calculation", async () => {
      // Step 1: Analyze photo
      const analysisResult = await toolExecutor.execute("analyzePhoto", {
        imageUrl: "https://example.com/building.jpg",
        analysisType: "facade",
      });

      expect(analysisResult.success).toBe(true);

      // Step 2: Use analysis results for calculation
      const calcResult = await toolExecutor.execute("calculateService", {
        serviceType: "window-cleaning",
        parameters: {
          glassArea: 5000, // From analysis
          stories: 15, // From analysis
          location: "CA-Los Angeles",
        },
      });

      expect(calcResult.success).toBe(true);
    });
  });
});

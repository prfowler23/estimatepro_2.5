import { z } from "zod";
import { toolSchemas, ToolName, ToolParameters } from "./tool-definitions";
import { FacadeAnalysisService } from "@/lib/services/facade-analysis-service";
import { CalculatorService } from "@/lib/services/calculator-service";
import { EstimateService } from "@/lib/services/estimate-service";
import { WeatherService } from "@/lib/services/weather-service";
import { RiskAssessmentService } from "@/lib/services/risk-assessment-service";
import { AIService } from "@/lib/services/ai-service";
import { securityScanner } from "@/lib/ai/ai-security";
import { SafetyLevel } from "@/lib/ai/ai-security";

export interface ToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export class ToolExecutor {
  private facadeService: FacadeAnalysisService;
  private calculatorService: CalculatorService;
  private estimateService: EstimateService;
  private weatherService: WeatherService;
  private riskService: RiskAssessmentService;
  private aiService: AIService;

  constructor() {
    this.facadeService = new FacadeAnalysisService();
    this.calculatorService = new CalculatorService();
    this.estimateService = new EstimateService();
    this.weatherService = new WeatherService();
    this.riskService = new RiskAssessmentService();
    this.aiService = new AIService();
  }

  async execute<T extends ToolName>(
    toolName: T,
    parameters: unknown,
    userId?: string,
  ): Promise<ToolExecutionResult> {
    try {
      // Validate parameters
      const schema = toolSchemas[toolName];
      const validatedParams = schema.parse(parameters) as ToolParameters<T>;

      // Security check on parameters
      const paramString = JSON.stringify(validatedParams);
      const scanResult = securityScanner.scanContent(
        paramString,
        SafetyLevel.STRICT,
      );
      if (!scanResult.isSafe) {
        return {
          success: false,
          error: "Security check failed on tool parameters",
        };
      }

      // Execute tool
      switch (toolName) {
        case "analyzePhoto":
          return await this.executeAnalyzePhoto(
            validatedParams as ToolParameters<"analyzePhoto">,
            userId,
          );

        case "calculateService":
          return await this.executeCalculateService(
            validatedParams as ToolParameters<"calculateService">,
            userId,
          );

        case "searchEstimates":
          return await this.executeSearchEstimates(
            validatedParams as ToolParameters<"searchEstimates">,
            userId,
          );

        case "getWeather":
          return await this.executeGetWeather(
            validatedParams as ToolParameters<"getWeather">,
          );

        case "createQuote":
          return await this.executeCreateQuote(
            validatedParams as ToolParameters<"createQuote">,
            userId,
          );

        case "analyzeRisk":
          return await this.executeAnalyzeRisk(
            validatedParams as ToolParameters<"analyzeRisk">,
          );

        case "findSimilarProjects":
          return await this.executeFindSimilarProjects(
            validatedParams as ToolParameters<"findSimilarProjects">,
            userId,
          );

        default:
          return {
            success: false,
            error: `Unknown tool: ${toolName}`,
          };
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Invalid parameters: ${error.errors.map((e) => e.message).join(", ")}`,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Tool execution failed",
      };
    }
  }

  private async executeAnalyzePhoto(
    params: ToolParameters<"analyzePhoto">,
    userId?: string,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.facadeService.analyzeImageSimple(
        params.imageUrl,
        params.analysisType,
        userId,
      );
      return {
        success: true,
        data: result,
        metadata: {
          toolName: "analyzePhoto",
          analysisType: params.analysisType,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Photo analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async executeCalculateService(
    params: ToolParameters<"calculateService">,
    userId?: string,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.calculatorService.calculate(
        params.serviceType,
        params.parameters,
        userId,
      );
      return {
        success: true,
        data: result,
        metadata: {
          toolName: "calculateService",
          serviceType: params.serviceType,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Service calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async executeSearchEstimates(
    params: ToolParameters<"searchEstimates">,
    userId?: string,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.estimateService.search({
        query: params.query,
        status: params.status,
        dateRange: params.dateRange,
        limit: params.limit,
        userId,
      });
      return {
        success: true,
        data: result,
        metadata: { toolName: "searchEstimates", resultCount: result.length },
      };
    } catch (error) {
      return {
        success: false,
        error: `Estimate search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async executeGetWeather(
    params: ToolParameters<"getWeather">,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.weatherService.getForecast(
        params.location,
        params.days,
      );
      return {
        success: true,
        data: result,
        metadata: { toolName: "getWeather", location: params.location },
      };
    } catch (error) {
      return {
        success: false,
        error: `Weather fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async executeCreateQuote(
    params: ToolParameters<"createQuote">,
    userId?: string,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.estimateService.createQuote({
        services: params.services,
        customerInfo: params.customerInfo,
        userId,
      });
      return {
        success: true,
        data: result,
        metadata: {
          toolName: "createQuote",
          quoteId: result.id,
          totalAmount: result.totalAmount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Quote creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async executeAnalyzeRisk(
    params: ToolParameters<"analyzeRisk">,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.riskService.analyze({
        description: params.projectDescription,
        factors: params.factors,
      });
      return {
        success: true,
        data: result,
        metadata: {
          toolName: "analyzeRisk",
          riskLevel: result.overallRisk,
          factorCount: result.factors.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Risk analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async executeFindSimilarProjects(
    params: ToolParameters<"findSimilarProjects">,
    userId?: string,
  ): Promise<ToolExecutionResult> {
    try {
      const result = await this.aiService.findSimilarProjects({
        projectType: params.projectType,
        budget: params.budget,
        features: params.features,
        userId,
      });
      return {
        success: true,
        data: result,
        metadata: {
          toolName: "findSimilarProjects",
          resultCount: result.projects.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Similar project search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
}

// Singleton instance
export const toolExecutor = new ToolExecutor();

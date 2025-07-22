// Client-side utilities for AI functionality
// These functions handle AI operations in browser environments safely

export interface AIClientResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Check if AI features are available in the current environment
export function isAIAvailable(): boolean {
  // In browser, check if AI is enabled via feature flag
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_ENABLE_AI === "true";
  }

  // On server, check if we have proper configuration
  try {
    // Dynamic import to avoid initialization issues
    const { getAIConfig } = require("./ai-config");
    return getAIConfig().isAIAvailable();
  } catch (error) {
    console.warn("AI configuration not available:", error);
    return false;
  }
}

// Safe AI operation wrapper for client-side
export async function safeClientAIOperation<T>(
  operation: () => Promise<T>,
  fallback?: T,
): Promise<AIClientResponse<T>> {
  try {
    if (!isAIAvailable()) {
      return {
        success: false,
        error: "AI features are not available",
        message: "AI functionality is currently disabled or not configured",
      };
    }

    const result = await operation();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("AI operation failed:", error);

    if (fallback !== undefined) {
      return {
        success: true,
        data: fallback,
        message: "Using fallback data due to AI service unavailability",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown AI error",
      message: "AI operation failed, please try again or contact support",
    };
  }
}

// Client-side API call helpers for AI operations
export async function callAIEndpoint<T>(
  endpoint: string,
  data: any,
  options: RequestInit = {},
): Promise<AIClientResponse<T>> {
  try {
    const response = await fetch(`/api/ai/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `API call failed: ${response.statusText}`,
      );
    }

    const result = await response.json();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`AI API call to ${endpoint} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown API error",
      message: "Failed to communicate with AI service",
    };
  }
}

// Specific helper functions for common AI operations
export async function extractContactInfo(content: string, type: string) {
  return callAIEndpoint("extract-contact-info", { content, type });
}

export async function analyzePhotosClient(
  photos: File[],
  options: {
    estimateId?: string;
    analysisTypes?: string[];
    compress?: boolean;
  } = {},
) {
  try {
    // Step 1: Upload photos first
    const formData = new FormData();
    photos.forEach((photo, index) => {
      formData.append(`photo_${index}`, photo);
    });

    if (options.estimateId) {
      formData.append("estimate_id", options.estimateId);
    }

    formData.append("compress", String(options.compress ?? true));

    const uploadResponse = await fetch("/api/photos/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Photo upload failed: ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json();
    const photoIds = uploadResult.photos.map((photo: any) => photo.id);

    // Step 2: Analyze uploaded photos
    const analysisResponse = await fetch("/api/photos/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "analyze",
        photo_ids: photoIds,
        analysis_types: options.analysisTypes || ["comprehensive"],
        stream_progress: false,
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`Photo analysis failed: ${analysisResponse.statusText}`);
    }

    const analysisResult = await analysisResponse.json();

    return {
      success: true,
      data: {
        uploadedPhotos: uploadResult.photos,
        analysisResults: analysisResult.result,
        photoIds,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Photo upload and analysis failed",
    };
  }
}

export async function generateAutoQuote(extractedData: any) {
  return callAIEndpoint("auto-estimate", { extractedData });
}

export async function performRiskAssessment(
  extractedData: any,
  context?: string,
) {
  return callAIEndpoint("risk-assessment", {
    extractedData,
    projectContext: context,
  });
}

// Fallback data for when AI is not available
export const AI_FALLBACKS = {
  extractedData: {
    customer: {
      name: "",
      company: "",
      email: "",
      phone: "",
      role: "",
    },
    requirements: {
      services: [],
      buildingType: "office",
      location: "",
      specialRequirements: [],
    },
    timeline: {
      requestedDate: "",
      deadline: "",
      urgency: "normal" as const,
      flexibility: "some" as const,
    },
    budget: {
      range: "",
      statedAmount: "",
      constraints: [],
      approved: false,
      flexibility: "normal" as const,
    },
    decisionMakers: {
      primaryContact: "",
      approvers: [],
      influencers: [],
      roles: {},
    },
    redFlags: [],
    urgencyScore: 5,
    confidence: 0,
  },
  photoAnalysis: {
    totalPhotos: 0,
    analyzedPhotos: 0,
    totalWindows: 0,
    totalArea: 0,
    findings: {},
  },
};

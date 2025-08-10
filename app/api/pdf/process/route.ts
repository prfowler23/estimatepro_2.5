// PDF Processing API Endpoint
// Handles PDF upload, text extraction, OCR, and measurement detection

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PDFProcessor } from "@/lib/pdf/pdf-processor";
import {
  PDFProcessingOptions,
  PDFProcessingResult,
  PDFSearchResult,
  PDFErrorCode,
  PDFProcessingError,
} from "@/lib/pdf/types";

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["application/pdf"];
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

// Request tracking for rate limiting
const requestTracker = new Map<string, { count: number; resetTime: number }>();

// Validation schemas
const ProcessingOptionsSchema = z.object({
  extractImages: z.boolean().optional().default(true),
  performOCR: z.boolean().optional().default(true),
  detectMeasurements: z.boolean().optional().default(true),
  ocrLanguage: z.enum(["eng", "spa", "fra", "deu"]).optional().default("eng"),
  convertToImages: z.boolean().optional().default(false),
  imageFormat: z.enum(["png", "jpeg"]).optional().default("png"),
  imageDensity: z.number().min(72).max(300).optional().default(150),
});

const SearchOptionsSchema = z.object({
  searchTerm: z.string().min(1).max(100),
  useRegex: z.boolean().optional().default(false),
  caseSensitive: z.boolean().optional().default(false),
});

// Rate limiting helper
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const tracker = requestTracker.get(clientId);

  if (!tracker || now > tracker.resetTime) {
    requestTracker.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (tracker.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  tracker.count++;
  return true;
}

// Sanitize text to prevent XSS
function sanitizeText(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Process PDF endpoint
export async function POST(request: NextRequest) {
  let processor: PDFProcessor | null = null;

  try {
    // Get client IP for rate limiting
    const clientId =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check rate limit
    if (!checkRateLimit(clientId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const optionsStr = formData.get("options") as string | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF files are allowed." },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          code: PDFErrorCode.FILE_TOO_LARGE,
        },
        { status: 400 },
      );
    }

    // Parse and validate options
    let options: PDFProcessingOptions = {};
    if (optionsStr) {
      try {
        const parsed = JSON.parse(optionsStr);
        options = ProcessingOptionsSchema.parse(parsed);
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid processing options" },
          { status: 400 },
        );
      }
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Initialize PDF processor
    processor = new PDFProcessor({ useWorkerPool: true });

    // Process PDF with progress tracking
    const result = await processor.processPDF(arrayBuffer, {
      extractImages: options.extractImages,
      performOCR: options.performOCR,
      detectMeasurements: options.detectMeasurements,
      ocrConfig: {
        language: options.ocrLanguage || "eng",
        engineMode: 1, // LSTM only
        pageSegMode: 6, // Uniform block of text
      },
      useCache: true,
    });

    // Sanitize extracted text to prevent XSS
    if (result.text) {
      result.text = sanitizeText(result.text);
    }

    // Sanitize measurement raw text
    if (result.measurements) {
      result.measurements = result.measurements.map((m) => ({
        ...m,
        rawText: sanitizeText(m.rawText),
      }));
    }

    // Convert image data to base64 for response
    const responseResult: PDFProcessingResult = {
      ...result,
      images: result.images.map((img) => ({
        ...img,
        data: new Uint8Array(), // Don't send raw data to client
        extractedText: img.extractedText
          ? sanitizeText(img.extractedText)
          : undefined,
      })),
    };

    // Add file metadata to result
    responseResult.metadata = {
      ...responseResult.metadata,
      fileSize: file.size,
    };

    // Clean up processor
    await processor.cleanup();

    return NextResponse.json({
      success: true,
      filename: file.name,
      fileSize: file.size,
      metadata: responseResult.metadata,
      extractedText: responseResult.text,
      textLength: responseResult.text.length,
      imagesFound: responseResult.images.length,
      imageDetails: responseResult.images.map((img) => ({
        pageNumber: img.pageNumber,
        imageIndex: img.imageIndex,
        width: img.width,
        height: img.height,
        format: img.format,
        hasOCRText: !!img.extractedText,
        ocrConfidence: img.confidence,
        textPreview: img.extractedText
          ? img.extractedText.substring(0, 100)
          : undefined,
      })),
      pageImages: [], // Would need to implement conversion if needed
      measurementsFound: responseResult.measurements.length,
      measurements: responseResult.measurements,
      buildingAnalysis: {
        hasReliableData: responseResult.measurements.length > 0,
        confidence: responseResult.measurements.length > 0 ? 0.8 : 0,
        suggestedDimensions: {},
      },
      processingStats: {
        pagesProcessed: responseResult.metadata.pageCount,
        totalImages: responseResult.images.length,
        totalMeasurements: responseResult.measurements.length,
        ocrPerformed: options.performOCR || false,
        measurementDetectionEnabled: options.detectMeasurements || false,
      },
    });
  } catch (error) {
    // Clean up processor on error
    if (processor) {
      await processor.cleanup();
    }

    console.error("PDF processing error:", error);

    // Handle specific PDF processing errors
    if (error instanceof PDFProcessingError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 400 },
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "PDF processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Search in PDF endpoint
export async function PUT(request: NextRequest) {
  let processor: PDFProcessor | null = null;

  try {
    // Get operation from query params
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get("operation");

    if (operation !== "search") {
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const searchTerm = formData.get("searchTerm") as string | null;
    const useRegex = formData.get("useRegex") === "true";

    // Validate inputs
    if (!file || !searchTerm) {
      return NextResponse.json(
        { error: "File and search term are required" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF files are allowed." },
        { status: 400 },
      );
    }

    // Validate search options
    const searchOptions = SearchOptionsSchema.parse({
      searchTerm,
      useRegex,
    });

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Initialize PDF processor
    processor = new PDFProcessor();

    // Perform search
    const searchPattern = searchOptions.useRegex
      ? new RegExp(searchOptions.searchTerm, "gi")
      : searchOptions.searchTerm;

    const result = await processor.searchInPDF(arrayBuffer, searchPattern);

    // Sanitize search results
    const sanitizedMatches = result.matches.map((match) => ({
      ...match,
      text: sanitizeText(match.text),
      context: sanitizeText(match.context),
    }));

    // Clean up processor
    await processor.cleanup();

    return NextResponse.json({
      success: result.success,
      totalMatches: sanitizedMatches.length,
      matches: sanitizedMatches,
    });
  } catch (error) {
    // Clean up processor on error
    if (processor) {
      await processor.cleanup();
    }

    console.error("PDF search error:", error);

    return NextResponse.json(
      {
        error: "PDF search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "pdf-processor",
    maxFileSize: MAX_FILE_SIZE,
    supportedFormats: ALLOWED_MIME_TYPES,
    features: [
      "text-extraction",
      "ocr",
      "measurement-detection",
      "image-extraction",
      "search",
    ],
  });
}

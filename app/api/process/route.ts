// PDF Processing API endpoint
// Handles PDF upload, text extraction, image extraction, and measurement detection

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pdfProcessor, MeasurementProcessor } from "@/lib/pdf/pdf-processor";
import {
  withAutoRateLimit,
  withWriteRateLimit,
} from "@/lib/middleware/rate-limit-middleware";
import { z } from "zod";

// Request validation schema
const PDFProcessRequestSchema = z.object({
  extractImages: z.boolean().default(true),
  performOCR: z.boolean().default(true),
  detectMeasurements: z.boolean().default(true),
  ocrLanguage: z.string().default("eng"),
  convertToImages: z.boolean().default(false),
  imageFormat: z.enum(["png", "jpeg"]).default("png"),
  imageDensity: z.number().min(72).max(300).default(150),
});

async function processPDFHandler(
  request: NextRequest,
  context: {
    params?: Promise<Record<string, string>>;
  },
) {
  try {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user.user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const optionsJson = formData.get("options") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 },
      );
    }

    // File size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "PDF file too large (max 10MB)" },
        { status: 400 },
      );
    }

    // Parse options
    let options = {};
    if (optionsJson) {
      try {
        options = JSON.parse(optionsJson);
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid options JSON" },
          { status: 400 },
        );
      }
    }

    // Validate options
    const validatedOptions = PDFProcessRequestSchema.parse(options);

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Process PDF
    const processingResult = await pdfProcessor.processPDF(arrayBuffer, {
      extractImages: validatedOptions.extractImages,
      performOCR: validatedOptions.performOCR,
      detectMeasurements: validatedOptions.detectMeasurements,
      ocrConfig: {
        language: validatedOptions.ocrLanguage,
        engineMode: 1,
        pageSegMode: 6,
      },
    });

    if (!processingResult.success) {
      return NextResponse.json(
        { error: processingResult.error },
        { status: 500 },
      );
    }

    // Convert to images if requested
    let imageUrls: string[] = [];
    if (validatedOptions.convertToImages) {
      const imageResult = await pdfProcessor.convertPDFToImages(arrayBuffer, {
        format: validatedOptions.imageFormat,
        density: validatedOptions.imageDensity,
      });

      if (imageResult.success) {
        imageUrls = imageResult.images;
      }
    }

    // Extract building dimensions from measurements
    const buildingDimensions = MeasurementProcessor.extractBuildingDimensions(
      processingResult.measurements,
    );

    // Prepare response data
    const responseData = {
      success: true,
      filename: file.name,
      fileSize: file.size,
      metadata: processingResult.metadata,
      extractedText: processingResult.text,
      textLength: processingResult.text.length,

      // Images
      imagesFound: processingResult.images.length,
      imageDetails: processingResult.images.map((img) => ({
        pageNumber: img.pageNumber,
        imageIndex: img.imageIndex,
        width: img.width,
        height: img.height,
        format: img.format,
        hasOCRText: !!img.extractedText,
        ocrConfidence: img.confidence,
        textPreview: img.extractedText?.slice(0, 200),
      })),

      // Page images (if requested)
      pageImages: imageUrls,

      // Measurements
      measurementsFound: processingResult.measurements.length,
      measurements: processingResult.measurements.map((m) => ({
        type: m.type,
        value: m.value,
        unit: m.unit,
        confidence: m.confidence,
        pageNumber: m.pageNumber,
        rawText: m.rawText,
      })),

      // Building dimensions analysis
      buildingAnalysis: {
        ...buildingDimensions,
        hasReliableData: buildingDimensions.confidence > 0.6,
        suggestedArea: buildingDimensions.area,
        suggestedDimensions: {
          length: buildingDimensions.length,
          width: buildingDimensions.width,
          height: buildingDimensions.height,
        },
      },

      // Processing stats
      processingStats: {
        pagesProcessed: processingResult.metadata.pageCount,
        totalImages: processingResult.images.length,
        totalMeasurements: processingResult.measurements.length,
        ocrPerformed: validatedOptions.performOCR,
        measurementDetectionEnabled: validatedOptions.detectMeasurements,
      },
    };

    // Save processing result to database for history/caching
    try {
      await supabase.from("pdf_processing_history").insert({
        user_id: user.user.id,
        filename: file.name,
        file_size: file.size,
        pages_processed: processingResult.metadata.pageCount,
        text_extracted: processingResult.text.length > 0,
        images_found: processingResult.images.length,
        measurements_found: processingResult.measurements.length,
        building_analysis: buildingDimensions,
        processing_options: validatedOptions,
      });
    } catch (dbError) {
      // Don't fail the request if logging fails
      console.warn("Failed to save PDF processing history:", dbError);
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("PDF processing error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "PDF processing failed" },
      { status: 500 },
    );
  }
}

// Search in PDF endpoint
async function searchPDFHandler(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user.user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const searchTerm = formData.get("searchTerm") as string;
    const useRegex = formData.get("useRegex") === "true";

    if (!file || !searchTerm) {
      return NextResponse.json(
        { error: "File and search term required" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const searchPattern = useRegex ? new RegExp(searchTerm, "gi") : searchTerm;

    const searchResult = await pdfProcessor.searchInPDF(
      arrayBuffer,
      searchPattern,
    );

    if (!searchResult.success) {
      return NextResponse.json({ error: searchResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      searchTerm,
      useRegex,
      totalMatches: searchResult.matches.length,
      matches: searchResult.matches.map((match) => ({
        pageNumber: match.pageNumber,
        matchText: match.text,
        context: match.context,
      })),
    });
  } catch (error) {
    console.error("PDF search error:", error);
    return NextResponse.json({ error: "PDF search failed" }, { status: 500 });
  }
}

// Extract text from page range endpoint
async function extractTextHandler(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user.user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const startPage = parseInt(formData.get("startPage") as string) || 1;
    const endPage = parseInt(formData.get("endPage") as string) || 1;

    if (!file) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const textResult = await pdfProcessor.extractTextFromPages(
      arrayBuffer,
      startPage,
      endPage,
    );

    if (!textResult.success) {
      return NextResponse.json({ error: textResult.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      startPage,
      endPage,
      extractedText: textResult.text,
      textLength: textResult.text.length,
    });
  } catch (error) {
    console.error("PDF text extraction error:", error);
    return NextResponse.json(
      { error: "Text extraction failed" },
      { status: 500 },
    );
  }
}

// Route handlers with rate limiting
export const POST = withWriteRateLimit(processPDFHandler);

// Named exports for different operations
export async function PUT(
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> },
) {
  const url = new URL(request.url);
  const operation = url.searchParams.get("operation");

  switch (operation) {
    case "search":
      return searchPDFHandler(request);
    case "extract-text":
      return extractTextHandler(request);
    default:
      return NextResponse.json({ error: "Invalid operation" }, { status: 400 });
  }
}

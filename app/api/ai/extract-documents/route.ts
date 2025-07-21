import { NextRequest, NextResponse } from "next/server";
import {
  extractFromDocument,
  extractFromImageOCR,
} from "../../../../lib/ai/extraction";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, type, imageUrl } = body;

    // Validate input
    if (!content && !imageUrl) {
      return NextResponse.json(
        { error: "Either content or imageUrl is required" },
        { status: 400 },
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Document/image type is required" },
        { status: 400 },
      );
    }

    let extractedData;

    if (imageUrl) {
      // Handle image OCR extraction
      const validImageTypes = ["document", "sign", "form", "note"];
      if (!validImageTypes.includes(type)) {
        return NextResponse.json(
          {
            error: `Invalid image type. Must be one of: ${validImageTypes.join(", ")}`,
          },
          { status: 400 },
        );
      }

      extractedData = await extractFromImageOCR(imageUrl, type);
    } else {
      // Handle document text extraction
      const validDocTypes = ["pdf", "rfp", "contract", "plans"];
      if (!validDocTypes.includes(type)) {
        return NextResponse.json(
          {
            error: `Invalid document type. Must be one of: ${validDocTypes.join(", ")}`,
          },
          { status: 400 },
        );
      }

      extractedData = await extractFromDocument(content, type);
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
      extractionType: imageUrl ? "image_ocr" : "document_text",
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Document extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract information from document" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Document/Image extraction endpoint",
    methods: ["POST"],
    document_extraction: {
      required_fields: ["content", "type"],
      supported_types: ["pdf", "rfp", "contract", "plans"],
      description: "Extract structured data from document text content",
    },
    image_ocr_extraction: {
      required_fields: ["imageUrl", "type"],
      supported_types: ["document", "sign", "form", "note"],
      description: "Extract text and structured data from images using OCR",
    },
  });
}

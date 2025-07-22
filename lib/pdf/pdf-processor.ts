// PDF Processing Service with Image Extraction and OCR
// Handles PDF text extraction, image extraction, and measurement detection

import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";
import pdf2pic from "pdf2pic";
import { withRetry } from "@/lib/utils/retry-logic";
import { isNotNull, safeString, safeNumber } from "@/lib/utils/null-safety";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
} else {
  // Node.js environment - use CDN worker for server-side rendering
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

// PDF Processing Types
export interface PDFProcessingResult {
  success: boolean;
  text: string;
  images: PDFImageData[];
  measurements: PDFMeasurement[];
  metadata: PDFMetadata;
  error?: string;
}

export interface PDFImageData {
  pageNumber: number;
  imageIndex: number;
  data: Uint8Array;
  width: number;
  height: number;
  format: string;
  extractedText?: string;
  confidence?: number;
}

export interface PDFMeasurement {
  type: "dimension" | "area" | "scale";
  value: number;
  unit: string;
  confidence: number;
  pageNumber: number;
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rawText: string;
}

export interface PDFMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface PDFToImageOptions {
  density?: number;
  saveFilename?: string;
  savePath?: string;
  format?: "png" | "jpeg";
  width?: number;
  height?: number;
  quality?: number;
}

// OCR Configuration
export interface OCRConfig {
  language: string;
  engineMode: number;
  pageSegMode: number;
  whitelist?: string;
  blacklist?: string;
}

const DEFAULT_OCR_CONFIG: OCRConfig = {
  language: "eng",
  engineMode: 1, // LSTM only
  pageSegMode: 6, // Uniform block of text
  whitelist:
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'\".,:-+()[]{}/* \n\t",
};

// Measurement Detection Patterns
const MEASUREMENT_PATTERNS = [
  // Dimensions: "12 ft", "15'", "20 feet", "10.5 m", "25 cm"
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:ft|feet|'|foot)\b/gi,
    unit: "feet",
    type: "dimension" as const,
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:in|inches|"|inch)\b/gi,
    unit: "inches",
    type: "dimension" as const,
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:m|meters?|metre?s?)\b/gi,
    unit: "meters",
    type: "dimension" as const,
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:cm|centimeters?|centimetre?s?)\b/gi,
    unit: "centimeters",
    type: "dimension" as const,
  },
  // Areas: "1200 sq ft", "500 sqft", "25 m²"
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:sq\s*ft|sqft|square\s*feet)\b/gi,
    unit: "square_feet",
    type: "area" as const,
  },
  {
    regex: /(\d+(?:\.\d+)?)\s*(?:sq\s*m|sqm|square\s*meters?|m²)\b/gi,
    unit: "square_meters",
    type: "area" as const,
  },
  // Scale indicators: "1:100", "1\"=10'", "Scale: 1/4\"=1'"
  {
    regex: /(?:scale[\s:]*)?1["']?\s*[=:]\s*(\d+(?:\.\d+)?)\s*["']?/gi,
    unit: "scale_ratio",
    type: "scale" as const,
  },
  {
    regex: /1\s*:\s*(\d+(?:\.\d+)?)/gi,
    unit: "scale_ratio",
    type: "scale" as const,
  },
];

export class PDFProcessor {
  private ocrWorker: Tesseract.Worker | null = null;
  private pdf2picConverter: any;

  constructor() {
    this.initializeConverter();
  }

  private initializeConverter() {
    this.pdf2picConverter = pdf2pic.fromBase64;
  }

  // Initialize OCR worker
  private async initializeOCR(
    config: OCRConfig = DEFAULT_OCR_CONFIG,
  ): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
    }

    this.ocrWorker = await createWorker(config.language);

    const parameters: Record<string, string> = {
      tessedit_ocr_engine_mode: config.engineMode.toString(),
      tessedit_pageseg_mode: config.pageSegMode.toString(),
    };

    if (config.whitelist) {
      parameters.tessedit_char_whitelist = config.whitelist;
    }

    if (config.blacklist) {
      parameters.tessedit_char_blacklist = config.blacklist;
    }

    await this.ocrWorker.setParameters(parameters);
  }

  // Process PDF from buffer
  public async processPDF(
    pdfBuffer: ArrayBuffer,
    options: {
      extractImages?: boolean;
      performOCR?: boolean;
      detectMeasurements?: boolean;
      ocrConfig?: Partial<OCRConfig>;
    } = {},
  ): Promise<PDFProcessingResult> {
    const {
      extractImages = true,
      performOCR = true,
      detectMeasurements = true,
      ocrConfig = {},
    } = options;

    try {
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
      const metadata = await this.extractMetadata(pdf);

      let allText = "";
      const images: PDFImageData[] = [];
      const measurements: PDFMeasurement[] = [];

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        // Extract text content
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        allText += pageText + "\n";

        // Extract images if requested
        if (extractImages) {
          const pageImages = await this.extractImagesFromPage(page, pageNum);
          images.push(...pageImages);

          // Perform OCR on images if requested
          if (performOCR && pageImages.length > 0) {
            await this.performOCROnImages(pageImages, {
              ...DEFAULT_OCR_CONFIG,
              ...ocrConfig,
            });
          }
        }

        // Detect measurements if requested
        if (detectMeasurements) {
          const pageMeasurements = this.detectMeasurements(pageText, pageNum);
          measurements.push(...pageMeasurements);

          // Also check OCR text from images
          for (const image of images.filter(
            (img) => img.pageNumber === pageNum && img.extractedText,
          )) {
            const imageMeasurements = this.detectMeasurements(
              image.extractedText!,
              pageNum,
            );
            measurements.push(...imageMeasurements);
          }
        }
      }

      return {
        success: true,
        text: allText.trim(),
        images,
        measurements: this.deduplicateMeasurements(measurements),
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        text: "",
        images: [],
        measurements: [],
        metadata: { pageCount: 0 },
        error: error instanceof Error ? error.message : "PDF processing failed",
      };
    }
  }

  // Extract images from a PDF page
  private async extractImagesFromPage(
    page: any,
    pageNumber: number,
  ): Promise<PDFImageData[]> {
    const result = await withRetry(
      async () => {
        const images: PDFImageData[] = [];
        const operatorList = await page.getOperatorList();

        let imageIndex = 0;
        for (let i = 0; i < operatorList.fnArray.length; i++) {
          if (operatorList.fnArray[i] === pdfjsLib.OPS.paintImageXObject) {
            const imgName = operatorList.argsArray[i][0];
            const imgObj = page.objs.get(imgName);

            if (imgObj) {
              const imageData: PDFImageData = {
                pageNumber,
                imageIndex: imageIndex++,
                data: new Uint8Array(imgObj.data),
                width: imgObj.width,
                height: imgObj.height,
                format: this.detectImageFormat(imgObj.data),
              };
              images.push(imageData);
            }
          }
        }

        return images;
      },
      { retries: 3, delay: 1000 },
    );

    return result.success ? result.data : [];
  }

  // Perform OCR on extracted images
  private async performOCROnImages(
    images: PDFImageData[],
    config: OCRConfig,
  ): Promise<void> {
    if (!this.ocrWorker) {
      await this.initializeOCR(config);
    }

    for (const image of images) {
      try {
        // Convert image data to canvas for OCR
        const canvas = await this.imageDataToCanvas(image);

        if (this.ocrWorker) {
          const result = await this.ocrWorker.recognize(canvas);
          image.extractedText = result.data.text;
          image.confidence = result.data.confidence;
        }
      } catch (error) {
        console.warn(`OCR failed for image ${image.imageIndex}:`, error);
        image.extractedText = "";
        image.confidence = 0;
      }
    }
  }

  // Convert image data to canvas
  private async imageDataToCanvas(
    image: PDFImageData,
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    canvas.width = image.width;
    canvas.height = image.height;

    // Create ImageData from raw pixel data
    const imageData = ctx.createImageData(image.width, image.height);

    // Handle different image formats
    if (image.format === "rgb") {
      // RGB format: convert to RGBA
      for (let i = 0, j = 0; i < image.data.length; i += 3, j += 4) {
        imageData.data[j] = image.data[i]; // R
        imageData.data[j + 1] = image.data[i + 1]; // G
        imageData.data[j + 2] = image.data[i + 2]; // B
        imageData.data[j + 3] = 255; // A
      }
    } else {
      // Assume RGBA format
      imageData.data.set(image.data);
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // Detect image format from data
  private detectImageFormat(data: any): string {
    // Check for common image format signatures
    if (data[0] === 0xff && data[1] === 0xd8) return "jpeg";
    if (data[0] === 0x89 && data[1] === 0x50) return "png";
    if (data[0] === 0x47 && data[1] === 0x49) return "gif";
    return "rgb"; // Default to RGB
  }

  // Extract PDF metadata
  private async extractMetadata(pdf: any): Promise<PDFMetadata> {
    try {
      const metadata = await pdf.getMetadata();
      return {
        pageCount: pdf.numPages,
        title: safeString(metadata.info.Title),
        author: safeString(metadata.info.Author),
        subject: safeString(metadata.info.Subject),
        creator: safeString(metadata.info.Creator),
        producer: safeString(metadata.info.Producer),
        creationDate: metadata.info.CreationDate
          ? new Date(metadata.info.CreationDate)
          : undefined,
        modificationDate: metadata.info.ModDate
          ? new Date(metadata.info.ModDate)
          : undefined,
      };
    } catch (error) {
      return { pageCount: pdf.numPages };
    }
  }

  // Detect measurements in text
  private detectMeasurements(
    text: string,
    pageNumber: number,
  ): PDFMeasurement[] {
    const measurements: PDFMeasurement[] = [];

    for (const pattern of MEASUREMENT_PATTERNS) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const value = safeNumber(parseFloat(match[1]));
        if (isNotNull(value) && value > 0) {
          measurements.push({
            type: pattern.type,
            value,
            unit: pattern.unit,
            confidence: this.calculateMeasurementConfidence(
              match[0],
              pattern.type,
            ),
            pageNumber,
            rawText: match[0],
          });
        }
      }
    }

    return measurements;
  }

  // Calculate confidence score for measurements
  private calculateMeasurementConfidence(text: string, type: string): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence for complete units
    if (text.includes("feet") || text.includes("meters")) confidence += 0.1;
    if (text.includes("square")) confidence += 0.1;
    if (text.includes("scale") || text.includes(":")) confidence += 0.2;

    // Lower confidence for ambiguous formats
    if (text.includes("'") || text.includes('"')) confidence -= 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  // Remove duplicate measurements
  private deduplicateMeasurements(
    measurements: PDFMeasurement[],
  ): PDFMeasurement[] {
    const seen = new Set<string>();
    return measurements.filter((measurement) => {
      const key = `${measurement.type}-${measurement.value}-${measurement.unit}-${measurement.pageNumber}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Convert PDF pages to images
  public async convertPDFToImages(
    pdfBuffer: ArrayBuffer,
    options: PDFToImageOptions = {},
  ): Promise<{ success: boolean; images: string[]; error?: string }> {
    try {
      const { density = 150, format = "png", quality = 100 } = options;

      // Convert buffer to base64
      const base64 = Buffer.from(pdfBuffer).toString("base64");

      // Configure conversion options
      const convert = this.pdf2picConverter(base64, {
        density,
        saveFilename: "page",
        savePath: "./temp",
        format,
        width: options.width,
        height: options.height,
        quality,
      });

      // Convert all pages
      const result = await convert.bulk(-1, { responseType: "base64" });

      const images = result.map((page: any) => {
        return `data:image/${format};base64,${page.base64}`;
      });

      return {
        success: true,
        images,
      };
    } catch (error) {
      return {
        success: false,
        images: [],
        error:
          error instanceof Error
            ? error.message
            : "PDF to image conversion failed",
      };
    }
  }

  // Extract text from specific page range
  public async extractTextFromPages(
    pdfBuffer: ArrayBuffer,
    startPage: number,
    endPage: number,
  ): Promise<{ success: boolean; text: string; error?: string }> {
    try {
      const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
      let extractedText = "";

      const actualStartPage = Math.max(1, startPage);
      const actualEndPage = Math.min(pdf.numPages, endPage);

      for (let pageNum = actualStartPage; pageNum <= actualEndPage; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        extractedText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
      }

      return {
        success: true,
        text: extractedText.trim(),
      };
    } catch (error) {
      return {
        success: false,
        text: "",
        error:
          error instanceof Error ? error.message : "Text extraction failed",
      };
    }
  }

  // Search for specific text patterns
  public async searchInPDF(
    pdfBuffer: ArrayBuffer,
    searchPattern: string | RegExp,
  ): Promise<{
    success: boolean;
    matches: Array<{
      pageNumber: number;
      text: string;
      context: string;
    }>;
    error?: string;
  }> {
    try {
      const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
      const matches: Array<{
        pageNumber: number;
        text: string;
        context: string;
      }> = [];

      const regex =
        typeof searchPattern === "string"
          ? new RegExp(searchPattern, "gi")
          : searchPattern;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");

        let match;
        while ((match = regex.exec(pageText)) !== null) {
          const start = Math.max(0, match.index - 50);
          const end = Math.min(
            pageText.length,
            match.index + match[0].length + 50,
          );
          const context = pageText.substring(start, end);

          matches.push({
            pageNumber: pageNum,
            text: match[0],
            context,
          });
        }
      }

      return {
        success: true,
        matches,
      };
    } catch (error) {
      return {
        success: false,
        matches: [],
        error: error instanceof Error ? error.message : "Search failed",
      };
    }
  }

  // Cleanup resources
  public async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }
}

// Utility functions for measurement processing
export class MeasurementProcessor {
  // Convert measurements to standard units
  public static normalizeToSquareFeet(
    measurement: PDFMeasurement,
  ): number | null {
    const { value, unit } = measurement;

    switch (unit) {
      case "square_feet":
        return value;
      case "square_meters":
        return value * 10.764; // 1 m² = 10.764 ft²
      default:
        return null;
    }
  }

  public static normalizeToFeet(measurement: PDFMeasurement): number | null {
    const { value, unit } = measurement;

    switch (unit) {
      case "feet":
        return value;
      case "inches":
        return value / 12;
      case "meters":
        return value * 3.281; // 1 m = 3.281 ft
      case "centimeters":
        return value * 0.0328; // 1 cm = 0.0328 ft
      default:
        return null;
    }
  }

  // Extract building dimensions from measurements
  public static extractBuildingDimensions(measurements: PDFMeasurement[]): {
    length?: number;
    width?: number;
    height?: number;
    area?: number;
    confidence: number;
  } {
    const dimensions = measurements.filter((m) => m.type === "dimension");
    const areas = measurements.filter((m) => m.type === "area");

    let length, width, height, area;
    let totalConfidence = 0;
    let measurementCount = 0;

    // Find area measurements
    if (areas.length > 0) {
      const bestArea = areas.reduce((best, current) =>
        current.confidence > best.confidence ? current : best,
      );
      area = this.normalizeToSquareFeet(bestArea);
      totalConfidence += bestArea.confidence;
      measurementCount++;
    }

    // Find dimensional measurements
    const sortedDimensions = dimensions
      .map((d) => ({ ...d, normalizedValue: this.normalizeToFeet(d) }))
      .filter((d) => d.normalizedValue !== null)
      .sort((a, b) => (b.normalizedValue || 0) - (a.normalizedValue || 0));

    if (sortedDimensions.length >= 2) {
      length = sortedDimensions[0].normalizedValue || undefined;
      width = sortedDimensions[1].normalizedValue || undefined;
      totalConfidence +=
        sortedDimensions[0].confidence + sortedDimensions[1].confidence;
      measurementCount += 2;
    } else if (sortedDimensions.length === 1) {
      length = sortedDimensions[0].normalizedValue || undefined;
      totalConfidence += sortedDimensions[0].confidence;
      measurementCount++;
    }

    // Look for height indicators (typically smaller values or specific mentions)
    const heightCandidates = dimensions.filter((d) => {
      const text = d.rawText.toLowerCase();
      return (
        text.includes("height") ||
        text.includes("story") ||
        text.includes("floor")
      );
    });

    if (heightCandidates.length > 0) {
      const normalizedHeight = this.normalizeToFeet(heightCandidates[0]);
      if (normalizedHeight !== null) {
        height = normalizedHeight;
        totalConfidence += heightCandidates[0].confidence;
        measurementCount++;
      }
    }

    const averageConfidence =
      measurementCount > 0 ? totalConfidence / measurementCount : 0;

    return {
      length,
      width,
      height,
      area,
      confidence: averageConfidence,
    };
  }
}

// Export singleton instance
export const pdfProcessor = new PDFProcessor();

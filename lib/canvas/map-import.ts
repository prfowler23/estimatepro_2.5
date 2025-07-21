export interface ImportedMap {
  imageUrl: string;
  metadata?: {
    scale?: number;
    location?: string;
    date?: string;
    source?: string;
  };
}

export interface ScaleDetectionResult {
  found: boolean;
  pixelsPerFoot?: number;
  confidence?: number;
  method?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PDFImportResult {
  images: string[];
  measurements?: Array<{
    value: number;
    unit: string;
    location?: {
      page: number;
      x: number;
      y: number;
    };
  }>;
}

export class MapImportService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    // Create off-screen canvas for image processing
    this.canvas = document.createElement("canvas");
    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to create canvas context");
    }
    this.ctx = context;
  }

  /**
   * Import from Nearmap export files
   */
  async importFromNearmap(file: File): Promise<ImportedMap> {
    try {
      const imageUrl = await this.fileToDataUrl(file);

      // Nearmap exports often include metadata in filename or EXIF
      const metadata = await this.extractNearmapMetadata(file);

      // Try to detect scale from image
      const scaleResult = await this.detectScaleFromImage(imageUrl);

      return {
        imageUrl,
        metadata: {
          ...metadata,
          scale: scaleResult.pixelsPerFoot,
          source: "Nearmap",
        },
      };
    } catch (error) {
      console.error("Error importing Nearmap file:", error);
      throw new Error("Failed to import Nearmap file");
    }
  }

  /**
   * Import from Google Earth screenshots
   */
  async importFromGoogleEarth(file: File): Promise<ImportedMap> {
    try {
      const imageUrl = await this.fileToDataUrl(file);

      // Google Earth screenshots may have scale info in UI elements
      const scaleResult = await this.detectGoogleEarthScale(imageUrl);

      return {
        imageUrl,
        metadata: {
          scale: scaleResult.pixelsPerFoot,
          source: "Google Earth",
          // confidence: scaleResult.confidence
        } as any,
      };
    } catch (error) {
      console.error("Error importing Google Earth file:", error);
      throw new Error("Failed to import Google Earth screenshot");
    }
  }

  /**
   * Import and process PDF files
   */
  async importFromPDF(file: File): Promise<PDFImportResult> {
    try {
      // Note: This would typically require a PDF.js integration
      // For now, we'll simulate the process
      const images = await this.extractImagesFromPDF(file);
      const measurements = await this.extractMeasurementsFromPDF(file);

      return {
        images,
        measurements,
      };
    } catch (error) {
      console.error("Error importing PDF file:", error);
      throw new Error("Failed to import PDF file");
    }
  }

  /**
   * Detect scale information from images using various methods
   */
  async detectScaleFromImage(imageUrl: string): Promise<ScaleDetectionResult> {
    try {
      // Load image for analysis
      const img = await this.loadImage(imageUrl);
      this.canvas.width = img.width;
      this.canvas.height = img.height;
      this.ctx.drawImage(img, 0, 0);

      // Try multiple detection methods
      const methods = [
        () => this.detectScaleBar(img),
        () => this.detectGridPattern(img),
        () => this.detectRulerElements(img),
        () => this.detectTextualScale(img),
      ];

      for (const method of methods) {
        const result = await method();
        if (result.found && result.confidence && result.confidence > 0.7) {
          return result;
        }
      }

      // Return best attempt if no high-confidence result
      const bestAttempt = await this.detectScaleBar(img);
      return bestAttempt;
    } catch (error) {
      console.error("Error detecting scale:", error);
      return { found: false };
    }
  }

  /**
   * Convert File to data URL
   */
  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Load image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Extract metadata from Nearmap files
   */
  private async extractNearmapMetadata(file: File): Promise<any> {
    // Extract from filename patterns like "nearmap_2024_01_15_scale_1_1000.jpg"
    const filename = file.name.toLowerCase();
    const metadata: any = {};

    // Date pattern
    const dateMatch = filename.match(/(\d{4})[_-](\d{2})[_-](\d{2})/);
    if (dateMatch) {
      metadata.date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    }

    // Scale pattern
    const scaleMatch = filename.match(/scale[_-]?(\d+)[_-]?(\d+)/);
    if (scaleMatch) {
      const ratio = parseInt(scaleMatch[2]) / parseInt(scaleMatch[1]);
      metadata.scale = ratio;
    }

    // Location pattern
    const locationMatch = filename.match(/([a-z]+[_-]?[a-z]*)[_-]nearmap/);
    if (locationMatch) {
      metadata.location = locationMatch[1].replace(/[_-]/g, " ");
    }

    return metadata;
  }

  /**
   * Detect scale from Google Earth interface elements
   */
  private async detectGoogleEarthScale(
    imageUrl: string,
  ): Promise<ScaleDetectionResult> {
    const img = await this.loadImage(imageUrl);
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.drawImage(img, 0, 0);

    // Look for Google Earth scale bar (typically bottom left)
    const scaleBarRegion = this.ctx.getImageData(0, img.height - 100, 300, 100);

    // Analyze for white/dark contrasting elements typical of scale bars
    const result = this.analyzeScaleBarRegion(
      scaleBarRegion,
      img.width,
      img.height,
    );

    return {
      found: result.found,
      pixelsPerFoot: result.pixelsPerFoot,
      confidence: result.confidence,
      method: "Google Earth UI detection",
    };
  }

  /**
   * Detect traditional scale bars in images
   */
  private async detectScaleBar(
    img: HTMLImageElement,
  ): Promise<ScaleDetectionResult> {
    // Look for horizontal lines with tick marks
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height);

    // Scan bottom portion of image where scale bars are typically located
    const scanHeight = Math.min(200, img.height / 4);
    const scanData = this.ctx.getImageData(
      0,
      img.height - scanHeight,
      img.width,
      scanHeight,
    );

    const scaleBarResult = this.findScaleBarPattern(scanData);

    return {
      found: scaleBarResult.found,
      pixelsPerFoot: scaleBarResult.pixelsPerFoot,
      confidence: scaleBarResult.confidence,
      method: "Scale bar detection",
      boundingBox: scaleBarResult.boundingBox,
    };
  }

  /**
   * Detect grid patterns that might indicate scale
   */
  private async detectGridPattern(
    img: HTMLImageElement,
  ): Promise<ScaleDetectionResult> {
    // Look for regular grid patterns
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height);

    // Analyze for regular spacing patterns
    const gridAnalysis = this.analyzeGridSpacing(imageData);

    return {
      found: gridAnalysis.found,
      pixelsPerFoot: gridAnalysis.pixelsPerFoot,
      confidence: gridAnalysis.confidence,
      method: "Grid pattern analysis",
    };
  }

  /**
   * Detect ruler or measurement elements
   */
  private async detectRulerElements(
    img: HTMLImageElement,
  ): Promise<ScaleDetectionResult> {
    // Look for ruler-like elements with regular tick marks
    const edgeData = this.detectEdges(img);
    const rulerAnalysis = this.analyzeRulerPatterns(edgeData);

    return {
      found: rulerAnalysis.found,
      pixelsPerFoot: rulerAnalysis.pixelsPerFoot,
      confidence: rulerAnalysis.confidence,
      method: "Ruler detection",
    };
  }

  /**
   * Detect textual scale information using OCR simulation
   */
  private async detectTextualScale(
    img: HTMLImageElement,
  ): Promise<ScaleDetectionResult> {
    // Simulate OCR detection of scale text like "1:1000", "Scale: 1"=100'", etc.
    // In a real implementation, this would use an OCR library like Tesseract.js

    // For now, return a simulated result
    return {
      found: false,
      confidence: 0,
      method: "OCR text detection",
    };
  }

  /**
   * Extract images from PDF (requires PDF.js or similar)
   */
  private async extractImagesFromPDF(file: File): Promise<string[]> {
    // This would typically use PDF.js to extract images
    // For now, simulate the process
    console.log("PDF image extraction would be implemented here");
    return [];
  }

  /**
   * Extract measurements from PDF using OCR
   */
  private async extractMeasurementsFromPDF(file: File): Promise<
    Array<{
      value: number;
      unit: string;
      location?: { page: number; x: number; y: number };
    }>
  > {
    // This would use OCR to find measurement text
    console.log("PDF measurement extraction would be implemented here");
    return [];
  }

  /**
   * Analyze region for scale bar characteristics
   */
  private analyzeScaleBarRegion(
    imageData: ImageData,
    imgWidth: number,
    imgHeight: number,
  ): {
    found: boolean;
    pixelsPerFoot?: number;
    confidence?: number;
  } {
    // Analyze pixel data for scale bar patterns
    // Look for horizontal lines with regular divisions

    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Simplified analysis - look for high contrast horizontal elements
    let horizontalLines = 0;
    let averageLineLength = 0;

    for (let y = 0; y < height; y += 5) {
      let lineLength = 0;
      let inLine = false;

      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const brightness =
          (data[index] + data[index + 1] + data[index + 2]) / 3;

        if (brightness < 128 && !inLine) {
          inLine = true;
          lineLength = 1;
        } else if (brightness < 128 && inLine) {
          lineLength++;
        } else if (brightness >= 128 && inLine) {
          if (lineLength > 20) {
            horizontalLines++;
            averageLineLength += lineLength;
          }
          inLine = false;
          lineLength = 0;
        }
      }
    }

    if (horizontalLines > 0) {
      averageLineLength /= horizontalLines;

      // Estimate scale based on typical scale bar conventions
      // Common scales: 1" = 50', 1" = 100', etc.
      const estimatedScale = averageLineLength / 50; // Rough estimate

      return {
        found: horizontalLines > 2,
        pixelsPerFoot: estimatedScale,
        confidence: Math.min(horizontalLines / 10, 0.9),
      };
    }

    return { found: false };
  }

  /**
   * Find scale bar patterns in image data
   */
  private findScaleBarPattern(imageData: ImageData): {
    found: boolean;
    pixelsPerFoot?: number;
    confidence?: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
  } {
    // Implement scale bar pattern recognition
    // This is a simplified version - real implementation would be more sophisticated

    return {
      found: false,
      confidence: 0,
    };
  }

  /**
   * Analyze grid spacing for scale information
   */
  private analyzeGridSpacing(imageData: ImageData): {
    found: boolean;
    pixelsPerFoot?: number;
    confidence?: number;
  } {
    // Analyze regular patterns that might indicate scale
    return {
      found: false,
      confidence: 0,
    };
  }

  /**
   * Detect edges in the image for ruler analysis
   */
  private detectEdges(img: HTMLImageElement): ImageData {
    // Simple edge detection (Sobel operator simulation)
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
    // Edge detection algorithm would go here
    return imageData;
  }

  /**
   * Analyze ruler patterns in edge data
   */
  private analyzeRulerPatterns(edgeData: ImageData): {
    found: boolean;
    pixelsPerFoot?: number;
    confidence?: number;
  } {
    // Analyze edge patterns for ruler-like characteristics
    return {
      found: false,
      confidence: 0,
    };
  }
}

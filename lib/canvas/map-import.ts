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
   * Detect textual scale information using OCR with Tesseract.js
   */
  private async detectTextualScale(
    img: HTMLImageElement,
  ): Promise<ScaleDetectionResult> {
    try {
      // Dynamic import of Tesseract.js to avoid bundle bloat
      const Tesseract = await import("tesseract.js");

      // Get image data for processing
      const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;

      // Look for text regions (areas with consistent text-like patterns)
      const textRegions: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        confidence: number;
      }> = [];

      // Scan for text-like regions using contrast and pattern analysis
      const scanStep = 20;
      for (let y = 0; y < height - 40; y += scanStep) {
        for (let x = 0; x < width - 100; x += scanStep) {
          const region = this.analyzeTextRegion(data, x, y, 100, 40, width);
          if (region.confidence > 0.6) {
            textRegions.push({
              x,
              y,
              width: 100,
              height: 40,
              confidence: region.confidence,
            });
          }
        }
      }

      // Process the most promising text regions with OCR
      const sortedRegions = textRegions.sort(
        (a, b) => b.confidence - a.confidence,
      );

      // Define scale text patterns for parsing
      const scalePatterns = [
        { pattern: /1\s*:\s*(\d+)/, type: "ratio" },
        {
          pattern: /scale\s*[:\s]\s*1["\s]*=\s*(\d+)['"]/i,
          type: "architectural",
        },
        { pattern: /1["\s]*=\s*(\d+)['"]/i, type: "architectural" },
        { pattern: /(\d+)['"]\s*=\s*1["]/, type: "architectural_inverse" },
        { pattern: /scale\s*1\s*:\s*(\d+)/i, type: "ratio" },
      ];

      // Common architectural scale mappings
      const scaleMap: Record<string, number> = {
        "1\" = 10'": 10,
        "1\" = 20'": 5,
        "1\" = 50'": 2,
        "1\" = 100'": 1,
        "1:100": 8.33,
        "1:200": 4.17,
        "1:500": 1.67,
      };

      // Process up to 3 best regions for OCR
      for (const region of sortedRegions.slice(0, 3)) {
        try {
          // Create a temporary canvas for the text region
          const regionCanvas = document.createElement("canvas");
          const regionCtx = regionCanvas.getContext("2d");
          if (!regionCtx) continue;

          // Set region canvas size with padding
          const padding = 10;
          regionCanvas.width = region.width + padding * 2;
          regionCanvas.height = region.height + padding * 2;

          // Extract the region from the main image data
          regionCtx.putImageData(
            this.ctx.getImageData(
              region.x - padding,
              region.y - padding,
              region.width + padding * 2,
              region.height + padding * 2,
            ),
            0,
            0,
          );

          // Convert canvas to image data for Tesseract
          const regionDataUrl = regionCanvas.toDataURL("image/png");

          // Initialize Tesseract worker with optimized settings
          const worker = await Tesseract.createWorker("eng", 1, {
            logger: () => {}, // Disable logging for performance
          });

          // Configure Tesseract for architectural text
          await worker.setParameters({
            tessedit_char_whitelist:
              "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:=\"' ",
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
          });

          // Perform OCR recognition
          const {
            data: { text, confidence },
          } = await worker.recognize(regionDataUrl);

          // Clean up worker
          await worker.terminate();

          // Clean and normalize the recognized text
          const cleanText = text
            .trim()
            .replace(/\s+/g, " ")
            .replace(/['']/g, "'")
            .replace(/[""]/g, '"');

          // Check against known scale patterns
          let detectedScale: number | null = null;
          let matchConfidence = 0;

          // Direct scale mapping lookup
          const normalizedText = cleanText.toLowerCase();
          for (const [scaleText, pixelsPerFoot] of Object.entries(scaleMap)) {
            if (normalizedText.includes(scaleText.toLowerCase())) {
              detectedScale = pixelsPerFoot;
              matchConfidence = 0.9;
              break;
            }
          }

          // Pattern matching if direct lookup fails
          if (!detectedScale) {
            for (const { pattern, type } of scalePatterns) {
              const match = cleanText.match(pattern);
              if (match) {
                const value = parseInt(match[1], 10);
                if (value > 0) {
                  switch (type) {
                    case "ratio":
                      // 1:100 scale ratio
                      detectedScale = 100 / value; // Convert to pixels per foot
                      break;
                    case "architectural":
                      // 1" = X' format
                      detectedScale = 12 / value; // 12 inches per foot
                      break;
                    case "architectural_inverse":
                      // X' = 1" format
                      detectedScale = value / 12;
                      break;
                  }
                  matchConfidence = 0.7;
                  break;
                }
              }
            }
          }

          // If we found a valid scale
          if (detectedScale && detectedScale > 0) {
            // Calculate final confidence based on OCR confidence and pattern matching
            const ocrConfidence = Math.min(confidence / 100, 1.0);
            const finalConfidence = Math.min(
              ocrConfidence * matchConfidence * (region.confidence / 100),
              0.9,
            );

            // Return result if confidence is sufficient
            if (finalConfidence > 0.4) {
              return {
                found: true,
                pixelsPerFoot: detectedScale,
                confidence: finalConfidence,
                method: `OCR text detection: "${cleanText}"`,
              };
            }
          }
        } catch (ocrError) {
          console.warn("OCR processing failed for region:", ocrError);
          continue; // Try next region
        }
      }

      return {
        found: false,
        confidence: 0,
        method: "OCR text detection",
      };
    } catch (error) {
      console.error("Error in textual scale detection:", error);
      return {
        found: false,
        confidence: 0,
        method: "OCR text detection (error)",
      };
    }
  }

  /**
   * Analyze a region for text-like characteristics
   */
  private analyzeTextRegion(
    data: Uint8ClampedArray,
    startX: number,
    startY: number,
    regionWidth: number,
    regionHeight: number,
    imageWidth: number,
  ): { confidence: number } {
    let contrastSum = 0;
    let pixelCount = 0;
    let edgeCount = 0;

    for (
      let y = startY;
      y < startY + regionHeight && y < data.length / (imageWidth * 4);
      y++
    ) {
      for (let x = startX; x < startX + regionWidth && x < imageWidth; x++) {
        const index = (y * imageWidth + x) * 4;
        if (index + 2 < data.length) {
          const brightness =
            (data[index] + data[index + 1] + data[index + 2]) / 3;

          // Check for edges (text has many edges)
          if (x > startX && y > startY) {
            const prevIndex = (y * imageWidth + (x - 1)) * 4;
            const upIndex = ((y - 1) * imageWidth + x) * 4;

            if (prevIndex + 2 < data.length && upIndex + 2 < data.length) {
              const prevBrightness =
                (data[prevIndex] + data[prevIndex + 1] + data[prevIndex + 2]) /
                3;
              const upBrightness =
                (data[upIndex] + data[upIndex + 1] + data[upIndex + 2]) / 3;

              const horizontalEdge = Math.abs(brightness - prevBrightness);
              const verticalEdge = Math.abs(brightness - upBrightness);

              if (horizontalEdge > 30 || verticalEdge > 30) {
                edgeCount++;
              }

              contrastSum += horizontalEdge + verticalEdge;
            }
          }

          pixelCount++;
        }
      }
    }

    const avgContrast = pixelCount > 0 ? contrastSum / pixelCount : 0;
    const edgeDensity = pixelCount > 0 ? edgeCount / pixelCount : 0;

    // Text regions have high edge density and contrast
    const textLikeness = Math.min(
      (avgContrast / 50) * 0.6 + (edgeDensity / 0.3) * 0.4,
      1,
    );

    return { confidence: textLikeness };
  }

  /**
   * Calculate brightness and contrast characteristics of a region
   */
  private calculateRegionBrightness(
    data: Uint8ClampedArray,
    startX: number,
    startY: number,
    regionWidth: number,
    regionHeight: number,
    imageWidth: number,
  ): { brightness: number; contrast: number } {
    let brightnessSum = 0;
    let pixelCount = 0;
    let minBrightness = 255;
    let maxBrightness = 0;

    for (
      let y = startY;
      y < startY + regionHeight && y < data.length / (imageWidth * 4);
      y++
    ) {
      for (let x = startX; x < startX + regionWidth && x < imageWidth; x++) {
        const index = (y * imageWidth + x) * 4;
        if (index + 2 < data.length) {
          const brightness =
            (data[index] + data[index + 1] + data[index + 2]) / 3;
          brightnessSum += brightness;
          minBrightness = Math.min(minBrightness, brightness);
          maxBrightness = Math.max(maxBrightness, brightness);
          pixelCount++;
        }
      }
    }

    const avgBrightness = pixelCount > 0 ? brightnessSum / pixelCount : 0;
    const contrast = maxBrightness - minBrightness;

    return { brightness: avgBrightness, contrast };
  }

  /**
   * Extract images from PDF using PDF.js
   */
  private async extractImagesFromPDF(file: File): Promise<string[]> {
    try {
      // Dynamic import for bundle optimization
      const pdfjsLib = await import("pdfjs-dist");

      // Set up PDF.js worker
      if (typeof window !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
      }

      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const images: string[] = [];

      // Process each page
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        try {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality

          // Create canvas for rendering
          const pageCanvas = document.createElement("canvas");
          const pageContext = pageCanvas.getContext("2d");

          if (!pageContext) {
            console.warn(`Failed to get context for page ${pageNumber}`);
            continue;
          }

          pageCanvas.width = viewport.width;
          pageCanvas.height = viewport.height;

          // Render page to canvas
          const renderContext = {
            canvasContext: pageContext,
            viewport: viewport,
          };

          await page.render(renderContext).promise;

          // Convert canvas to data URL
          const imageDataUrl = pageCanvas.toDataURL("image/png", 0.9);
          images.push(imageDataUrl);

          // Clean up page resources
          page.cleanup();
        } catch (pageError) {
          console.error(`Error processing PDF page ${pageNumber}:`, pageError);
          // Continue with next page rather than failing entirely
        }
      }

      // Clean up PDF resources
      pdf.destroy();

      return images;
    } catch (error) {
      console.error("Error extracting images from PDF:", error);
      throw new Error(
        `Failed to extract images from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
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
    try {
      // Dynamic import for bundle optimization
      const [pdfjsLib, Tesseract] = await Promise.all([
        import("pdfjs-dist"),
        import("tesseract.js"),
      ]);

      // Set up PDF.js worker
      if (typeof window !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
      }

      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const measurements: Array<{
        value: number;
        unit: string;
        location?: { page: number; x: number; y: number };
      }> = [];

      // Measurement detection patterns
      const measurementPatterns = [
        // Decimal measurements: 10.5', 25.3", 100.0 ft
        {
          pattern: /(\d+\.?\d*)\s*['"]\s*[-–]?\s*(\d+\.?\d*)?['"]*/,
          units: ["ft", "feet", "'"],
        },
        {
          pattern: /(\d+\.?\d*)\s*[""]\s*[-–]?\s*(\d+\.?\d*)?[""]*/,
          units: ["in", "inches", '"'],
        },
        { pattern: /(\d+\.?\d*)\s*(ft|feet|foot)\b/i, units: ["ft", "feet"] },
        {
          pattern: /(\d+\.?\d*)\s*(in|inches|inch)\b/i,
          units: ["in", "inches"],
        },

        // Fractional measurements: 10'-6", 25' 3 1/2", 8'6"
        {
          pattern: /(\d+)['"]\s*[-–]?\s*(\d+(?:\s*\d+\/\d+)?)['""]/,
          units: ["ft", "in"],
        },
        { pattern: /(\d+)['"]\s*[-–]?\s*(\d+)['""]/, units: ["ft", "in"] },

        // Architectural scale notations: 1"=10', SCALE: 1"=20'
        { pattern: /scale\s*[:=]?\s*1['"]\s*=\s*(\d+)['"]/i, units: ["scale"] },
        { pattern: /1['"]\s*=\s*(\d+)['"]/i, units: ["scale"] },

        // Engineering measurements: 100.00 LF, 50.5 SF
        {
          pattern:
            /(\d+\.?\d*)\s*(lf|sf|cf|sy|linear\s+feet?|square\s+feet?|cubic\s+feet?|square\s+yards?)\b/i,
          units: ["lf", "sf", "cf", "sy"],
        },

        // Metric measurements: 10.5m, 25.3cm, 100mm
        {
          pattern:
            /(\d+\.?\d*)\s*(m|cm|mm|meters?|centimeters?|millimeters?)\b/i,
          units: ["m", "cm", "mm"],
        },
      ];

      // Process each page of the PDF
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        try {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 2.0 });

          // Create canvas for the page
          const pageCanvas = document.createElement("canvas");
          const pageContext = pageCanvas.getContext("2d");

          if (!pageContext) {
            console.warn(`Failed to get context for PDF page ${pageNumber}`);
            continue;
          }

          pageCanvas.width = viewport.width;
          pageCanvas.height = viewport.height;

          // Render page to canvas
          await page.render({
            canvasContext: pageContext,
            viewport: viewport,
          }).promise;

          // Convert canvas to image data for OCR
          const imageDataUrl = pageCanvas.toDataURL("image/png");

          // Initialize Tesseract worker for this page
          const worker = await Tesseract.createWorker("eng", 1, {
            logger: () => {}, // Disable logging for performance
          });

          // Configure Tesseract for technical drawings
          await worker.setParameters({
            tessedit_char_whitelist:
              "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:=\"' -./",
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            preserve_interword_spaces: "1",
          });

          // Perform OCR on the entire page
          const { data } = await worker.recognize(imageDataUrl);

          // Process OCR results to find measurements
          const ocrText = data.text;
          const words = data.words || [];

          // Search for measurement patterns in the OCR text
          for (const { pattern, units } of measurementPatterns) {
            const matches = [
              ...ocrText.matchAll(new RegExp(pattern.source, "gi")),
            ];

            for (const match of matches) {
              try {
                let value: number;
                let unit: string;
                let matchLocation:
                  | { page: number; x: number; y: number }
                  | undefined;

                // Find the approximate location of this match in the page
                const matchText = match[0];
                const matchingWord = words.find((word) =>
                  word.text
                    .toLowerCase()
                    .includes(matchText.toLowerCase().substring(0, 5)),
                );

                if (matchingWord && matchingWord.bbox) {
                  matchLocation = {
                    page: pageNumber,
                    x: matchingWord.bbox.x0,
                    y: matchingWord.bbox.y0,
                  };
                }

                // Parse measurement value based on pattern type
                if (units.includes("scale")) {
                  // Scale notation: 1"=10' means 1 inch represents 10 feet
                  value = parseFloat(match[1]);
                  unit = "scale_feet_per_inch";
                } else if (
                  units.length === 2 &&
                  units.includes("ft") &&
                  units.includes("in")
                ) {
                  // Feet and inches: 10'-6"
                  const feet = parseFloat(match[1]) || 0;
                  const inches = parseFloat(match[2]) || 0;
                  value = feet + inches / 12; // Convert to decimal feet
                  unit = "ft";
                } else {
                  // Simple measurement
                  value = parseFloat(match[1]);
                  unit = units[0];
                }

                // Validate the measurement
                if (value > 0 && !isNaN(value)) {
                  // Filter out unreasonable values
                  const isReasonable =
                    (unit === "ft" && value >= 0.1 && value <= 10000) ||
                    (unit === "in" && value >= 0.1 && value <= 120000) ||
                    (unit === "m" && value >= 0.01 && value <= 3000) ||
                    (unit === "cm" && value >= 1 && value <= 300000) ||
                    (unit === "mm" && value >= 10 && value <= 3000000) ||
                    (unit === "scale_feet_per_inch" &&
                      value >= 1 &&
                      value <= 1000) ||
                    (["lf", "sf", "cf", "sy"].includes(unit) &&
                      value >= 0.1 &&
                      value <= 100000);

                  if (isReasonable) {
                    measurements.push({
                      value,
                      unit,
                      location: matchLocation,
                    });
                  }
                }
              } catch (parseError) {
                console.warn(
                  "Error parsing measurement:",
                  match[0],
                  parseError,
                );
              }
            }
          }

          // Clean up worker
          await worker.terminate();

          // Clean up page resources
          page.cleanup();
        } catch (pageError) {
          console.error(
            `Error processing PDF page ${pageNumber} for measurements:`,
            pageError,
          );
          // Continue with next page
        }
      }

      // Clean up PDF resources
      pdf.destroy();

      // Remove duplicate measurements (same value, unit, and approximate location)
      const uniqueMeasurements = measurements.filter(
        (measurement, index, array) => {
          return !array.slice(0, index).some((prev) => {
            const sameValue = Math.abs(prev.value - measurement.value) < 0.01;
            const sameUnit = prev.unit === measurement.unit;
            const sameLocation =
              !prev.location ||
              !measurement.location ||
              (prev.location.page === measurement.location.page &&
                Math.abs(prev.location.x - measurement.location.x) < 20 &&
                Math.abs(prev.location.y - measurement.location.y) < 20);

            return sameValue && sameUnit && sameLocation;
          });
        },
      );

      return uniqueMeasurements;
    } catch (error) {
      console.error("Error extracting measurements from PDF:", error);
      // Return empty array rather than throwing to allow partial success
      return [];
    }
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
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Look for horizontal lines with regular tick marks
    const scaleBarCandidates: Array<{
      y: number;
      startX: number;
      endX: number;
      length: number;
      tickCount: number;
    }> = [];

    // Scan for horizontal lines
    for (let y = 0; y < height; y += 2) {
      let currentLineStart = -1;
      let currentLineLength = 0;
      let tickCount = 0;

      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const brightness =
          (data[index] + data[index + 1] + data[index + 2]) / 3;
        const isDark = brightness < 100;

        if (isDark && currentLineStart === -1) {
          currentLineStart = x;
          currentLineLength = 1;
        } else if (isDark && currentLineStart !== -1) {
          currentLineLength++;
        } else if (!isDark && currentLineStart !== -1) {
          // End of dark segment - check if it's a line
          if (currentLineLength > 30) {
            // Look for vertical tick marks along this line
            const lineY = y;
            const lineStartX = currentLineStart;
            const lineEndX = currentLineStart + currentLineLength;

            // Check for vertical ticks every 10-20 pixels
            for (let tickX = lineStartX; tickX < lineEndX; tickX += 15) {
              let hasVerticalTick = false;

              // Check for vertical dark pixels above and below the line
              for (
                let checkY = Math.max(0, lineY - 10);
                checkY <= Math.min(height - 1, lineY + 10);
                checkY++
              ) {
                const tickIndex = (checkY * width + tickX) * 4;
                const tickBrightness =
                  (data[tickIndex] +
                    data[tickIndex + 1] +
                    data[tickIndex + 2]) /
                  3;
                if (tickBrightness < 100) {
                  hasVerticalTick = true;
                  break;
                }
              }

              if (hasVerticalTick) {
                tickCount++;
              }
            }

            if (tickCount >= 2) {
              scaleBarCandidates.push({
                y: lineY,
                startX: lineStartX,
                endX: lineEndX,
                length: currentLineLength,
                tickCount,
              });
            }
          }

          currentLineStart = -1;
          currentLineLength = 0;
          tickCount = 0;
        }
      }
    }

    // Find the best scale bar candidate
    const bestCandidate = scaleBarCandidates
      .filter((candidate) => candidate.tickCount >= 3)
      .sort((a, b) => b.tickCount * b.length - a.tickCount * a.length)[0];

    if (bestCandidate) {
      // Estimate scale based on common architectural conventions
      // Typical scale bars represent 10', 20', 50', or 100' segments
      const commonScales = [10, 20, 50, 100, 200];
      let bestScale = 10;
      let bestConfidence = 0;

      for (const scale of commonScales) {
        const expectedTickSpacing =
          bestCandidate.length / (bestCandidate.tickCount - 1);
        const expectedPixelsPerFoot =
          expectedTickSpacing / (scale / bestCandidate.tickCount);

        // Higher confidence for reasonable pixel-to-foot ratios
        const confidence = Math.min(
          bestCandidate.tickCount / 10,
          1 - Math.abs(expectedPixelsPerFoot - 20) / 100,
        );

        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestScale = expectedPixelsPerFoot;
        }
      }

      return {
        found: true,
        pixelsPerFoot: bestScale,
        confidence: Math.max(0.6, bestConfidence),
        boundingBox: {
          x: bestCandidate.startX,
          y: bestCandidate.y - 5,
          width: bestCandidate.length,
          height: 10,
        },
      };
    }

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
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Sample the image to find repeating patterns
    const sampleStep = 5;
    const horizontalSpacings: number[] = [];
    const verticalSpacings: number[] = [];

    // Analyze horizontal grid lines
    for (let y = 0; y < height; y += sampleStep * 4) {
      let lastLineX = -1;
      let consecutiveDarkPixels = 0;

      for (let x = 0; x < width; x += sampleStep) {
        const index = (y * width + x) * 4;
        const brightness =
          (data[index] + data[index + 1] + data[index + 2]) / 3;

        if (brightness < 150) {
          consecutiveDarkPixels++;
        } else {
          if (consecutiveDarkPixels > 3) {
            // Found a potential grid line
            const currentLineX = x - (consecutiveDarkPixels * sampleStep) / 2;
            if (lastLineX > 0) {
              const spacing = currentLineX - lastLineX;
              if (spacing > 20 && spacing < 200) {
                horizontalSpacings.push(spacing);
              }
            }
            lastLineX = currentLineX;
          }
          consecutiveDarkPixels = 0;
        }
      }
    }

    // Analyze vertical grid lines
    for (let x = 0; x < width; x += sampleStep * 4) {
      let lastLineY = -1;
      let consecutiveDarkPixels = 0;

      for (let y = 0; y < height; y += sampleStep) {
        const index = (y * width + x) * 4;
        const brightness =
          (data[index] + data[index + 1] + data[index + 2]) / 3;

        if (brightness < 150) {
          consecutiveDarkPixels++;
        } else {
          if (consecutiveDarkPixels > 3) {
            const currentLineY = y - (consecutiveDarkPixels * sampleStep) / 2;
            if (lastLineY > 0) {
              const spacing = currentLineY - lastLineY;
              if (spacing > 20 && spacing < 200) {
                verticalSpacings.push(spacing);
              }
            }
            lastLineY = currentLineY;
          }
          consecutiveDarkPixels = 0;
        }
      }
    }

    // Find the most common spacing
    const allSpacings = [...horizontalSpacings, ...verticalSpacings];
    if (allSpacings.length < 3) {
      return { found: false, confidence: 0 };
    }

    // Group similar spacings
    allSpacings.sort((a, b) => a - b);
    const spacingGroups: { spacing: number; count: number }[] = [];
    let currentGroup = { spacing: allSpacings[0], count: 1 };

    for (let i = 1; i < allSpacings.length; i++) {
      if (Math.abs(allSpacings[i] - currentGroup.spacing) < 10) {
        currentGroup.count++;
        currentGroup.spacing = (currentGroup.spacing + allSpacings[i]) / 2;
      } else {
        spacingGroups.push(currentGroup);
        currentGroup = { spacing: allSpacings[i], count: 1 };
      }
    }
    spacingGroups.push(currentGroup);

    // Find the most frequent spacing
    const dominantSpacing = spacingGroups.sort((a, b) => b.count - a.count)[0];

    if (dominantSpacing.count >= 3) {
      // Estimate scale based on common grid conventions
      // Typical grids represent 1', 5', 10', or 20' squares
      const commonGridSizes = [1, 5, 10, 20, 50];
      let bestPixelsPerFoot = dominantSpacing.spacing;
      let bestConfidence = 0;

      for (const gridSize of commonGridSizes) {
        const pixelsPerFoot = dominantSpacing.spacing / gridSize;
        // Reasonable pixel-to-foot ratios are typically 5-50
        if (pixelsPerFoot >= 5 && pixelsPerFoot <= 50) {
          const confidence = Math.min(
            dominantSpacing.count / 10,
            1 - Math.abs(pixelsPerFoot - 15) / 30,
          );

          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestPixelsPerFoot = pixelsPerFoot;
          }
        }
      }

      return {
        found: true,
        pixelsPerFoot: bestPixelsPerFoot,
        confidence: Math.max(0.5, bestConfidence),
      };
    }

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
    const data = edgeData.data;
    const width = edgeData.width;
    const height = edgeData.height;

    // Look for regular tick patterns characteristic of rulers
    const rulerCandidates: Array<{
      orientation: "horizontal" | "vertical";
      position: number;
      tickSpacing: number;
      tickCount: number;
      length: number;
    }> = [];

    // Analyze horizontal ruler patterns
    for (let y = 0; y < height; y += 10) {
      const tickPositions: number[] = [];
      let consecutiveEdgePixels = 0;

      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const edgeStrength = data[index]; // Edge data typically in red channel

        if (edgeStrength > 100) {
          consecutiveEdgePixels++;
        } else {
          if (consecutiveEdgePixels > 2) {
            // Found a potential tick mark
            tickPositions.push(x - consecutiveEdgePixels / 2);
          }
          consecutiveEdgePixels = 0;
        }
      }

      if (tickPositions.length >= 5) {
        // Analyze spacing between ticks
        const spacings: number[] = [];
        for (let i = 1; i < tickPositions.length; i++) {
          spacings.push(tickPositions[i] - tickPositions[i - 1]);
        }

        // Check for regular spacing (ruler characteristic)
        const avgSpacing =
          spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
        const spacingVariance =
          spacings.reduce((sum, s) => sum + Math.pow(s - avgSpacing, 2), 0) /
          spacings.length;
        const coefficient = Math.sqrt(spacingVariance) / avgSpacing;

        if (coefficient < 0.3 && avgSpacing > 5 && avgSpacing < 100) {
          rulerCandidates.push({
            orientation: "horizontal",
            position: y,
            tickSpacing: avgSpacing,
            tickCount: tickPositions.length,
            length: tickPositions[tickPositions.length - 1] - tickPositions[0],
          });
        }
      }
    }

    // Analyze vertical ruler patterns
    for (let x = 0; x < width; x += 10) {
      const tickPositions: number[] = [];
      let consecutiveEdgePixels = 0;

      for (let y = 0; y < height; y++) {
        const index = (y * width + x) * 4;
        const edgeStrength = data[index];

        if (edgeStrength > 100) {
          consecutiveEdgePixels++;
        } else {
          if (consecutiveEdgePixels > 2) {
            tickPositions.push(y - consecutiveEdgePixels / 2);
          }
          consecutiveEdgePixels = 0;
        }
      }

      if (tickPositions.length >= 5) {
        const spacings: number[] = [];
        for (let i = 1; i < tickPositions.length; i++) {
          spacings.push(tickPositions[i] - tickPositions[i - 1]);
        }

        const avgSpacing =
          spacings.reduce((sum, s) => sum + s, 0) / spacings.length;
        const spacingVariance =
          spacings.reduce((sum, s) => sum + Math.pow(s - avgSpacing, 2), 0) /
          spacings.length;
        const coefficient = Math.sqrt(spacingVariance) / avgSpacing;

        if (coefficient < 0.3 && avgSpacing > 5 && avgSpacing < 100) {
          rulerCandidates.push({
            orientation: "vertical",
            position: x,
            tickSpacing: avgSpacing,
            tickCount: tickPositions.length,
            length: tickPositions[tickPositions.length - 1] - tickPositions[0],
          });
        }
      }
    }

    // Find the best ruler candidate
    const bestRuler = rulerCandidates
      .filter((ruler) => ruler.tickCount >= 8)
      .sort((a, b) => b.tickCount * b.length - a.tickCount * a.length)[0];

    if (bestRuler) {
      // Estimate scale based on common ruler conventions
      // Engineering scales: 10, 20, 30, 40, 50, 60 (divisions per inch)
      // Architect scales: 1/8", 1/4", 1/2", 1", 3", 6", 12", 24", 48" = 1 foot
      const commonRulerScales = [
        { divisions: 10, scale: "Engineering 1:10" },
        { divisions: 20, scale: "Engineering 1:20" },
        { divisions: 30, scale: "Engineering 1:30" },
        { divisions: 12, scale: "Architect 1\" = 1'" },
        { divisions: 24, scale: "Architect 1/2\" = 1'" },
        { divisions: 48, scale: "Architect 1/4\" = 1'" },
      ];

      let bestPixelsPerFoot = bestRuler.tickSpacing;
      let bestConfidence = 0;

      for (const rulerScale of commonRulerScales) {
        // Assume each tick represents 1 foot or a fraction thereof
        const estimatedPixelsPerFoot =
          (bestRuler.tickSpacing * rulerScale.divisions) / 12;

        // Higher confidence for reasonable scales (5-50 pixels per foot)
        if (estimatedPixelsPerFoot >= 5 && estimatedPixelsPerFoot <= 50) {
          const confidence = Math.min(
            bestRuler.tickCount / 20,
            1 - Math.abs(estimatedPixelsPerFoot - 15) / 30,
          );

          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestPixelsPerFoot = estimatedPixelsPerFoot;
          }
        }
      }

      return {
        found: true,
        pixelsPerFoot: bestPixelsPerFoot,
        confidence: Math.max(0.4, bestConfidence),
      };
    }

    return {
      found: false,
      confidence: 0,
    };
  }
}

import {
  OCRConfig,
  PDFImageData,
  PDFProcessingError,
  PDFErrorCode,
} from "../types";
import { PDF_PROCESSING } from "../constants";

interface WorkerTask {
  id: string;
  image: PDFImageData;
  resolve: (result: OCRResult) => void;
  reject: (error: Error) => void;
}

interface OCRResult {
  text: string;
  confidence: number;
}

interface OCRWorkerInstance {
  id: number;
  worker: any; // Tesseract.Worker
  busy: boolean;
  taskCount: number;
}

/**
 * OCRWorkerPool - Manages a pool of OCR workers for parallel processing
 * Improves performance by processing multiple images concurrently
 */
export class OCRWorkerPool {
  private workers: OCRWorkerInstance[] = [];
  private taskQueue: WorkerTask[] = [];
  private readonly maxWorkers: number;
  private readonly config: OCRConfig;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(
    maxWorkers: number = PDF_PROCESSING.WORKER.WORKER_POOL_SIZE,
    config: Partial<OCRConfig> = {},
  ) {
    this.maxWorkers = Math.min(maxWorkers, navigator.hardwareConcurrency || 4);
    this.config = {
      language: "eng",
      engineMode: 1,
      pageSegMode: 6,
      ...config,
    } as OCRConfig;
  }

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    await this.initPromise;
    this.initPromise = null;
  }

  private async doInitialize(): Promise<void> {
    try {
      // Lazy load Tesseract
      const { createWorker } = await import("tesseract.js");

      // Create workers
      const workerPromises = Array.from(
        { length: this.maxWorkers },
        async (_, i) => {
          const worker = await createWorker(this.config.language);

          // Configure worker
          const parameters: Record<string, string> = {
            tessedit_ocr_engine_mode: this.config.engineMode.toString(),
            tessedit_pageseg_mode: this.config.pageSegMode.toString(),
          };

          if (this.config.whitelist) {
            parameters.tessedit_char_whitelist = this.config.whitelist;
          }

          if (this.config.blacklist) {
            parameters.tessedit_char_blacklist = this.config.blacklist;
          }

          await worker.setParameters(parameters);

          return {
            id: i,
            worker,
            busy: false,
            taskCount: 0,
          };
        },
      );

      this.workers = await Promise.all(workerPromises);
      this.isInitialized = true;
    } catch (error) {
      throw new PDFProcessingError(
        "Failed to initialize OCR worker pool",
        PDFErrorCode.OCR_FAILED,
        error,
      );
    }
  }

  /**
   * Get an available worker or wait for one
   */
  private async getAvailableWorker(): Promise<OCRWorkerInstance> {
    // Find idle worker
    let worker = this.workers.find((w) => !w.busy);

    if (!worker) {
      // Find worker with least tasks
      worker = this.workers.reduce((prev, curr) =>
        prev.taskCount < curr.taskCount ? prev : curr,
      );
    }

    return worker;
  }

  /**
   * Process an image using the worker pool
   */
  async processImage(image: PDFImageData): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: `${Date.now()}-${Math.random()}`,
        image,
        resolve,
        reject,
      };

      this.taskQueue.push(task);
      this.processTasks();
    });
  }

  /**
   * Process multiple images in parallel
   */
  async processImages(
    images: PDFImageData[],
    options: {
      onProgress?: (current: number, total: number) => void;
      concurrency?: number;
    } = {},
  ): Promise<Map<number, OCRResult>> {
    const { onProgress, concurrency = this.maxWorkers } = options;
    const results = new Map<number, OCRResult>();
    let processed = 0;

    // Process images in batches
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, Math.min(i + concurrency, images.length));

      const batchResults = await Promise.all(
        batch.map(async (image) => {
          try {
            const result = await this.processImage(image);
            processed++;

            if (onProgress) {
              onProgress(processed, images.length);
            }

            return { index: image.imageIndex, result };
          } catch (error) {
            console.warn(`OCR failed for image ${image.imageIndex}:`, error);
            return {
              index: image.imageIndex,
              result: { text: "", confidence: 0 },
            };
          }
        }),
      );

      // Store results
      batchResults.forEach(({ index, result }) => {
        results.set(index, result);
      });
    }

    return results;
  }

  /**
   * Process tasks from the queue
   */
  private async processTasks(): Promise<void> {
    while (this.taskQueue.length > 0) {
      const worker = await this.getAvailableWorker();
      const task = this.taskQueue.shift();

      if (!task) break;

      worker.busy = true;
      worker.taskCount++;

      // Process task asynchronously
      this.executeTask(worker, task).catch((error) => {
        console.error("Task execution failed:", error);
        task.reject(error);
      });
    }
  }

  /**
   * Execute a single OCR task
   */
  private async executeTask(
    worker: OCRWorkerInstance,
    task: WorkerTask,
  ): Promise<void> {
    try {
      // Convert image data to canvas
      const canvas = await this.imageDataToCanvas(task.image);

      // Perform OCR
      const result = await worker.worker.recognize(canvas);

      task.resolve({
        text: result.data.text,
        confidence: result.data.confidence,
      });
    } catch (error) {
      task.reject(
        new PDFProcessingError(
          `OCR failed for image ${task.image.imageIndex}`,
          PDFErrorCode.OCR_FAILED,
          error,
        ),
      );
    } finally {
      worker.busy = false;
      // Continue processing queue
      this.processTasks();
    }
  }

  /**
   * Convert image data to canvas for OCR
   */
  private async imageDataToCanvas(
    image: PDFImageData,
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new PDFProcessingError(
        "Failed to create canvas context",
        PDFErrorCode.OCR_FAILED,
      );
    }

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

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    busyWorkers: number;
    queueLength: number;
    totalProcessed: number;
  } {
    const busyWorkers = this.workers.filter((w) => w.busy).length;
    const totalProcessed = this.workers.reduce(
      (sum, w) => sum + w.taskCount,
      0,
    );

    return {
      totalWorkers: this.workers.length,
      busyWorkers,
      queueLength: this.taskQueue.length,
      totalProcessed,
    };
  }

  /**
   * Terminate all workers and cleanup resources
   */
  async terminate(): Promise<void> {
    // Clear task queue
    this.taskQueue.forEach((task) => {
      task.reject(
        new PDFProcessingError(
          "Worker pool terminated",
          PDFErrorCode.OCR_FAILED,
        ),
      );
    });
    this.taskQueue = [];

    // Terminate all workers
    await Promise.all(
      this.workers.map(async (w) => {
        try {
          await w.worker.terminate();
        } catch (error) {
          console.warn(`Failed to terminate worker ${w.id}:`, error);
        }
      }),
    );

    this.workers = [];
    this.isInitialized = false;
  }

  /**
   * Reset worker statistics
   */
  resetStats(): void {
    this.workers.forEach((w) => {
      w.taskCount = 0;
    });
  }
}

// Singleton instance for application-wide use
let globalPool: OCRWorkerPool | null = null;

/**
 * Get or create global OCR worker pool
 */
export function getGlobalOCRPool(
  maxWorkers?: number,
  config?: Partial<OCRConfig>,
): OCRWorkerPool {
  if (!globalPool) {
    globalPool = new OCRWorkerPool(maxWorkers, config);
  }
  return globalPool;
}

/**
 * Terminate global OCR worker pool
 */
export async function terminateGlobalOCRPool(): Promise<void> {
  if (globalPool) {
    await globalPool.terminate();
    globalPool = null;
  }
}

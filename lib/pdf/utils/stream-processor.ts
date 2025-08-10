import { PDFProcessingError, PDFErrorCode } from "../types";
import { PDF_PROCESSING, PDF_ERRORS } from "../constants";

/**
 * StreamProcessor - Handles streaming processing of large PDF files
 * Processes PDFs in chunks to optimize memory usage and performance
 */
export class StreamProcessor {
  private readonly chunkSize: number;
  private readonly maxMemoryUsage: number;
  private abortController: AbortController | null = null;

  constructor(
    chunkSize: number = PDF_PROCESSING.PERFORMANCE.CHUNK_SIZE,
    maxMemoryUsage: number = 100 * 1024 * 1024, // 100MB default
  ) {
    this.chunkSize = chunkSize;
    this.maxMemoryUsage = maxMemoryUsage;
  }

  /**
   * Process PDF in chunks with progress callback
   */
  async processInChunks<T>(
    totalPages: number,
    processor: (startPage: number, endPage: number) => Promise<T>,
    options: {
      onProgress?: (current: number, total: number) => void;
      onChunkComplete?: (chunkResult: T, chunkIndex: number) => void;
      aggregator?: (results: T[]) => T;
    } = {},
  ): Promise<T[]> {
    const { onProgress, onChunkComplete, aggregator } = options;
    const results: T[] = [];
    const totalChunks = Math.ceil(totalPages / this.chunkSize);

    this.abortController = new AbortController();

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        // Check for abort signal
        if (this.abortController.signal.aborted) {
          throw new PDFProcessingError(
            "Processing aborted by user",
            PDFErrorCode.TIMEOUT,
          );
        }

        const startPage = chunkIndex * this.chunkSize + 1;
        const endPage = Math.min((chunkIndex + 1) * this.chunkSize, totalPages);

        // Process chunk
        const chunkResult = await processor(startPage, endPage);
        results.push(chunkResult);

        // Notify progress
        if (onProgress) {
          onProgress(endPage, totalPages);
        }

        if (onChunkComplete) {
          onChunkComplete(chunkResult, chunkIndex);
        }

        // Memory cleanup between chunks
        await this.cleanupMemory();

        // Check memory usage
        if (await this.isMemoryExceeded()) {
          await this.forceGarbageCollection();
        }
      }

      // Aggregate results if aggregator provided
      if (aggregator && results.length > 0) {
        return [aggregator(results)];
      }

      return results;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Abort ongoing processing
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Clean up memory between chunks
   */
  private async cleanupMemory(): Promise<void> {
    // Give the event loop a chance to clean up
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  /**
   * Check if memory usage exceeds threshold
   */
  private async isMemoryExceeded(): boolean {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed > this.maxMemoryUsage;
    }
    return false;
  }

  /**
   * Force garbage collection if available
   */
  private async forceGarbageCollection(): Promise<void> {
    if (global.gc) {
      global.gc();
      // Wait for GC to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Create a streaming pipeline for processing
   */
  createPipeline<T, R>(
    stages: Array<(input: T) => Promise<R>>,
  ): (input: T) => Promise<R> {
    return async (input: T): Promise<R> => {
      let result: any = input;

      for (const stage of stages) {
        if (this.abortController?.signal.aborted) {
          throw new PDFProcessingError(
            "Pipeline processing aborted",
            PDFErrorCode.TIMEOUT,
          );
        }

        result = await stage(result);

        // Cleanup between stages
        await this.cleanupMemory();
      }

      return result as R;
    };
  }

  /**
   * Process stream with backpressure handling
   */
  async processWithBackpressure<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    options: {
      concurrency?: number;
      onProgress?: (current: number, total: number) => void;
    } = {},
  ): Promise<void> {
    const { concurrency = 3, onProgress } = options;
    const total = items.length;
    let processed = 0;

    // Process items in batches with limited concurrency
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, Math.min(i + concurrency, items.length));

      await Promise.all(
        batch.map(async (item) => {
          await processor(item);
          processed++;

          if (onProgress) {
            onProgress(processed, total);
          }
        }),
      );

      // Cleanup after each batch
      await this.cleanupMemory();
    }
  }
}

/**
 * Create a memory-aware buffer for accumulating results
 */
export class MemoryAwareBuffer<T> {
  private buffer: T[] = [];
  private readonly maxSize: number;
  private readonly flushCallback: (items: T[]) => Promise<void>;

  constructor(
    maxSize: number = 1000,
    flushCallback: (items: T[]) => Promise<void>,
  ) {
    this.maxSize = maxSize;
    this.flushCallback = flushCallback;
  }

  /**
   * Add item to buffer, flushing if necessary
   */
  async add(item: T): Promise<void> {
    this.buffer.push(item);

    if (this.buffer.length >= this.maxSize) {
      await this.flush();
    }
  }

  /**
   * Add multiple items to buffer
   */
  async addBatch(items: T[]): Promise<void> {
    for (const item of items) {
      await this.add(item);
    }
  }

  /**
   * Flush buffer contents
   */
  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      const items = [...this.buffer];
      this.buffer = [];
      await this.flushCallback(items);
    }
  }

  /**
   * Get current buffer size
   */
  get size(): number {
    return this.buffer.length;
  }

  /**
   * Clear buffer without flushing
   */
  clear(): void {
    this.buffer = [];
  }
}

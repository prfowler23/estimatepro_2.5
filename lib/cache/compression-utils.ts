// Cache Compression Utilities
// Efficient compression and decompression for cache storage
// Enhanced with browser-compatible compression for PWA

import { promisify } from "util";
import zlib from "zlib";

// Compression options
export interface CompressionOptions {
  level?: number; // 0-9, where 9 is maximum compression
  strategy?: number; // zlib compression strategy
  threshold?: number; // Minimum size in bytes to compress
  algorithm?: "gzip" | "deflate" | "brotli";
}

// Compression metrics
export interface CompressionMetrics {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
  algorithm: string;
}

// Default compression options
const DEFAULT_OPTIONS: CompressionOptions = {
  level: 6, // Balanced compression
  strategy: zlib.constants.Z_DEFAULT_STRATEGY,
  threshold: 1024, // 1KB minimum
  algorithm: "gzip",
};

// Promisified compression functions
const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);
const deflateAsync = promisify(zlib.deflate);
const inflateAsync = promisify(zlib.inflate);
const brotliCompressAsync = promisify(zlib.brotliCompress);
const brotliDecompressAsync = promisify(zlib.brotliDecompress);

export class CompressionUtils {
  private options: CompressionOptions;
  private metrics: Map<string, CompressionMetrics> = new Map();
  private isBrowser: boolean = typeof window !== "undefined";

  constructor(options: CompressionOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Browser-compatible compression using CompressionStream API
   */
  async compressBrowser(data: any): Promise<{
    data: Buffer | string;
    compressed: boolean;
    metrics?: CompressionMetrics;
  }> {
    const startTime = Date.now();
    const jsonData = typeof data === "string" ? data : JSON.stringify(data);
    const originalSize = new Blob([jsonData]).size;

    // Check threshold
    if (originalSize < (this.options.threshold || 1024)) {
      return {
        data: jsonData,
        compressed: false,
      };
    }

    try {
      // Use browser's CompressionStream API if available
      if ("CompressionStream" in globalThis) {
        const encoder = new TextEncoder();
        const stream = new Response(
          new Blob([encoder.encode(jsonData)])
            .stream()
            .pipeThrough(new (globalThis as any).CompressionStream("gzip")),
        );

        const blob = await stream.blob();
        const buffer = await blob.arrayBuffer();
        const compressed = btoa(String.fromCharCode(...new Uint8Array(buffer)));

        const metrics: CompressionMetrics = {
          originalSize,
          compressedSize: compressed.length,
          compressionRatio: 1 - compressed.length / originalSize,
          compressionTime: Date.now() - startTime,
          algorithm: "gzip",
        };

        this.storeMetrics(jsonData, metrics);

        return {
          data: compressed,
          compressed: true,
          metrics,
        };
      }
    } catch (error) {
      console.warn("Browser compression failed, using fallback", error);
    }

    // Fallback to uncompressed
    return {
      data: jsonData,
      compressed: false,
    };
  }

  /**
   * Browser-compatible decompression using DecompressionStream API
   */
  async decompressBrowser(data: string): Promise<string> {
    try {
      if ("DecompressionStream" in globalThis) {
        const binary = atob(data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const stream = new Response(
          new Blob([bytes])
            .stream()
            .pipeThrough(new (globalThis as any).DecompressionStream("gzip")),
        );

        return await stream.text();
      }
    } catch (error) {
      console.warn("Browser decompression failed", error);
    }

    // Return as-is if decompression fails
    return data;
  }

  /**
   * Compress data using the specified algorithm
   */
  async compress(data: any): Promise<{
    data: Buffer | string;
    compressed: boolean;
    metrics?: CompressionMetrics;
  }> {
    const startTime = Date.now();

    // Convert to string if not already
    const input = typeof data === "string" ? data : JSON.stringify(data);
    const originalSize = Buffer.byteLength(input);

    // Skip compression for small data
    if (originalSize < (this.options.threshold || 1024)) {
      return {
        data: input,
        compressed: false,
      };
    }

    try {
      let compressed: Buffer;
      const compressionOptions = {
        level: this.options.level,
        strategy: this.options.strategy,
      };

      switch (this.options.algorithm) {
        case "deflate":
          compressed = await deflateAsync(input, compressionOptions);
          break;
        case "brotli":
          compressed = await brotliCompressAsync(input, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: this.options.level || 6,
            },
          });
          break;
        case "gzip":
        default:
          compressed = await gzipAsync(input, compressionOptions);
          break;
      }

      const compressedSize = compressed.length;
      const compressionRatio = (1 - compressedSize / originalSize) * 100;
      const compressionTime = Date.now() - startTime;

      const metrics: CompressionMetrics = {
        originalSize,
        compressedSize,
        compressionRatio,
        compressionTime,
        algorithm: this.options.algorithm || "gzip",
      };

      // Only use compression if it actually saves space
      if (compressedSize < originalSize * 0.9) {
        return {
          data: compressed,
          compressed: true,
          metrics,
        };
      }

      return {
        data: input,
        compressed: false,
        metrics,
      };
    } catch (error) {
      console.error("Compression failed:", error);
      return {
        data: input,
        compressed: false,
      };
    }
  }

  /**
   * Decompress data using the specified algorithm
   */
  async decompress(data: Buffer | string, algorithm?: string): Promise<string> {
    // Use browser decompression in browser environment
    if (this.isBrowser && typeof data === "string") {
      return this.decompressBrowser(data);
    }

    try {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "base64");
      const algo = algorithm || this.options.algorithm || "gzip";

      let decompressed: Buffer;
      switch (algo) {
        case "deflate":
          decompressed = await inflateAsync(buffer);
          break;
        case "brotli":
          decompressed = await brotliDecompressAsync(buffer);
          break;
        case "gzip":
        default:
          decompressed = await gunzipAsync(buffer);
          break;
      }

      return decompressed.toString("utf-8");
    } catch (error) {
      // If decompression fails, assume data is not compressed
      if (typeof data === "string") {
        return data;
      }
      return data.toString("utf-8");
    }
  }

  /**
   * Calculate compression ratio for data
   */
  calculateCompressionRatio(
    originalSize: number,
    compressedSize: number,
  ): number {
    if (originalSize === 0) return 0;
    return ((originalSize - compressedSize) / originalSize) * 100;
  }

  /**
   * Estimate if data should be compressed based on content
   */
  shouldCompress(data: any): boolean {
    const str = typeof data === "string" ? data : JSON.stringify(data);
    const size = Buffer.byteLength(str);

    // Don't compress if below threshold
    if (size < (this.options.threshold || 1024)) {
      return false;
    }

    // Check for already compressed data (images, videos, etc.)
    if (typeof data === "string") {
      // Check for base64 encoded binary data
      if (data.startsWith("data:image/") || data.startsWith("data:video/")) {
        return false;
      }

      // Check for common compressed file signatures
      const signatures = ["PK", "Rar!", "7z", "GIF8", "PNG", "JFIF"];
      for (const sig of signatures) {
        if (data.startsWith(sig)) {
          return false;
        }
      }
    }

    // Estimate compressibility based on entropy
    const entropy = this.calculateEntropy(str);
    return entropy < 7.5; // High entropy (>7.5) indicates already compressed
  }

  /**
   * Calculate Shannon entropy of a string
   */
  private calculateEntropy(str: string): number {
    const len = str.length;
    const frequencies = new Map<string, number>();

    // Count character frequencies
    for (const char of str) {
      frequencies.set(char, (frequencies.get(char) || 0) + 1);
    }

    // Calculate entropy
    let entropy = 0;
    for (const freq of frequencies.values()) {
      const p = freq / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  /**
   * Get compression metrics
   */
  getMetrics(): Map<string, CompressionMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Batch compress multiple items
   */
  async batchCompress(
    items: any[],
  ): Promise<Array<{ data: Buffer | string; compressed: boolean }>> {
    return Promise.all(items.map((item) => this.compress(item)));
  }

  /**
   * Batch decompress multiple items
   */
  async batchDecompress(
    items: Array<{ data: Buffer | string; algorithm?: string }>,
  ): Promise<string[]> {
    return Promise.all(
      items.map((item) => this.decompress(item.data, item.algorithm)),
    );
  }
}

// Singleton instance with default options
export const compressionUtils = new CompressionUtils();

// Helper functions for direct usage
export async function compress(
  data: any,
  options?: CompressionOptions,
): Promise<{ data: Buffer | string; compressed: boolean }> {
  const utils = new CompressionUtils(options);
  return utils.compress(data);
}

export async function decompress(
  data: Buffer | string,
  algorithm?: string,
): Promise<string> {
  const utils = new CompressionUtils();
  return utils.decompress(data, algorithm);
}

// Compression middleware for cache operations
export function createCompressionMiddleware(options?: CompressionOptions) {
  const utils = new CompressionUtils(options);

  return {
    beforeSet: async (data: any) => {
      if (!utils.shouldCompress(data)) {
        return { data, compressed: false };
      }
      return utils.compress(data);
    },

    afterGet: async (entry: {
      data: any;
      compressed?: boolean;
      algorithm?: string;
    }) => {
      if (!entry.compressed) {
        return entry.data;
      }
      const decompressed = await utils.decompress(entry.data, entry.algorithm);
      return JSON.parse(decompressed);
    },
  };
}

export default CompressionUtils;

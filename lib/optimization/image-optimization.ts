/**
 * Image Optimization Service
 * Handles image compression, format conversion, and lazy loading
 */

export interface ImageOptimizationConfig {
  // Compression settings
  quality: number;
  maxWidth: number;
  maxHeight: number;
  format: "webp" | "avif" | "auto";

  // Lazy loading settings
  lazyLoading: boolean;
  blurPlaceholder: boolean;
  priority: boolean;

  // Progressive enhancement
  progressiveJPEG: boolean;
  losslessWebP: boolean;
}

export interface ResponsiveImageConfig {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
    wide: number;
  };
  densities: number[];
  formats: string[];
}

// Default configuration for different image types
export const IMAGE_CONFIGS: Record<string, ImageOptimizationConfig> = {
  // Hero images and banners
  hero: {
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1080,
    format: "webp",
    lazyLoading: false,
    blurPlaceholder: true,
    priority: true,
    progressiveJPEG: true,
    losslessWebP: false,
  },

  // Gallery and facade images
  gallery: {
    quality: 80,
    maxWidth: 800,
    maxHeight: 600,
    format: "webp",
    lazyLoading: true,
    blurPlaceholder: true,
    priority: false,
    progressiveJPEG: true,
    losslessWebP: false,
  },

  // Thumbnails and small images
  thumbnail: {
    quality: 75,
    maxWidth: 300,
    maxHeight: 300,
    format: "webp",
    lazyLoading: true,
    blurPlaceholder: false,
    priority: false,
    progressiveJPEG: false,
    losslessWebP: false,
  },

  // Avatar and profile images
  avatar: {
    quality: 85,
    maxWidth: 200,
    maxHeight: 200,
    format: "webp",
    lazyLoading: true,
    blurPlaceholder: false,
    priority: false,
    progressiveJPEG: false,
    losslessWebP: false,
  },

  // Icons and UI elements
  icon: {
    quality: 90,
    maxWidth: 64,
    maxHeight: 64,
    format: "auto",
    lazyLoading: false,
    blurPlaceholder: false,
    priority: false,
    progressiveJPEG: false,
    losslessWebP: true,
  },
};

// Responsive image breakpoints
export const RESPONSIVE_CONFIG: ResponsiveImageConfig = {
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
    wide: 1920,
  },
  densities: [1, 2], // 1x and 2x (retina)
  formats: ["avif", "webp", "jpeg"],
};

/**
 * Generate optimized sizes attribute for responsive images
 */
export function generateSizesAttribute(config: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
  wide?: string;
}): string {
  const sizes = [];

  if (config.wide) {
    sizes.push(
      `(min-width: ${RESPONSIVE_CONFIG.breakpoints.wide}px) ${config.wide}`,
    );
  }
  if (config.desktop) {
    sizes.push(
      `(min-width: ${RESPONSIVE_CONFIG.breakpoints.desktop}px) ${config.desktop}`,
    );
  }
  if (config.tablet) {
    sizes.push(
      `(min-width: ${RESPONSIVE_CONFIG.breakpoints.tablet}px) ${config.tablet}`,
    );
  }
  if (config.mobile) {
    sizes.push(
      `(min-width: ${RESPONSIVE_CONFIG.breakpoints.mobile}px) ${config.mobile}`,
    );
  }

  // Default fallback
  const fallback = config.mobile || config.tablet || config.desktop || "100vw";
  sizes.push(fallback);

  return sizes.join(", ");
}

/**
 * Generate blur placeholder data URL
 */
export function generateBlurPlaceholder(
  width: number = 8,
  height: number = 8,
): string {
  const canvas =
    typeof window !== "undefined" ? document.createElement("canvas") : null;

  if (!canvas) {
    // Server-side fallback
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
      </svg>`,
    ).toString("base64")}`;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  // Create a simple gradient placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f3f4f6");
  gradient.addColorStop(1, "#e5e7eb");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.1);
}

/**
 * Calculate optimal image dimensions for a container
 */
export function calculateOptimalDimensions(
  containerWidth: number,
  containerHeight: number,
  imageType: keyof typeof IMAGE_CONFIGS = "gallery",
): { width: number; height: number } {
  const config = IMAGE_CONFIGS[imageType];
  const aspectRatio = containerWidth / containerHeight;

  let width = Math.min(containerWidth, config.maxWidth);
  let height = Math.min(containerHeight, config.maxHeight);

  // Maintain aspect ratio
  if (width / height !== aspectRatio) {
    if (width / aspectRatio <= config.maxHeight) {
      height = width / aspectRatio;
    } else {
      width = height * aspectRatio;
    }
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Check if browser supports modern image formats
 */
export function checkImageFormatSupport(): {
  webp: boolean;
  avif: boolean;
} {
  if (typeof window === "undefined") {
    return { webp: false, avif: false };
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;

  const webp = canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  const avif = canvas.toDataURL("image/avif").indexOf("data:image/avif") === 0;

  return { webp, avif };
}

/**
 * Preload critical images
 */
export function preloadCriticalImages(imageUrls: string[]): void {
  if (typeof window === "undefined") return;

  imageUrls.forEach((url) => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = url;

    // Add to head
    document.head.appendChild(link);
  });
}

/**
 * Image compression utility for client-side optimization
 */
export async function compressImage(
  file: File,
  config: Partial<ImageOptimizationConfig> = {},
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  const img = new Image();
  const imageConfig = { ...IMAGE_CONFIGS.gallery, ...config };

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const { width, height } = calculateOptimalDimensions(
        img.naturalWidth,
        img.naturalHeight,
        "gallery",
      );

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to compress image"));
          }
        },
        `image/${imageConfig.format === "auto" ? "jpeg" : imageConfig.format}`,
        imageConfig.quality / 100,
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Performance monitoring for image loading
 */
export class ImagePerformanceMonitor {
  private static instance: ImagePerformanceMonitor;
  private metrics: Map<
    string,
    {
      loadTime: number;
      size: number;
      format: string;
      cached: boolean;
    }
  > = new Map();

  static getInstance(): ImagePerformanceMonitor {
    if (!ImagePerformanceMonitor.instance) {
      ImagePerformanceMonitor.instance = new ImagePerformanceMonitor();
    }
    return ImagePerformanceMonitor.instance;
  }

  recordImageLoad(
    src: string,
    loadTime: number,
    size: number,
    format: string,
    cached: boolean = false,
  ): void {
    this.metrics.set(src, {
      loadTime,
      size,
      format,
      cached,
    });
  }

  getAverageLoadTime(): number {
    const times = Array.from(this.metrics.values()).map((m) => m.loadTime);
    return times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
  }

  getTotalDataTransferred(): number {
    return Array.from(this.metrics.values())
      .filter((m) => !m.cached)
      .reduce((total, m) => total + m.size, 0);
  }

  getFormatDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const metric of this.metrics.values()) {
      distribution[metric.format] = (distribution[metric.format] || 0) + 1;
    }

    return distribution;
  }

  getCacheHitRate(): number {
    const total = this.metrics.size;
    const cached = Array.from(this.metrics.values()).filter(
      (m) => m.cached,
    ).length;

    return total > 0 ? (cached / total) * 100 : 0;
  }

  getMetricsReport(): {
    averageLoadTime: number;
    totalDataTransferred: number;
    formatDistribution: Record<string, number>;
    cacheHitRate: number;
    totalImages: number;
  } {
    return {
      averageLoadTime: this.getAverageLoadTime(),
      totalDataTransferred: this.getTotalDataTransferred(),
      formatDistribution: this.getFormatDistribution(),
      cacheHitRate: this.getCacheHitRate(),
      totalImages: this.metrics.size,
    };
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Export singleton instance
export const imagePerformanceMonitor = ImagePerformanceMonitor.getInstance();

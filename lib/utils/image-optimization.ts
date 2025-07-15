// Image optimization utilities for better performance
import { useState, useEffect } from 'react';

export interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png';
  progressive?: boolean;
}

export interface OptimizedImage {
  data: string; // base64 data URL
  blob: Blob;
  width: number;
  height: number;
  size: number;
  format: string;
}

export const imageLoader = ({ src, width, quality }: {
  src: string
  width: number
  quality?: number
}) => {
  return `${src}?w=${width}&q=${quality || 75}`
}

export const getOptimizedImageProps = (
  src: string,
  alt: string,
  width: number,
  height: number
) => ({
  src,
  alt,
  width,
  height,
  loader: imageLoader,
  quality: 85,
  placeholder: 'blur' as const,
  blurDataURL: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx4f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=='
})

// Compress and optimize image files
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const {
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1080,
    format = 'webp',
    progressive = true
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate optimal dimensions
        const { width, height } = calculateOptimalDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        // Create canvas for optimization
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        canvas.width = width;
        canvas.height = height;

        // Apply image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw optimized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized format
        const mimeType = getMimeType(format);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to optimize image'));
              return;
            }

            // Create data URL
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                data: reader.result as string,
                blob,
                width,
                height,
                size: blob.size,
                format
              });
            };
            reader.onerror = () => reject(new Error('Failed to read optimized image'));
            reader.readAsDataURL(blob);
          },
          mimeType,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Calculate optimal dimensions while maintaining aspect ratio
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Calculate scaling factor
  const widthRatio = maxWidth / originalWidth;
  const heightRatio = maxHeight / originalHeight;
  const scale = Math.min(widthRatio, heightRatio, 1);

  width = Math.floor(originalWidth * scale);
  height = Math.floor(originalHeight * scale);

  return { width, height };
}

// Get MIME type for format
function getMimeType(format: string): string {
  switch (format) {
    case 'webp':
      return 'image/webp';
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'image/webp';
  }
}

// Progressive image loading utility
export class ProgressiveImageLoader {
  private static cache = new Map<string, string>();

  static async loadImage(
    src: string,
    options: {
      placeholder?: string;
      quality?: number;
      sizes?: string;
    } = {}
  ): Promise<string> {
    const { placeholder = '', quality = 0.8 } = options;

    // Check cache first
    if (this.cache.has(src)) {
      return this.cache.get(src)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Cache the loaded image
        this.cache.set(src, src);
        resolve(src);
      };
      
      img.onerror = () => {
        // Fallback to placeholder or reject
        if (placeholder) {
          resolve(placeholder);
        } else {
          reject(new Error(`Failed to load image: ${src}`));
        }
      };
      
      img.src = src;
    });
  }

  static clearCache(): void {
    this.cache.clear();
  }
}

// Lazy loading intersection observer
export class LazyImageObserver {
  private observer: IntersectionObserver;
  private images = new Set<HTMLImageElement>();

  constructor(options: IntersectionObserverInit = {}) {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          this.loadImage(img);
          this.observer.unobserve(img);
          this.images.delete(img);
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
  }

  observe(img: HTMLImageElement): void {
    this.images.add(img);
    this.observer.observe(img);
  }

  unobserve(img: HTMLImageElement): void {
    this.images.delete(img);
    this.observer.unobserve(img);
  }

  private loadImage(img: HTMLImageElement): void {
    const src = img.dataset.src;
    if (src) {
      img.src = src;
      img.classList.add('loaded');
    }
  }

  disconnect(): void {
    this.observer.disconnect();
    this.images.clear();
  }
}

// Create singleton instance
export const lazyImageObserver = new LazyImageObserver();

// React hook for image optimization
export function useOptimizedImage(
  file: File | null,
  options: ImageOptimizationOptions = {}
) {
  const [optimizedImage, setOptimizedImage] = useState<OptimizedImage | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setOptimizedImage(null);
      return;
    }

    let cancelled = false;

    const optimize = async () => {
      setIsOptimizing(true);
      setError(null);

      try {
        const result = await optimizeImage(file, options);
        if (!cancelled) {
          setOptimizedImage(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to optimize image');
        }
      } finally {
        if (!cancelled) {
          setIsOptimizing(false);
        }
      }
    };

    optimize();

    return () => {
      cancelled = true;
    };
  }, [file, JSON.stringify(options)]);

  return { optimizedImage, isOptimizing, error };
}

// Batch image optimization
export async function optimizeImages(
  files: File[],
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage[]> {
  const results: OptimizedImage[] = [];
  const errors: string[] = [];

  // Process images in batches to avoid memory issues
  const batchSize = 3;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (file) => {
      try {
        return await optimizeImage(file, options);
      } catch (error) {
        errors.push(`Failed to optimize ${file.name}: ${error}`);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(Boolean) as OptimizedImage[]);
  }

  if (errors.length > 0) {
    console.warn('Image optimization errors:', errors);
  }

  return results;
}

// Image format detection
export function getOptimalFormat(file: File): 'webp' | 'jpeg' | 'png' {
  // Check browser support for WebP
  if (supportsWebP()) {
    return 'webp';
  }

  // Fallback based on original format
  if (file.type === 'image/png') {
    return 'png';
  }

  return 'jpeg';
}

// Check WebP support
function supportsWebP(): boolean {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

// Image size validation
export function validateImageSize(file: File, maxSize: number = 10 * 1024 * 1024): boolean {
  return file.size <= maxSize;
}

// Generate responsive image sizes
export function generateResponsiveSizes(
  baseWidth: number,
  baseHeight: number,
  breakpoints: number[] = [640, 768, 1024, 1280, 1920]
): Array<{ width: number; height: number; size: string }> {
  const aspectRatio = baseHeight / baseWidth;
  
  return breakpoints.map((width) => ({
    width,
    height: Math.round(width * aspectRatio),
    size: `${width}w`
  }));
}
/**
 * Image Preloader Service
 * Preloads critical images and manages image caching
 */

export interface PreloadConfig {
  priority: "high" | "medium" | "low";
  type: "hero" | "gallery" | "thumbnail" | "icon" | "avatar";
  responsive?: boolean;
  defer?: boolean;
}

export interface PreloadItem {
  url: string;
  config: PreloadConfig;
  loaded: boolean;
  error: boolean;
  loadTime?: number;
}

class ImagePreloaderService {
  private static instance: ImagePreloaderService;
  private preloadQueue: Map<string, PreloadItem> = new Map();
  private loadedImages: Set<string> = new Set();
  private loading: Set<string> = new Set();
  private observers: Map<string, IntersectionObserver> = new Map();

  static getInstance(): ImagePreloaderService {
    if (!ImagePreloaderService.instance) {
      ImagePreloaderService.instance = new ImagePreloaderService();
    }
    return ImagePreloaderService.instance;
  }

  /**
   * Add images to preload queue
   */
  addToQueue(items: Array<{ url: string; config: PreloadConfig }>): void {
    items.forEach(({ url, config }) => {
      if (!this.preloadQueue.has(url) && !this.loadedImages.has(url)) {
        this.preloadQueue.set(url, {
          url,
          config,
          loaded: false,
          error: false,
        });
      }
    });

    // Process queue immediately for high priority items
    this.processHighPriorityItems();
  }

  /**
   * Preload a single image immediately
   */
  async preloadImage(
    url: string,
    config: PreloadConfig = { priority: "medium", type: "gallery" },
  ): Promise<void> {
    if (this.loadedImages.has(url) || this.loading.has(url)) {
      return;
    }

    this.loading.add(url);
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        const loadTime = Date.now() - startTime;
        this.loadedImages.add(url);
        this.loading.delete(url);

        if (this.preloadQueue.has(url)) {
          const item = this.preloadQueue.get(url)!;
          item.loaded = true;
          item.loadTime = loadTime;
        }

        resolve();
      };

      img.onerror = () => {
        this.loading.delete(url);

        if (this.preloadQueue.has(url)) {
          const item = this.preloadQueue.get(url)!;
          item.error = true;
        }

        reject(new Error(`Failed to preload image: ${url}`));
      };

      // Set source to start loading
      img.src = url;
    });
  }

  /**
   * Process high priority items immediately
   */
  private processHighPriorityItems(): void {
    const highPriorityItems = Array.from(this.preloadQueue.values()).filter(
      (item) => item.config.priority === "high" && !item.loaded && !item.error,
    );

    highPriorityItems.forEach((item) => {
      this.preloadImage(item.url, item.config).catch(console.warn);
    });
  }

  /**
   * Process medium and low priority items with requestIdleCallback
   */
  processQueueWhenIdle(): void {
    if (typeof window === "undefined") return;

    const processItems = () => {
      const mediumPriorityItems = Array.from(this.preloadQueue.values())
        .filter(
          (item) =>
            item.config.priority === "medium" && !item.loaded && !item.error,
        )
        .slice(0, 3); // Process 3 at a time

      mediumPriorityItems.forEach((item) => {
        if (!item.config.defer) {
          this.preloadImage(item.url, item.config).catch(console.warn);
        }
      });
    };

    if ("requestIdleCallback" in window) {
      requestIdleCallback(processItems, { timeout: 5000 });
    } else {
      setTimeout(processItems, 100);
    }
  }

  /**
   * Setup intersection observer for lazy preloading
   */
  setupLazyPreloading(
    element: HTMLElement,
    imageUrl: string,
    config: PreloadConfig,
  ): void {
    if (typeof window === "undefined" || this.observers.has(imageUrl)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.preloadImage(imageUrl, config).catch(console.warn);
            observer.disconnect();
            this.observers.delete(imageUrl);
          }
        });
      },
      {
        rootMargin: "50px", // Start loading 50px before entering viewport
        threshold: 0.1,
      },
    );

    observer.observe(element);
    this.observers.set(imageUrl, observer);
  }

  /**
   * Preload images for a specific route/page
   */
  preloadRouteImages(route: string, images: string[]): void {
    const routeConfigs: Record<string, PreloadConfig> = {
      "/dashboard": { priority: "high", type: "hero" },
      "/estimates": { priority: "medium", type: "gallery" },
      "/calculator": { priority: "medium", type: "gallery" },
      "/3d-demo": { priority: "low", type: "gallery", defer: true },
    };

    const config = routeConfigs[route] || {
      priority: "medium",
      type: "gallery",
    };

    this.addToQueue(images.map((url) => ({ url, config })));
  }

  /**
   * Clear preload queue and observers
   */
  clearQueue(): void {
    this.preloadQueue.clear();

    // Disconnect all observers
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
  }

  /**
   * Get preload statistics
   */
  getStats(): {
    totalQueued: number;
    loaded: number;
    failed: number;
    pending: number;
    averageLoadTime: number;
  } {
    const items = Array.from(this.preloadQueue.values());
    const loadedItems = items.filter((item) => item.loaded);
    const failedItems = items.filter((item) => item.error);
    const pendingItems = items.filter((item) => !item.loaded && !item.error);

    const averageLoadTime =
      loadedItems.length > 0
        ? loadedItems.reduce((sum, item) => sum + (item.loadTime || 0), 0) /
          loadedItems.length
        : 0;

    return {
      totalQueued: items.length,
      loaded: loadedItems.length,
      failed: failedItems.length,
      pending: pendingItems.length,
      averageLoadTime,
    };
  }

  /**
   * Check if image is already loaded
   */
  isImageLoaded(url: string): boolean {
    return this.loadedImages.has(url);
  }

  /**
   * Warmup critical images for faster initial page load
   */
  warmupCriticalImages(): void {
    const criticalImages = [
      // Add your critical images here
      "/icons/icon-192x192.png",
      "/icons/icon-512x512.png",
    ];

    this.addToQueue(
      criticalImages.map((url) => ({
        url,
        config: { priority: "high", type: "icon" },
      })),
    );
  }

  /**
   * Setup service worker for image caching
   */
  setupImageCaching(): void {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;

    navigator.serviceWorker.ready.then((registration) => {
      // Send critical images to service worker for caching
      const criticalImages = Array.from(this.preloadQueue.entries())
        .filter(([, item]) => item.config.priority === "high")
        .map(([url]) => url);

      if (registration.active) {
        registration.active.postMessage({
          type: "CACHE_IMAGES",
          images: criticalImages,
        });
      }
    });
  }
}

// Export singleton instance
export const imagePreloader = ImagePreloaderService.getInstance();

// React hook for using the preloader
import { useEffect } from "react";

export function useImagePreloader(
  images: Array<{ url: string; config: PreloadConfig }>,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled || images.length === 0) return;

    imagePreloader.addToQueue(images);

    // Process queue when idle
    const timer = setTimeout(() => {
      imagePreloader.processQueueWhenIdle();
    }, 100);

    return () => clearTimeout(timer);
  }, [images, enabled]);

  return {
    preloadImage: imagePreloader.preloadImage.bind(imagePreloader),
    isImageLoaded: imagePreloader.isImageLoaded.bind(imagePreloader),
    getStats: imagePreloader.getStats.bind(imagePreloader),
  };
}

// Route-based preloading hook
export function useRouteImagePreloader(route: string, images: string[]) {
  useEffect(() => {
    if (images.length === 0) return;

    imagePreloader.preloadRouteImages(route, images);

    // Setup warmup for critical images on route change
    if (route === "/" || route === "/dashboard") {
      imagePreloader.warmupCriticalImages();
    }
  }, [route, images]);
}

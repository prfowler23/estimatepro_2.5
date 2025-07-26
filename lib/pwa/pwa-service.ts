// PHASE 3 FIX: Enhanced PWA Service for comprehensive offline support
// Manages PWA lifecycle, caching strategies, and advanced features

import { offlineManager } from "./offline-manager";

export interface PWAConfig {
  enabled: boolean;
  offlineMode: boolean;
  backgroundSync: boolean;
  pushNotifications: boolean;
  autoUpdate: boolean;
  cacheStrategies: {
    images: "cache-first" | "network-first" | "stale-while-revalidate";
    api: "cache-first" | "network-first" | "stale-while-revalidate";
    documents: "cache-first" | "network-first" | "stale-while-revalidate";
  };
  offlinePages: string[];
  criticalResources: string[];
}

export interface PWAStatus {
  isInstalled: boolean;
  isStandalone: boolean;
  isOfflineReady: boolean;
  hasServiceWorker: boolean;
  hasPushPermission: boolean;
  updateAvailable: boolean;
  networkStatus: "online" | "offline" | "slow";
  cacheStatus: {
    totalSize: number;
    itemCount: number;
    lastCleared: Date | null;
  };
}

export interface CacheStrategy {
  pattern: RegExp;
  strategy: "cache-first" | "network-first" | "stale-while-revalidate";
  cacheName: string;
  maxAge?: number;
  maxEntries?: number;
}

export class PWAService {
  private static instance: PWAService;
  private config: PWAConfig;
  private status: PWAStatus;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private networkSpeed: "fast" | "slow" | "offline" = "fast";
  private cacheStrategies: CacheStrategy[] = [];

  private constructor() {
    this.config = {
      enabled: true,
      offlineMode: true,
      backgroundSync: true,
      pushNotifications: true,
      autoUpdate: true,
      cacheStrategies: {
        images: "cache-first",
        api: "network-first",
        documents: "stale-while-revalidate",
      },
      offlinePages: ["/offline", "/dashboard", "/estimates", "/calculator"],
      criticalResources: [
        "/",
        "/manifest.json",
        "/_next/static/css/*.css",
        "/_next/static/chunks/*.js",
      ],
    };

    this.status = {
      isInstalled: false,
      isStandalone: false,
      isOfflineReady: false,
      hasServiceWorker: false,
      hasPushPermission: false,
      updateAvailable: false,
      networkStatus: "online",
      cacheStatus: {
        totalSize: 0,
        itemCount: 0,
        lastCleared: null,
      },
    };

    this.initializeCacheStrategies();
  }

  static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  // Initialize PWA features
  async initialize(): Promise<void> {
    if (!this.config.enabled) return;

    // Check installation status
    this.checkInstallationStatus();

    // Register service worker
    await this.registerServiceWorker();

    // Set up event listeners
    this.setupEventListeners();

    // Initialize offline manager
    offlineManager.setEnabled(this.config.offlineMode);

    // Check network status
    this.checkNetworkStatus();

    // Set up periodic update checks
    if (this.config.autoUpdate) {
      this.startUpdateChecks();
    }

    // Pre-cache critical resources
    await this.preCacheCriticalResources();

    // Request notification permission if enabled
    if (this.config.pushNotifications) {
      await this.requestNotificationPermission();
    }
  }

  // Initialize cache strategies
  private initializeCacheStrategies(): void {
    this.cacheStrategies = [
      // Images - Cache First
      {
        pattern: /\.(png|jpg|jpeg|svg|gif|webp)$/,
        strategy: this.config.cacheStrategies.images,
        cacheName: "images-cache",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxEntries: 100,
      },
      // API - Network First
      {
        pattern: /^\/api\//,
        strategy: this.config.cacheStrategies.api,
        cacheName: "api-cache",
        maxAge: 5 * 60 * 1000, // 5 minutes
        maxEntries: 50,
      },
      // Documents - Stale While Revalidate
      {
        pattern: /\.(pdf|doc|docx|xls|xlsx)$/,
        strategy: this.config.cacheStrategies.documents,
        cacheName: "documents-cache",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxEntries: 25,
      },
      // Fonts - Cache First
      {
        pattern: /\.(woff|woff2|ttf|otf)$/,
        strategy: "cache-first",
        cacheName: "fonts-cache",
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      },
      // Static Assets - Cache First
      {
        pattern: /\/_next\/static\//,
        strategy: "cache-first",
        cacheName: "static-cache",
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      },
    ];
  }

  // Check installation status
  private checkInstallationStatus(): void {
    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");

    // Check if on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInIOSApp = isIOS && (window.navigator as any).standalone;

    this.status.isInstalled = isStandalone || isInIOSApp;
    this.status.isStandalone = isStandalone;
  }

  // Register service worker
  private async registerServiceWorker(): Promise<void> {
    if (!("serviceWorker" in navigator)) {
      console.log("Service Worker not supported");
      return;
    }

    // Check if we're in development mode
    const isDevelopment =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.includes("localhost");

    if (isDevelopment) {
      console.log("Service Worker registration skipped in development mode");
      return;
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register(
        "/sw.js",
        {
          scope: "/",
        },
      );

      this.status.hasServiceWorker = true;

      console.log("Service Worker registered successfully");

      // Listen for updates
      this.serviceWorkerRegistration.addEventListener("updatefound", () => {
        const newWorker = this.serviceWorkerRegistration!.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              this.status.updateAvailable = true;
              this.notifyUpdateAvailable();
            }
          });
        }
      });

      // Check for updates immediately
      await this.checkForUpdates();
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }

  // Set up event listeners
  private setupEventListeners(): void {
    // Online/offline events
    window.addEventListener("online", () => {
      this.status.networkStatus = "online";
      this.checkNetworkSpeed();
    });

    window.addEventListener("offline", () => {
      this.status.networkStatus = "offline";
    });

    // App visibility change
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && this.config.autoUpdate) {
        this.checkForUpdates();
      }
    });

    // Service worker controller change
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // New service worker has taken control
      window.location.reload();
    });

    // Listen for app install
    window.addEventListener("appinstalled", () => {
      this.status.isInstalled = true;
      console.log("PWA installed successfully");
    });
  }

  // Check network status and speed
  private async checkNetworkStatus(): Promise<void> {
    if (!navigator.onLine) {
      this.status.networkStatus = "offline";
      return;
    }

    try {
      const startTime = Date.now();
      const response = await fetch("/api/health", {
        method: "GET",
        cache: "no-cache",
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (response.ok) {
        if (duration < 1000) {
          this.networkSpeed = "fast";
          this.status.networkStatus = "online";
        } else {
          this.networkSpeed = "slow";
          this.status.networkStatus = "slow";
        }
      }
    } catch (error) {
      this.status.networkStatus = "offline";
    }
  }

  // Check network speed
  private async checkNetworkSpeed(): Promise<void> {
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection.effectiveType;

      switch (effectiveType) {
        case "slow-2g":
        case "2g":
          this.networkSpeed = "slow";
          break;
        case "3g":
          this.networkSpeed = "slow";
          break;
        case "4g":
          this.networkSpeed = "fast";
          break;
        default:
          this.networkSpeed = "fast";
      }
    }
  }

  // Pre-cache critical resources
  private async preCacheCriticalResources(): Promise<void> {
    if (!this.serviceWorkerRegistration?.active) return;

    try {
      const cache = await caches.open("critical-cache");

      // Cache offline pages
      for (const page of this.config.offlinePages) {
        try {
          const response = await fetch(page);
          if (response.ok) {
            await cache.put(page, response);
          }
        } catch (error) {
          console.error(`Failed to cache offline page: ${page}`, error);
        }
      }

      // Cache critical resources
      for (const resource of this.config.criticalResources) {
        if (resource.includes("*")) {
          // Handle wildcard patterns
          continue;
        }

        try {
          const response = await fetch(resource);
          if (response.ok) {
            await cache.put(resource, response);
          }
        } catch (error) {
          console.error(
            `Failed to cache critical resource: ${resource}`,
            error,
          );
        }
      }

      this.status.isOfflineReady = true;
    } catch (error) {
      console.error("Failed to pre-cache critical resources:", error);
    }
  }

  // Request notification permission
  private async requestNotificationPermission(): Promise<void> {
    if (!("Notification" in window)) {
      console.log("Notifications not supported");
      return;
    }

    if (Notification.permission === "granted") {
      this.status.hasPushPermission = true;
      return;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      this.status.hasPushPermission = permission === "granted";
    }
  }

  // Start periodic update checks
  private startUpdateChecks(): void {
    // Check every 30 minutes
    this.updateCheckInterval = setInterval(
      () => {
        this.checkForUpdates();
      },
      30 * 60 * 1000,
    );
  }

  // Check for updates
  async checkForUpdates(): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    try {
      await this.serviceWorkerRegistration.update();
    } catch (error) {
      console.error("Failed to check for updates:", error);
    }
  }

  // Notify user about available update
  private notifyUpdateAvailable(): void {
    // Send message to main thread
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("pwa-updates");
      channel.postMessage({ type: "UPDATE_AVAILABLE" });
    }
  }

  // Update service worker
  async updateServiceWorker(): Promise<void> {
    if (!this.serviceWorkerRegistration?.waiting) return;

    // Tell waiting service worker to skip waiting
    this.serviceWorkerRegistration.waiting.postMessage({
      type: "SKIP_WAITING",
    });
  }

  // Cache management
  async clearCache(cacheName?: string): Promise<void> {
    if (cacheName) {
      await caches.delete(cacheName);
    } else {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    this.status.cacheStatus.lastCleared = new Date();
    await this.updateCacheStatus();
  }

  // Update cache status
  private async updateCacheStatus(): Promise<void> {
    let totalSize = 0;
    let itemCount = 0;

    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      itemCount += keys.length;

      // Estimate cache size
      for (const request of keys) {
        const response = await cache.match(request);
        if (response && response.headers.get("content-length")) {
          totalSize += parseInt(response.headers.get("content-length")!, 10);
        }
      }
    }

    this.status.cacheStatus = {
      totalSize,
      itemCount,
      lastCleared: this.status.cacheStatus.lastCleared,
    };
  }

  // Get cache statistics
  async getCacheStats(): Promise<{
    caches: Array<{ name: string; entries: number; size: number }>;
    total: { entries: number; size: number };
  }> {
    const stats = {
      caches: [] as Array<{ name: string; entries: number; size: number }>,
      total: { entries: 0, size: 0 },
    };

    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      let cacheSize = 0;

      for (const request of keys) {
        const response = await cache.match(request);
        if (response && response.headers.get("content-length")) {
          cacheSize += parseInt(response.headers.get("content-length")!, 10);
        }
      }

      stats.caches.push({
        name: cacheName,
        entries: keys.length,
        size: cacheSize,
      });

      stats.total.entries += keys.length;
      stats.total.size += cacheSize;
    }

    return stats;
  }

  // Share API support
  async share(data: {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
  }): Promise<void> {
    if (!("share" in navigator)) {
      throw new Error("Web Share API not supported");
    }

    try {
      await (navigator as any).share(data);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        throw error;
      }
    }
  }

  // Badge API support
  async setBadge(count: number): Promise<void> {
    if ("setAppBadge" in navigator) {
      try {
        await (navigator as any).setAppBadge(count);
      } catch (error) {
        console.error("Failed to set app badge:", error);
      }
    }
  }

  async clearBadge(): Promise<void> {
    if ("clearAppBadge" in navigator) {
      try {
        await (navigator as any).clearAppBadge();
      } catch (error) {
        console.error("Failed to clear app badge:", error);
      }
    }
  }

  // Get PWA status
  getStatus(): PWAStatus {
    return { ...this.status };
  }

  // Get PWA config
  getConfig(): PWAConfig {
    return { ...this.config };
  }

  // Update PWA config
  updateConfig(config: Partial<PWAConfig>): void {
    this.config = { ...this.config, ...config };

    // Apply config changes
    if (config.offlineMode !== undefined) {
      offlineManager.setEnabled(config.offlineMode);
    }
  }

  // Clean up
  destroy(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }
}

// Global PWA service instance
export const pwaService = PWAService.getInstance();

// PWA utility functions
export const pwaUtils = {
  // Check if running as PWA
  isPWA(): boolean {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://")
    );
  },

  // Check if PWA is installable
  isInstallable(): boolean {
    return "BeforeInstallPromptEvent" in window;
  },

  // Check if device supports PWA features
  checkSupport(): {
    serviceWorker: boolean;
    pushNotifications: boolean;
    backgroundSync: boolean;
    share: boolean;
    badges: boolean;
    install: boolean;
  } {
    return {
      serviceWorker: "serviceWorker" in navigator,
      pushNotifications: "Notification" in window && "PushManager" in window,
      backgroundSync: "sync" in ServiceWorkerRegistration.prototype,
      share: "share" in navigator,
      badges: "setAppBadge" in navigator,
      install: "BeforeInstallPromptEvent" in window,
    };
  },

  // Format bytes for display
  formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },
};

// Service Worker for Progressive Web App
// Handles offline functionality, caching, and background sync

/// <reference path="../../types/service-worker.d.ts" />

// Service Worker type declarations
declare const self: ServiceWorkerGlobalScope;

// Cache names with versioning
const CACHE_VERSION = "v1";
const CACHE_NAME = `estimatepro-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `estimatepro-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `estimatepro-dynamic-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `estimatepro-data-${CACHE_VERSION}`;

// Cache configuration
const CACHE_CONFIG = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxEntries: 100,
  networkTimeout: 5000, // 5 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Error tracking
const errorMetrics = {
  fetchErrors: 0,
  cacheErrors: 0,
  syncErrors: 0,
  total: 0,
};

// Static assets to cache (minimal list for reliability)
const STATIC_ASSETS = ["/", "/manifest.json"];

// API endpoints for offline support
const CACHEABLE_APIS = [
  "/api/estimates",
  "/api/customers",
  "/api/calculations",
  "/api/analytics/enhanced",
];

// Background sync tags
const SYNC_TAGS = {
  ESTIMATE_SYNC: "estimate-sync",
  CUSTOMER_SYNC: "customer-sync",
  PHOTO_UPLOAD: "photo-upload",
  OFFLINE_ACTIONS: "offline-actions",
};

// Check if we're in development mode
const isDevelopment =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname.includes("localhost");

// Install event - cache static assets with error handling
self.addEventListener("install", (event: ExtendableEvent) => {
  console.log("Service Worker: Installing");

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log("Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.error("Service Worker: Failed to cache static assets", error);
          errorMetrics.cacheErrors++;
          errorMetrics.total++;
          // Continue installation even if some assets fail to cache
          return Promise.resolve();
        });
      }),
      caches.open(DATA_CACHE_NAME).then((cache) => {
        console.log("Service Worker: Preparing data cache");
        return cache
          .put("/api/offline-data", new Response("{}"))
          .catch((error) => {
            console.error(
              "Service Worker: Failed to prepare data cache",
              error,
            );
            errorMetrics.cacheErrors++;
            errorMetrics.total++;
            return Promise.resolve();
          });
      }),
    ]).catch((error) => {
      console.error("Service Worker: Installation failed", error);
      // Re-throw to prevent faulty service worker from being installed
      throw error;
    }),
  );

  // Force activation
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event: ExtendableEvent) => {
  console.log("Service Worker: Activating");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== DYNAMIC_CACHE_NAME &&
            cacheName !== DATA_CACHE_NAME
          ) {
            console.log("Service Worker: Deleting old cache", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );

  // Take control of all clients
  self.clients.claim();
});

// Fetch event - handle requests with caching strategies
self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // In development, be very selective about what we intercept
  if (isDevelopment) {
    // Only handle API requests and specific static assets in development
    if (isAPIRequest(url)) {
      event.respondWith(handleAPIRequest(request));
    } else if (url.pathname === "/" || url.pathname === "/manifest.json") {
      event.respondWith(handleStaticAsset(request));
    }
    // Let everything else (Next.js assets, etc.) go through normally
    return;
  }

  // In production, handle all requests
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isPageRequest(url)) {
    event.respondWith(handlePageRequest(request));
  } else {
    event.respondWith(handleDefaultRequest(request));
  }
});

// Background sync event
self.addEventListener("sync", (event: SyncEvent) => {
  console.log("Service Worker: Background sync triggered", event.tag);

  switch (event.tag) {
    case SYNC_TAGS.ESTIMATE_SYNC:
      event.waitUntil(syncEstimates());
      break;
    case SYNC_TAGS.CUSTOMER_SYNC:
      event.waitUntil(syncCustomers());
      break;
    case SYNC_TAGS.PHOTO_UPLOAD:
      event.waitUntil(syncPhotoUploads());
      break;
    case SYNC_TAGS.OFFLINE_ACTIONS:
      event.waitUntil(syncOfflineActions());
      break;
  }
});

// Push notification event
self.addEventListener("push", (event: PushEvent) => {
  console.log("Service Worker: Push notification received");

  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/icon-192x192.png",
    badge: "/icon-96x96.png",
    data: data.data,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click event
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  console.log("Service Worker: Notification clicked");

  event.notification.close();

  if (event.action === "open") {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url || "/"),
    );
  }
});

// Message event
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  console.log("Service Worker: Message received", event.data);

  const { type, payload } = event.data;

  switch (type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;
    case "CLAIM_CLIENTS":
      self.clients.claim();
      break;
    case "CLEAR_CACHE":
      event.waitUntil(clearCache());
      break;
    case "CACHE_ESTIMATE":
      event.waitUntil(cacheEstimate(payload));
      break;
    case "CACHE_CUSTOMER":
      event.waitUntil(cacheCustomer(payload));
      break;
    case "SYNC_DATA":
      event.waitUntil(syncAllData());
      break;
    case "GET_CACHE_STATUS":
      event.waitUntil(
        getCacheStatus().then((status) => {
          event.ports[0].postMessage(status);
        }),
      );
      break;
  }
});

// Helper functions
function isStaticAsset(url: URL): boolean {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/static/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname === "/manifest.json"
  );
}

function isAPIRequest(url: URL): boolean {
  return url.pathname.startsWith("/api/");
}

function isPageRequest(url: URL): boolean {
  return !isStaticAsset(url) && !isAPIRequest(url);
}

async function handleStaticAsset(request: Request): Promise<Response> {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);

    // Skip caching for unsupported URL schemes
    const url = new URL(request.url);
    if (!url.protocol.startsWith("http")) {
      console.log("Service Worker: Skipping unsupported scheme:", url.protocol);
      return await fetchWithRetry(request);
    }

    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Return cached response and update cache in background
      fetchWithRetry(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
        })
        .catch(() => {}); // Silently fail background update

      return cachedResponse;
    }

    // Try network with timeout
    const response = await fetchWithTimeout(
      request,
      CACHE_CONFIG.networkTimeout,
    );

    if (response.ok) {
      // Only cache successful responses
      await cache.put(request, response.clone()).catch((error) => {
        console.warn("Service Worker: Cache write failed", error);
        errorMetrics.cacheErrors++;
      });
    }

    return response;
  } catch (error) {
    console.error("Service Worker: Failed to handle static asset", error);
    errorMetrics.fetchErrors++;
    errorMetrics.total++;

    // Try to find any cached version as fallback
    try {
      const cache = await caches.open(STATIC_CACHE_NAME);
      const cachedResponse = await cache.match(request, { ignoreVary: true });
      if (cachedResponse) {
        console.log("Service Worker: Using stale cached response");
        return cachedResponse;
      }
    } catch (cacheError) {
      console.error("Service Worker: Cache fallback failed", cacheError);
    }

    // In development, don't return 503 for static assets
    if (isDevelopment) {
      throw error;
    }

    return new Response("Asset not available offline", {
      status: 503,
      headers: { "X-SW-Error": "Network and cache failed" },
    });
  }
}

async function handleAPIRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  try {
    const cache = await caches.open(DATA_CACHE_NAME);

    // Check if this is a cacheable API
    const isCacheable = CACHEABLE_APIS.some((api) =>
      url.pathname.startsWith(api),
    );

    if (isCacheable) {
      // Try network first with timeout, fallback to cache
      try {
        const response = await fetchWithTimeout(
          request,
          CACHE_CONFIG.networkTimeout,
        );

        if (response.ok) {
          // Update cache asynchronously
          cache.put(request, response.clone()).catch((error) => {
            console.warn("Service Worker: API cache update failed", error);
            errorMetrics.cacheErrors++;
          });
        } else if (response.status >= 500) {
          // For server errors, try cache
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            console.log("Service Worker: Using cache due to server error");
            return cachedResponse;
          }
        }

        return response;
      } catch (networkError) {
        console.log("Service Worker: Network failed, trying cache for API");
        errorMetrics.fetchErrors++;

        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          // Add header to indicate stale response
          const headers = new Headers(cachedResponse.headers);
          headers.set("X-SW-Cache", "stale");

          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers,
          });
        }

        // Return offline response for cacheable APIs
        return new Response(
          JSON.stringify({
            error: "Data not available offline",
            offline: true,
            timestamp: Date.now(),
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "X-SW-Error": "Network failed, no cache available",
            },
          },
        );
      }
    } else {
      // For non-cacheable APIs, try network with retry
      return await fetchWithRetry(request);
    }
  } catch (error) {
    console.error("Service Worker: API request handling failed", error);
    errorMetrics.total++;

    return new Response(
      JSON.stringify({
        error: "Service worker error",
        offline: !navigator.onLine,
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "X-SW-Error": "Request handling failed",
        },
      },
    );
  }
}

async function handlePageRequest(request: Request): Promise<Response> {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log("Service Worker: Network failed, trying cache for page");
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    const offlineResponse = await cache.match("/offline");
    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>EstimatePro - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-message { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 48px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="icon">🔌</div>
            <h1>You're Offline</h1>
            <p>This page is not available offline. Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 503,
        headers: { "Content-Type": "text/html" },
      },
    );
  }
}

async function handleDefaultRequest(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response("Request failed", { status: 503 });
  }
}

// Helper functions for error handling
async function fetchWithTimeout(
  request: Request,
  timeout: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw error;
  }
}

async function fetchWithRetry(
  request: Request,
  attempts: number = CACHE_CONFIG.retryAttempts,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetchWithTimeout(
        request,
        CACHE_CONFIG.networkTimeout,
      );
      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Service Worker: Fetch attempt ${i + 1} failed`, error);

      if (i < attempts - 1) {
        // Exponential backoff with jitter
        const delay =
          CACHE_CONFIG.retryDelay *
          Math.pow(2, i) *
          (0.5 + Math.random() * 0.5);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Fetch failed after retries");
}

// Enhanced background sync functions with error recovery
async function syncEstimates(): Promise<void> {
  console.log("Service Worker: Syncing estimates");

  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const pendingEstimates = await cache.match("/api/pending-estimates");

    if (pendingEstimates) {
      const estimates = await pendingEstimates.json();
      const results = { success: 0, failed: 0 };

      // Process in parallel with limited concurrency
      const batchSize = 5;
      for (let i = 0; i < estimates.length; i += batchSize) {
        const batch = estimates.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(async (estimate: any) => {
            try {
              const response = await fetchWithRetry(
                new Request("/api/estimates", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(estimate),
                }),
                2, // Fewer retries for sync
              );

              if (response.ok) {
                results.success++;
                return true;
              } else {
                results.failed++;
                return false;
              }
            } catch (error) {
              console.error("Service Worker: Failed to sync estimate", error);
              errorMetrics.syncErrors++;
              results.failed++;
              return false;
            }
          }),
        );
      }

      console.log(
        `Service Worker: Sync complete - Success: ${results.success}, Failed: ${results.failed}`,
      );

      // Clear successfully synced estimates
      if (results.success > 0 && results.failed === 0) {
        await cache.delete("/api/pending-estimates");
      }
    }
  } catch (error) {
    console.error("Service Worker: Estimate sync failed", error);
    errorMetrics.syncErrors++;
    errorMetrics.total++;
    throw error; // Re-throw to trigger retry
  }
}

async function syncCustomers(): Promise<void> {
  console.log("Service Worker: Syncing customers");

  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const pendingCustomers = await cache.match("/api/pending-customers");

    if (pendingCustomers) {
      const customers = await pendingCustomers.json();

      for (const customer of customers) {
        try {
          const response = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customer),
          });

          if (response.ok) {
            console.log("Service Worker: Customer synced successfully");
          }
        } catch (error) {
          console.error("Service Worker: Failed to sync customer", error);
        }
      }
    }
  } catch (error) {
    console.error("Service Worker: Customer sync failed", error);
  }
}

async function syncPhotoUploads(): Promise<void> {
  console.log("Service Worker: Syncing photo uploads");

  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const pendingPhotos = await cache.match("/api/pending-photos");

    if (pendingPhotos) {
      const photos = await pendingPhotos.json();

      for (const photo of photos) {
        try {
          const formData = new FormData();
          formData.append("photo", photo.blob);
          formData.append("metadata", JSON.stringify(photo.metadata));

          const response = await fetch("/api/photos/upload", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            console.log("Service Worker: Photo uploaded successfully");
          }
        } catch (error) {
          console.error("Service Worker: Failed to upload photo", error);
        }
      }
    }
  } catch (error) {
    console.error("Service Worker: Photo upload sync failed", error);
  }
}

async function syncOfflineActions(): Promise<void> {
  console.log("Service Worker: Syncing offline actions");

  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const pendingActions = await cache.match("/api/pending-actions");

    if (pendingActions) {
      const actions = await pendingActions.json();

      for (const action of actions) {
        try {
          const response = await fetch(action.endpoint, {
            method: action.method,
            headers: action.headers,
            body: action.body,
          });

          if (response.ok) {
            console.log("Service Worker: Action synced successfully");
          }
        } catch (error) {
          console.error("Service Worker: Failed to sync action", error);
        }
      }
    }
  } catch (error) {
    console.error("Service Worker: Offline action sync failed", error);
  }
}

// Cache management functions
async function cacheEstimate(estimate: any): Promise<void> {
  const cache = await caches.open(DATA_CACHE_NAME);
  const cacheKey = `/api/estimates/${estimate.id}`;

  await cache.put(
    cacheKey,
    new Response(JSON.stringify(estimate), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function cacheCustomer(customer: any): Promise<void> {
  const cache = await caches.open(DATA_CACHE_NAME);
  const cacheKey = `/api/customers/${customer.id}`;

  await cache.put(
    cacheKey,
    new Response(JSON.stringify(customer), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function clearCache(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
}

async function syncAllData(): Promise<void> {
  await Promise.all([
    syncEstimates(),
    syncCustomers(),
    syncPhotoUploads(),
    syncOfflineActions(),
  ]);
}

async function getCacheStatus(): Promise<any> {
  const cacheNames = await caches.keys();
  const status = {
    caches: [],
    totalSize: 0,
  };

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status.caches.push({
      name: cacheName,
      entries: keys.length,
    });
  }

  return status;
}

// Error reporting function
function reportError(error: Error, context: string): void {
  console.error(`Service Worker Error [${context}]:`, error);
  errorMetrics.total++;

  // Send error metrics to server when online
  if (navigator.onLine && errorMetrics.total % 10 === 0) {
    fetch("/api/sw-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...errorMetrics,
        timestamp: Date.now(),
        userAgent: self.navigator.userAgent,
      }),
    }).catch(() => {}); // Silently fail metrics reporting
  }
}

// Periodic cache cleanup
setInterval(
  () => {
    if (!navigator.onLine) return;

    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map(async (cacheName) => {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();

            // Remove old entries
            const now = Date.now();
            for (const request of requests) {
              const response = await cache.match(request);
              if (response) {
                const dateHeader = response.headers.get("date");
                if (dateHeader) {
                  const age = now - new Date(dateHeader).getTime();
                  if (age > CACHE_CONFIG.maxAge) {
                    await cache.delete(request);
                    console.log(
                      `Service Worker: Removed stale cache entry: ${request.url}`,
                    );
                  }
                }
              }
            }
          }),
        );
      })
      .catch((error) => {
        console.error("Service Worker: Cache cleanup failed", error);
      });
  },
  60 * 60 * 1000,
); // Run every hour

// Export for TypeScript
export {};

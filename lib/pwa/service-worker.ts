// Service Worker for Progressive Web App
// Handles offline functionality, caching, and background sync

/// <reference path="../../types/service-worker.d.ts" />

// Service Worker type declarations
declare const self: ServiceWorkerGlobalScope;

// Cache names with versioning
const CACHE_NAME = "estimatepro-v1";
const STATIC_CACHE_NAME = "estimatepro-static-v1";
const DYNAMIC_CACHE_NAME = "estimatepro-dynamic-v1";
const DATA_CACHE_NAME = "estimatepro-data-v1";

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

// Install event - cache static assets
self.addEventListener("install", (event: ExtendableEvent) => {
  console.log("Service Worker: Installing");

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log("Service Worker: Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(DATA_CACHE_NAME).then((cache) => {
        console.log("Service Worker: Preparing data cache");
        return cache.put("/api/offline-data", new Response("{}"));
      }),
    ]),
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
  const cache = await caches.open(STATIC_CACHE_NAME);

  // Skip caching for unsupported URL schemes
  const url = new URL(request.url);
  if (!url.protocol.startsWith("http")) {
    console.log("Service Worker: Skipping unsupported scheme:", url.protocol);
    try {
      return await fetch(request);
    } catch (error) {
      return new Response("Asset not available", { status: 503 });
    }
  }

  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Only cache successful responses
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error("Service Worker: Failed to fetch static asset", error);

    // In development, don't return 503 for static assets
    if (isDevelopment) {
      // Just let it fail naturally without service worker intervention
      throw error;
    }

    return new Response("Asset not available offline", { status: 503 });
  }
}

async function handleAPIRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const cache = await caches.open(DATA_CACHE_NAME);

  // Check if this is a cacheable API
  const isCacheable = CACHEABLE_APIS.some((api) =>
    url.pathname.startsWith(api),
  );

  if (isCacheable) {
    // Try network first, fallback to cache
    try {
      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      console.log("Service Worker: Network failed, trying cache for API");
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Return offline response for cacheable APIs
      return new Response(
        JSON.stringify({
          error: "Data not available offline",
          offline: true,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } else {
    // For non-cacheable APIs, try network only
    try {
      return await fetch(request);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Network error",
          offline: true,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
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

// Background sync functions
async function syncEstimates(): Promise<void> {
  console.log("Service Worker: Syncing estimates");

  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const pendingEstimates = await cache.match("/api/pending-estimates");

    if (pendingEstimates) {
      const estimates = await pendingEstimates.json();

      for (const estimate of estimates) {
        try {
          const response = await fetch("/api/estimates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(estimate),
          });

          if (response.ok) {
            console.log("Service Worker: Estimate synced successfully");
          }
        } catch (error) {
          console.error("Service Worker: Failed to sync estimate", error);
        }
      }
    }
  } catch (error) {
    console.error("Service Worker: Estimate sync failed", error);
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

// Export for TypeScript
export {};

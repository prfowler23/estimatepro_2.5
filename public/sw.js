// Service Worker - Compiled from TypeScript
// This file is auto-generated from lib/pwa/service-worker.ts

const CACHE_NAME = "estimatepro-v1";
const STATIC_CACHE_NAME = "estimatepro-static-v1";
const DYNAMIC_CACHE_NAME = "estimatepro-dynamic-v1";
const DATA_CACHE_NAME = "estimatepro-data-v1";

const STATIC_ASSETS = ["/", "/manifest.json"];

const CACHEABLE_APIS = [
  "/api/estimates",
  "/api/customers",
  "/api/calculations",
  "/api/analytics/enhanced",
  "/api/vendors",
  "/api/pilots",
  "/api/equipment-materials",
  "/api/ai/assistant",
];

const SYNC_TAGS = {
  ESTIMATE_SYNC: "estimate-sync",
  CUSTOMER_SYNC: "customer-sync",
  PHOTO_UPLOAD: "photo-upload",
  OFFLINE_ACTIONS: "offline-actions",
  VENDOR_SYNC: "vendor-sync",
  PILOT_SYNC: "pilot-sync",
  AI_ASSISTANT_SYNC: "ai-assistant-sync",
};

// Check if we're in development mode
const isDevelopment =
  self.location.hostname === "localhost" ||
  self.location.hostname === "127.0.0.1" ||
  self.location.hostname.includes("localhost");

// Install event
self.addEventListener("install", (event) => {
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

  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
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

  self.clients.claim();
});

// Fetch event
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

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
self.addEventListener("sync", (event) => {
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
    case SYNC_TAGS.VENDOR_SYNC:
      event.waitUntil(syncVendorData());
      break;
    case SYNC_TAGS.PILOT_SYNC:
      event.waitUntil(syncPilotData());
      break;
    case SYNC_TAGS.AI_ASSISTANT_SYNC:
      event.waitUntil(syncAIAssistantData());
      break;
  }
});

// Push notification event
self.addEventListener("push", (event) => {
  console.log("Service Worker: Push notification received");

  const options = {
    body: event.data?.text() || "New notification",
    icon: "/icon-192x192.png",
    badge: "/icon-72x72.png",
    vibrate: [200, 100, 200],
    data: {
      url: "/",
    },
    actions: [
      {
        action: "open",
        title: "Open App",
        icon: "/icon-192x192.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icon-192x192.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("EstimatePro", options));
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Notification clicked");

  event.notification.close();

  if (event.action === "open") {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url || "/"),
    );
  }
});

// Message event
self.addEventListener("message", (event) => {
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
    case "CLEAR_CACHE":
      event.waitUntil(clearCache());
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
function isStaticAsset(url) {
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

function isAPIRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isPageRequest(url) {
  return !isStaticAsset(url) && !isAPIRequest(url);
}

async function handleStaticAsset(request) {
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

async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const cache = await caches.open(DATA_CACHE_NAME);

  const isCacheable = CACHEABLE_APIS.some((api) =>
    url.pathname.startsWith(api),
  );

  if (isCacheable) {
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

async function handlePageRequest(request) {
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
            button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
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

async function handleDefaultRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response("Request failed", { status: 503 });
  }
}

// Background sync functions
async function syncEstimates() {
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

async function syncCustomers() {
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

async function syncPhotoUploads() {
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

async function syncOfflineActions() {
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
async function cacheEstimate(estimate) {
  const cache = await caches.open(DATA_CACHE_NAME);
  const cacheKey = `/api/estimates/${estimate.id}`;

  await cache.put(
    cacheKey,
    new Response(JSON.stringify(estimate), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function cacheCustomer(customer) {
  const cache = await caches.open(DATA_CACHE_NAME);
  const cacheKey = `/api/customers/${customer.id}`;

  await cache.put(
    cacheKey,
    new Response(JSON.stringify(customer), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
}

async function syncVendorData() {
  console.log("Service Worker: Syncing vendor data");

  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const pendingVendors = await cache.match("/api/pending-vendors");

    if (pendingVendors) {
      const vendors = await pendingVendors.json();

      for (const vendor of vendors) {
        try {
          const response = await fetch("/api/vendors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(vendor),
          });

          if (response.ok) {
            console.log("Service Worker: Vendor synced successfully");
          }
        } catch (error) {
          console.error("Service Worker: Failed to sync vendor", error);
        }
      }
    }
  } catch (error) {
    console.error("Service Worker: Vendor sync failed", error);
  }
}

async function syncPilotData() {
  console.log("Service Worker: Syncing pilot certification data");

  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const pendingPilots = await cache.match("/api/pending-pilots");

    if (pendingPilots) {
      const pilots = await pendingPilots.json();

      for (const pilot of pilots) {
        try {
          const response = await fetch("/api/pilots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pilot),
          });

          if (response.ok) {
            console.log("Service Worker: Pilot data synced successfully");
          }
        } catch (error) {
          console.error("Service Worker: Failed to sync pilot data", error);
        }
      }
    }
  } catch (error) {
    console.error("Service Worker: Pilot sync failed", error);
  }
}

async function syncAIAssistantData() {
  console.log("Service Worker: Syncing AI assistant interactions");

  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const pendingInteractions = await cache.match(
      "/api/pending-ai-interactions",
    );

    if (pendingInteractions) {
      const interactions = await pendingInteractions.json();

      for (const interaction of interactions) {
        try {
          const response = await fetch("/api/ai/assistant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(interaction),
          });

          if (response.ok) {
            console.log("Service Worker: AI interaction synced successfully");
          }
        } catch (error) {
          console.error("Service Worker: Failed to sync AI interaction", error);
        }
      }
    }
  } catch (error) {
    console.error("Service Worker: AI assistant sync failed", error);
  }
}

async function syncAllData() {
  await Promise.all([
    syncEstimates(),
    syncCustomers(),
    syncPhotoUploads(),
    syncOfflineActions(),
    syncVendorData(),
    syncPilotData(),
    syncAIAssistantData(),
  ]);
}

async function getCacheStatus() {
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

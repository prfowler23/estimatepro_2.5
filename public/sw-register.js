// Service Worker Registration Script
// This script registers the service worker and initializes PWA functionality

// Temporarily disable service worker in development
const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.includes("localhost");

if ("serviceWorker" in navigator && !isDevelopment) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      console.log("SW registered: ", registration);

      // Handle service worker updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New content is available, prompt user to reload
              if (confirm("New version available! Click OK to reload.")) {
                window.location.reload();
              }
            }
          });
        }
      });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener("message", (event) => {
        console.log("Message from SW:", event.data);

        // Handle different message types
        const { type, payload } = event.data || {};

        switch (type) {
          case "CACHE_UPDATED":
            console.log("Cache updated:", payload);
            break;
          case "OFFLINE_MODE":
            console.log("App is now offline");
            break;
          case "ONLINE_MODE":
            console.log("App is now online");
            break;
          default:
            // Handle messages without type safely
            break;
        }
      });

      // Handle service worker errors
      registration.addEventListener("error", (error) => {
        console.error("Service Worker error:", error);
      });

      // Periodically check for updates
      setInterval(() => {
        registration.update().catch(console.error);
      }, 60000); // Check every minute
    } catch (registrationError) {
      console.log("SW registration failed: ", registrationError);

      // Retry registration after a delay if it fails
      setTimeout(() => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then(() => console.log("SW registered on retry"))
          .catch(() => console.log("SW retry failed - continuing without SW"));
      }, 5000);
    }
  });

  // Handle offline/online events
  window.addEventListener("online", () => {
    console.log("Application is online");
  });

  window.addEventListener("offline", () => {
    console.log("Application is offline");
  });
} else if (isDevelopment) {
  console.log("Service Worker disabled in development mode");

  // Unregister any existing service workers in development
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      for (let registration of registrations) {
        console.log("Unregistering existing service worker");
        registration.unregister();
      }
    });
  }
}

// Initialize offline manager when available
if (typeof window !== "undefined") {
  window.addEventListener("load", async () => {
    try {
      // Import and initialize offline manager
      // Note: This will be handled by the service worker instead
      console.log("Offline manager handled by service worker");
    } catch (error) {
      console.log("Failed to initialize offline manager:", error);
    }
  });
}

// Add CSS for offline state
const style = document.createElement("style");
style.textContent = `
  .offline {
    filter: grayscale(0.2);
  }
  
  .offline::before {
    content: "You're offline";
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #dc2626;
    color: white;
    text-align: center;
    padding: 0.5rem;
    font-size: 0.875rem;
    z-index: 9999;
  }
`;
document.head.appendChild(style);

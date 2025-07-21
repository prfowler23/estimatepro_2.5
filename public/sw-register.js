// Service Worker Registration Script
// This script registers the service worker and initializes PWA functionality

if ("serviceWorker" in navigator) {
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
        const { type, payload } = event.data;

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
        }
      });
    } catch (registrationError) {
      console.log("SW registration failed: ", registrationError);
    }
  });
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

// Handle offline/online events
window.addEventListener("online", () => {
  console.log("App is online");
  document.body.classList.remove("offline");
});

window.addEventListener("offline", () => {
  console.log("App is offline");
  document.body.classList.add("offline");
});

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

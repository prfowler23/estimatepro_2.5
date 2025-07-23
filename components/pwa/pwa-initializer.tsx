// PHASE 3 FIX: PWA Initializer Component - Handles PWA setup on app load
"use client";

import { useEffect } from "react";
import { pwaService } from "@/lib/pwa/pwa-service";
import { offlineManager } from "@/lib/pwa/offline-manager";

export function PWAInitializer() {
  useEffect(() => {
    const initializePWA = async () => {
      try {
        // Initialize PWA services
        await pwaService.initialize();

        // Initialize offline manager
        offlineManager.initialize();

        console.log("PWA services initialized successfully");
      } catch (error) {
        console.error("Failed to initialize PWA services:", error);
      }
    };

    // Initialize PWA only in browser environment
    if (typeof window !== "undefined") {
      initializePWA();
    }
  }, []);

  // This component doesn't render anything, it just initializes services
  return null;
}

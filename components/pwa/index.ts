/**
 * PWA Components Export Index
 * Centralized exports for all Progressive Web App components
 */

export { InstallPrompt } from "./InstallPrompt";
export { PWAStatusDashboard } from "./PWAStatusDashboard";

// Re-export existing PWA components
export { default as PWAStatus } from "../pwa/pwa-status";
export { default as PWAInitializer } from "../pwa/pwa-initializer";
export { default as OfflineIndicator } from "../pwa/offline-indicator";
export { default as InstallPromptLegacy } from "../pwa/install-prompt";

// Re-export PWA services
export { pwaService } from "@/lib/pwa/pwa-service";
export { advancedOfflineManager } from "@/lib/pwa/advanced-offline-manager";
export { pushNotificationManager } from "@/lib/pwa/push-notification-manager";
export { backgroundSyncManager } from "@/lib/pwa/background-sync-manager";

// Re-export types
export type { PWAConfig, PWAStatus } from "@/lib/pwa/types";

// PWA Type Definitions and Guards
// Comprehensive type safety for PWA implementation

// Enum types for better type safety
export enum CacheStrategy {
  CacheFirst = "cache-first",
  NetworkFirst = "network-first",
  StaleWhileRevalidate = "stale-while-revalidate",
  NetworkOnly = "network-only",
  CacheOnly = "cache-only",
}

export enum NetworkStatus {
  Online = "online",
  Offline = "offline",
  Slow = "slow",
}

export enum ActionType {
  Estimate = "estimate",
  Customer = "customer",
  Photo = "photo",
  Generic = "generic",
}

export enum SyncTag {
  EstimateSync = "estimate-sync",
  CustomerSync = "customer-sync",
  PhotoUpload = "photo-upload",
  OfflineActions = "offline-actions",
}

export enum ServiceWorkerMessageType {
  SkipWaiting = "SKIP_WAITING",
  ClaimClients = "CLAIM_CLIENTS",
  ClearCache = "CLEAR_CACHE",
  CacheEstimate = "CACHE_ESTIMATE",
  CacheCustomer = "CACHE_CUSTOMER",
  SyncData = "SYNC_DATA",
  GetCacheStatus = "GET_CACHE_STATUS",
  UpdateAvailable = "UPDATE_AVAILABLE",
}

// Enhanced type definitions with strict typing
export interface OfflineAction {
  readonly id: string;
  readonly type: ActionType;
  readonly endpoint: string;
  readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  readonly data: unknown;
  readonly timestamp: number;
  retryCount: number;
  readonly maxRetries: number;
  readonly metadata?: {
    readonly estimateId?: string;
    readonly customerId?: string;
    readonly description?: string;
    readonly priority?: "low" | "normal" | "high";
  };
}

export interface OfflineStatus {
  readonly isOnline: boolean;
  readonly pendingActions: number;
  readonly lastSync: Date | null;
  readonly syncInProgress: boolean;
  readonly queueSize: number;
  readonly storageUsed: number;
  readonly errorCount?: number;
  readonly successRate?: number;
}

export interface PWAConfig {
  readonly enabled: boolean;
  readonly offlineMode: boolean;
  readonly backgroundSync: boolean;
  readonly pushNotifications: boolean;
  readonly autoUpdate: boolean;
  readonly cacheStrategies: {
    readonly images: CacheStrategy;
    readonly api: CacheStrategy;
    readonly documents: CacheStrategy;
  };
  readonly offlinePages: readonly string[];
  readonly criticalResources: readonly string[];
  readonly maxCacheSize?: number;
  readonly maxCacheAge?: number;
}

export interface PWAStatus {
  readonly isInstalled: boolean;
  readonly isStandalone: boolean;
  readonly isOfflineReady: boolean;
  readonly hasServiceWorker: boolean;
  readonly hasPushPermission: boolean;
  readonly updateAvailable: boolean;
  readonly networkStatus: NetworkStatus;
  readonly cacheStatus: {
    readonly totalSize: number;
    readonly itemCount: number;
    readonly lastCleared: Date | null;
  };
  readonly version?: string;
}

export interface CacheEntry<T = unknown> {
  readonly data: T;
  readonly timestamp: number;
  readonly ttl: number;
  readonly version: string;
  readonly tags: readonly string[];
  readonly compressed?: boolean;
  readonly metadata?: Record<string, unknown>;
}

export interface ServiceWorkerMessage {
  readonly type: ServiceWorkerMessageType;
  readonly payload?: unknown;
  readonly timestamp?: number;
}

export interface SyncResult {
  readonly success: number;
  readonly failed: number;
  readonly errors: ReadonlyArray<Error>;
  readonly timestamp: Date;
}

// Type guards
export function isOfflineAction(value: unknown): value is OfflineAction {
  if (!value || typeof value !== "object") return false;

  const action = value as Record<string, unknown>;
  return (
    typeof action.id === "string" &&
    Object.values(ActionType).includes(action.type as ActionType) &&
    typeof action.endpoint === "string" &&
    ["GET", "POST", "PUT", "DELETE", "PATCH"].includes(
      action.method as string,
    ) &&
    typeof action.timestamp === "number" &&
    typeof action.retryCount === "number" &&
    typeof action.maxRetries === "number"
  );
}

export function isPWAConfig(value: unknown): value is PWAConfig {
  if (!value || typeof value !== "object") return false;

  const config = value as Record<string, unknown>;
  return (
    typeof config.enabled === "boolean" &&
    typeof config.offlineMode === "boolean" &&
    typeof config.backgroundSync === "boolean" &&
    typeof config.pushNotifications === "boolean" &&
    typeof config.autoUpdate === "boolean" &&
    config.cacheStrategies !== null &&
    typeof config.cacheStrategies === "object" &&
    Array.isArray(config.offlinePages) &&
    Array.isArray(config.criticalResources)
  );
}

export function isServiceWorkerMessage(
  value: unknown,
): value is ServiceWorkerMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;
  return Object.values(ServiceWorkerMessageType).includes(
    message.type as ServiceWorkerMessageType,
  );
}

export function isCacheStrategy(value: unknown): value is CacheStrategy {
  return Object.values(CacheStrategy).includes(value as CacheStrategy);
}

// Utility types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};

export type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : never;

// Error types
export class PWAError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PWAError";
  }
}

export class OfflineError extends PWAError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "OFFLINE_ERROR", context);
    this.name = "OfflineError";
  }
}

export class CacheError extends PWAError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "CACHE_ERROR", context);
    this.name = "CacheError";
  }
}

export class SyncError extends PWAError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "SYNC_ERROR", context);
    this.name = "SyncError";
  }
}

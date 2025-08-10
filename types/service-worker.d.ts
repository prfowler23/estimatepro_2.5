/**
 * Service Worker Type Definitions
 * Provides type definitions for service worker APIs including
 * fetch, sync, push, and notification events
 */

declare global {
  interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
    clients: Clients;
    registration: ServiceWorkerRegistration;
    skipWaiting(): Promise<void>;
  }

  interface ExtendableEvent extends Event {
    /**
     * Extends the lifetime of the event
     * @param promise Promise to wait for
     */
    waitUntil(promise: Promise<unknown>): void;
  }

  interface FetchEvent extends ExtendableEvent {
    readonly request: Request;
    readonly clientId: string;
    readonly preloadResponse: Promise<Response>;
    respondWith(response: Promise<Response> | Response): void;
  }

  interface SyncEvent extends ExtendableEvent {
    readonly tag: string;
    readonly lastChance: boolean;
  }

  interface PushEvent extends ExtendableEvent {
    readonly data: PushMessageData | null;
  }

  interface PushMessageData {
    arrayBuffer(): ArrayBuffer;
    blob(): Blob;
    json<T = unknown>(): T;
    text(): string;
  }

  interface NotificationEvent extends ExtendableEvent {
    readonly notification: Notification;
    readonly action: string;
    readonly reply?: string;
  }

  interface ExtendableMessageEvent extends ExtendableEvent {
    readonly data: unknown;
    readonly origin: string;
    readonly lastEventId: string;
    readonly source: Client | ServiceWorker | MessagePort | null;
    readonly ports: MessagePort[];
  }

  interface BackgroundSyncEvent extends ExtendableEvent {
    readonly tag: string;
  }

  interface PeriodicSyncEvent extends ExtendableEvent {
    readonly tag: string;
  }
}

// Make sure this is treated as a module
export {};

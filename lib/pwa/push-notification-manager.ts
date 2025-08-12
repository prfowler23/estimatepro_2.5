/**
 * Push Notification Manager
 * Comprehensive push notification system with rich content and actions
 */

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface RichNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationManager {
  private static instance: PushNotificationManager;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private pushSubscription: PushSubscription | null = null;

  private constructor() {
    this.setupMessageHandlers();
  }

  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager();
    }
    return PushNotificationManager.instance;
  }

  async initialize(registration: ServiceWorkerRegistration): Promise<void> {
    this.serviceWorkerRegistration = registration;

    // Check existing subscription
    this.pushSubscription = await registration.pushManager.getSubscription();

    this.log("Push notification manager initialized", "info");
  }

  // Request notification permission with user-friendly prompt
  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      throw new Error("Notifications not supported");
    }

    if (Notification.permission === "granted") {
      return "granted";
    }

    if (Notification.permission === "denied") {
      throw new Error("Notification permission denied");
    }

    // Show user-friendly prompt first
    const userWantsNotifications = await this.showPermissionPrompt();

    if (!userWantsNotifications) {
      return "default";
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      await this.subscribeToPush();
    }

    return permission;
  }

  private async showPermissionPrompt(): Promise<boolean> {
    return new Promise((resolve) => {
      // Create a custom modal or use existing UI system
      const modal = this.createPermissionModal();
      document.body.appendChild(modal);

      const allowBtn = modal.querySelector('[data-action="allow"]');
      const denyBtn = modal.querySelector('[data-action="deny"]');

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      allowBtn?.addEventListener("click", () => {
        cleanup();
        resolve(true);
      });

      denyBtn?.addEventListener("click", () => {
        cleanup();
        resolve(false);
      });
    });
  }

  private createPermissionModal(): HTMLElement {
    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50";
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-4">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5V3h0z"></path>
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-lg">Stay Updated</h3>
            <p class="text-gray-600 text-sm">Get notified about estimate updates</p>
          </div>
        </div>
        
        <div class="mb-6">
          <ul class="text-sm text-gray-700 space-y-2">
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Estimate status updates
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Important sync notifications
            </li>
            <li class="flex items-center">
              <svg class="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              System updates available
            </li>
          </ul>
        </div>
        
        <div class="flex space-x-3">
          <button 
            data-action="allow"
            class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Allow Notifications
          </button>
          <button 
            data-action="deny"
            class="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    `;
    return modal;
  }

  // Subscribe to push notifications
  async subscribeToPush(): Promise<PushSubscriptionData | null> {
    if (!this.serviceWorkerRegistration) {
      throw new Error("Service Worker not registered");
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      this.log("VAPID public key not configured", "warning");
      return null;
    }

    try {
      this.pushSubscription =
        await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
        });

      const subscriptionData = this.extractSubscriptionData(
        this.pushSubscription,
      );

      // Send subscription to server
      await this.sendSubscriptionToServer(subscriptionData);

      this.log("Push subscription created successfully", "success");
      return subscriptionData;
    } catch (error) {
      this.log(`Failed to subscribe to push: ${error.message}`, "error");
      return null;
    }
  }

  private extractSubscriptionData(
    subscription: PushSubscription,
  ): PushSubscriptionData {
    const keys = subscription.getKey("p256dh");
    const auth = subscription.getKey("auth");

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: keys ? btoa(String.fromCharCode(...new Uint8Array(keys))) : "",
        auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : "",
      },
    };
  }

  private async sendSubscriptionToServer(
    subscription: PushSubscriptionData,
  ): Promise<void> {
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
    });
  }

  // Show local notification with rich content
  async showNotification(notification: RichNotification): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      throw new Error("Service Worker not registered");
    }

    if (Notification.permission !== "granted") {
      throw new Error("Notification permission not granted");
    }

    const options: NotificationOptions = {
      body: notification.body,
      icon: notification.icon || "/icon-192x192.svg",
      badge: notification.badge || "/icon-72x72.svg",
      image: notification.image,
      tag: notification.tag,
      data: notification.data,
      actions: notification.actions,
      requireInteraction: notification.requireInteraction,
      silent: notification.silent,
      vibrate: notification.vibrate || [200, 100, 200],
    };

    await this.serviceWorkerRegistration.showNotification(
      notification.title,
      options,
    );
    this.log(`Notification shown: ${notification.title}`, "info");
  }

  // Send push notification from server
  async sendPushNotification(
    userId: string,
    notification: RichNotification,
  ): Promise<void> {
    await fetch("/api/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        notification,
      }),
    });
  }

  // Setup notification action handlers
  private setupMessageHandlers(): void {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        const { type, data } = event.data;

        switch (type) {
          case "NOTIFICATION_CLICK":
            this.handleNotificationClick(data);
            break;

          case "NOTIFICATION_ACTION":
            this.handleNotificationAction(data);
            break;
        }
      });
    }
  }

  private handleNotificationClick(data: any): void {
    // Navigate to relevant page based on notification data
    if (data.url) {
      window.location.href = data.url;
    } else if (data.estimateId) {
      window.location.href = `/estimates/${data.estimateId}`;
    } else {
      window.location.href = "/dashboard";
    }
  }

  private handleNotificationAction(data: any): void {
    const { action, notificationData } = data;

    switch (action) {
      case "view":
        this.handleNotificationClick(notificationData);
        break;

      case "dismiss":
        // Just dismiss, no action needed
        break;

      case "archive":
        // Handle archive action
        this.archiveNotification(notificationData);
        break;

      default:
        this.log(`Unknown notification action: ${action}`, "warning");
    }
  }

  private async archiveNotification(data: any): Promise<void> {
    // Implement archive functionality
    if (data.estimateId) {
      await fetch(`/api/estimates/${data.estimateId}/archive`, {
        method: "POST",
      });
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<void> {
    if (this.pushSubscription) {
      await this.pushSubscription.unsubscribe();
      this.pushSubscription = null;

      // Notify server
      await fetch("/api/push/unsubscribe", {
        method: "POST",
      });

      this.log("Push subscription removed", "info");
    }
  }

  // Utility functions
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Get subscription status
  getSubscriptionStatus(): {
    hasPermission: boolean;
    isSubscribed: boolean;
    subscription: PushSubscriptionData | null;
  } {
    return {
      hasPermission: Notification.permission === "granted",
      isSubscribed: this.pushSubscription !== null,
      subscription: this.pushSubscription
        ? this.extractSubscriptionData(this.pushSubscription)
        : null,
    };
  }

  private log(message: string, level: string): void {
    console.log(`[PushNotificationManager] ${message}`);
  }
}

export const pushNotificationManager = PushNotificationManager.getInstance();

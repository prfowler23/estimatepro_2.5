# PWA Capabilities Guide

## Overview

EstimatePro's Progressive Web App (PWA) capabilities provide a native app experience with advanced offline functionality, push notifications, background sync, and mobile optimizations.

## Core Features

### 1. Advanced Offline Functionality

**Advanced Offline Manager** (`lib/pwa/advanced-offline-manager.ts`)

- Intelligent operation queuing with priority levels
- Smart conflict resolution strategies
- Dependency tracking and resolution
- Exponential backoff retry logic
- Cross-device sync capabilities

**Usage:**

```typescript
import { advancedOfflineManager } from "@/lib/pwa/advanced-offline-manager";

// Queue a critical operation
await advancedOfflineManager.queueOperation({
  type: "update",
  entity: "estimates",
  data: estimateData,
  priority: "critical",
  dependencies: ["photos", "calculations"],
});
```

### 2. Push Notifications

**Push Notification Manager** (`lib/pwa/push-notification-manager.ts`)

- Rich notification content with actions
- User-friendly permission requests
- VAPID key support for secure messaging
- Custom notification handlers
- Batch notification processing

**Setup:**

```typescript
import { pushNotificationManager } from "@/lib/pwa/push-notification-manager";

// Initialize and request permission
await pushNotificationManager.requestPermission();

// Send rich notification
await pushNotificationManager.showNotification({
  title: "Estimate Updated",
  body: "Your estimate #12345 has been approved",
  icon: "/icon-192x192.svg",
  actions: [
    { action: "view", title: "View Estimate" },
    { action: "archive", title: "Archive" },
  ],
  data: { estimateId: "12345" },
});
```

### 3. Background Sync

**Background Sync Manager** (`lib/pwa/background-sync-manager.ts`)

- Critical operation synchronization
- Photo upload management
- Analytics data batching
- Calculation sync with priority handling
- Automatic retry with exponential backoff

**Implementation:**

```typescript
import { backgroundSyncManager } from "@/lib/pwa/background-sync-manager";

// Schedule background sync for photos
await backgroundSyncManager.scheduleSync(
  "sync-photos",
  {
    estimateId: "12345",
    photos: photoData,
  },
  "high",
);
```

### 4. Enhanced Install Experience

**Install Prompt Component** (`components/pwa/InstallPrompt.tsx`)

- Beautiful, informative installation UI
- Feature highlights and benefits
- Installation progress tracking
- Smart timing for non-intrusive prompts
- Cross-platform compatibility

**Integration:**

```tsx
import InstallPrompt from "@/components/pwa/InstallPrompt";

function App() {
  return (
    <div>
      <InstallPrompt
        onInstall={() => console.log("App installed!")}
        onDismiss={() => console.log("Install dismissed")}
      />
      {/* Your app content */}
    </div>
  );
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# PWA Configuration
NEXT_PUBLIC_PWA_ENABLED=true
NEXT_PUBLIC_OFFLINE_ENABLED=true
NEXT_PUBLIC_PUSH_ENABLED=true

# Service Worker
NEXT_PUBLIC_SW_ENABLED=true
SW_DEBUG=false

# Background Sync
NEXT_PUBLIC_BACKGROUND_SYNC=true
SYNC_RETRY_ATTEMPTS=5
SYNC_RETRY_DELAY=2000
```

## PWA Scripts

### Development Scripts

```bash
# Start PWA development server
npm run pwa:dev

# Build PWA with optimizations
npm run pwa:build

# Start production PWA server
npm run pwa:start
```

### Analysis and Testing Scripts

```bash
# Audit PWA compliance
npm run pwa:audit

# Test offline functionality
npm run pwa:test-offline

# Analyze PWA performance
npm run pwa:analyze

# Validate manifest and service worker
npm run pwa:validate
```

## Implementation Guide

### 1. Initialize PWA Services

```typescript
// In your main App component or _app.tsx
import { pwaService } from "@/lib/pwa/pwa-service";
import { advancedOfflineManager } from "@/lib/pwa/advanced-offline-manager";
import { pushNotificationManager } from "@/lib/pwa/push-notification-manager";
import { backgroundSyncManager } from "@/lib/pwa/background-sync-manager";

useEffect(() => {
  const initializePWA = async () => {
    // Initialize core PWA service
    await pwaService.initialize();

    // Load offline operations queue
    await advancedOfflineManager.loadPersistedQueue();

    // Setup service worker registration
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;

      // Initialize push notifications
      await pushNotificationManager.initialize(registration);

      // Initialize background sync
      await backgroundSyncManager.initialize(registration);
    }
  };

  initializePWA();
}, []);
```

### 2. Handle Offline Operations

```typescript
// In your estimate service
const saveEstimate = async (estimateData) => {
  try {
    if (navigator.onLine) {
      // Try immediate save
      const response = await fetch("/api/estimates", {
        method: "POST",
        body: JSON.stringify(estimateData),
      });

      if (!response.ok) throw new Error("Network error");
      return response.json();
    } else {
      // Queue for offline sync
      const operationId = await advancedOfflineManager.queueOperation({
        type: "create",
        entity: "estimates",
        data: estimateData,
        priority: "high",
      });

      return { id: operationId, status: "queued" };
    }
  } catch (error) {
    // Fallback to offline queue
    return await advancedOfflineManager.queueOperation({
      type: "create",
      entity: "estimates",
      data: estimateData,
      priority: "high",
    });
  }
};
```

### 3. Implement Push Notifications

```typescript
// Request permission on user action
const enableNotifications = async () => {
  try {
    const permission = await pushNotificationManager.requestPermission();

    if (permission === "granted") {
      // Show success message
      await pushNotificationManager.showNotification({
        title: "Notifications Enabled",
        body: "You'll receive updates about your estimates",
        tag: "notification-enabled",
      });
    }
  } catch (error) {
    console.error("Failed to enable notifications:", error);
  }
};
```

## Performance Optimization

### Caching Strategies

1. **Critical Resources**: Cache-first strategy
2. **API Responses**: Network-first with fallback
3. **Images**: Cache-first with size limits
4. **Documents**: Stale-while-revalidate

### Memory Management

- Automatic cleanup of expired cache entries
- Intelligent queue size management
- Background sync task prioritization
- Resource usage monitoring

### Network Optimization

- Smart retry logic with exponential backoff
- Connection quality detection
- Adaptive sync strategies based on network speed
- Batch operation processing

## Testing

### Unit Tests

```bash
# Test offline manager
npm test -- --testPathPattern=advanced-offline-manager

# Test push notifications
npm test -- --testPathPattern=push-notification-manager

# Test background sync
npm test -- --testPathPattern=background-sync-manager
```

### Integration Tests

```bash
# Test complete offline flow
npm run test:integration -- --testNamePattern="offline"

# Test push notification flow
npm run test:integration -- --testNamePattern="notifications"
```

### Manual Testing

1. **Offline Functionality**:
   - Disconnect network
   - Perform estimate operations
   - Verify operations are queued
   - Reconnect and verify sync

2. **Push Notifications**:
   - Request permission
   - Send test notification
   - Verify notification actions work

3. **Install Experience**:
   - Clear browser data
   - Visit app and verify install prompt
   - Complete installation process

## Troubleshooting

### Common Issues

1. **Service Worker Not Registering**
   - Check HTTPS requirement
   - Verify service worker file exists
   - Check browser console for errors

2. **Push Notifications Not Working**
   - Verify VAPID keys are configured
   - Check notification permission status
   - Ensure HTTPS is enabled

3. **Offline Sync Failing**
   - Check localStorage availability
   - Verify API endpoints are accessible
   - Review operation queue in DevTools

### Debug Tools

```typescript
// Get PWA status
const status = pwaService.getStatus();
console.log("PWA Status:", status);

// Get offline queue statistics
const queueStats = advancedOfflineManager.getQueueStats();
console.log("Offline Queue:", queueStats);

// Get sync task status
const syncStats = backgroundSyncManager.getSyncStats();
console.log("Background Sync:", syncStats);
```

## Browser Compatibility

| Feature            | Chrome | Firefox | Safari | Edge |
| ------------------ | ------ | ------- | ------ | ---- |
| Service Worker     | ✅     | ✅      | ✅     | ✅   |
| Push Notifications | ✅     | ✅      | ✅     | ✅   |
| Background Sync    | ✅     | ❌      | ❌     | ✅   |
| Install Prompt     | ✅     | ❌      | ✅\*   | ✅   |
| Offline Support    | ✅     | ✅      | ✅     | ✅   |

\*Safari requires manual installation through share menu

## Security Considerations

1. **HTTPS Requirement**: All PWA features require HTTPS in production
2. **VAPID Keys**: Secure generation and storage of push notification keys
3. **Data Validation**: All offline data is validated before sync
4. **Permission Management**: Respectful permission requests with clear benefits
5. **Content Security Policy**: Proper CSP headers for service worker security

This comprehensive PWA system provides EstimatePro with enterprise-grade offline capabilities while maintaining excellent user experience and performance.

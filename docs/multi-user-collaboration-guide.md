# Multi-User Collaboration and Real-Time Sync System

## Overview

The EstimatePro Multi-User Collaboration system enables teams to work together on estimates in real-time, with advanced conflict resolution, presence awareness, and permission management. The system provides seamless collaboration experiences across desktop and mobile devices.

## Key Features

### 1. Real-Time Synchronization

- **Live Data Updates**: Changes are synchronized across all connected users instantly
- **Conflict Detection**: Automatic detection of concurrent edits with intelligent resolution
- **Presence Awareness**: See who's online, what they're editing, and their current step
- **Change History**: Complete audit trail of all modifications with user attribution

### 2. Advanced Permission System

- **Role-Based Access**: Owner, Editor, and Viewer roles with granular permissions
- **Field-Level Restrictions**: Control access to specific fields (e.g., pricing, expenses)
- **Step-Level Control**: Restrict access to certain workflow steps
- **Dynamic Permissions**: Permissions can be adjusted in real-time

### 3. Intelligent Conflict Resolution

- **Automatic Detection**: Smart algorithms detect conflicts before they become issues
- **Multiple Resolution Strategies**: Last-writer-wins, manual review, or automatic merging
- **Visual Conflict Interface**: Clear comparison of conflicting changes
- **Merge Assistance**: AI-powered suggestions for conflict resolution

### 4. Collaborative User Experience

- **Field-Level Indicators**: Visual feedback showing who's editing what
- **Real-Time Cursors**: See exactly where other users are working
- **Activity Feed**: Live updates on team member actions
- **Smart Notifications**: Non-intrusive alerts for important changes

## Architecture

### Core Components

#### 1. RealTimeCollaborationEngine (`lib/collaboration/real-time-engine.ts`)

Central coordination system for real-time collaboration features.

```typescript
interface CollaboratorPresence {
  userId: string;
  userEmail: string;
  userName: string;
  avatar?: string;
  currentStep: number;
  lastSeen: string;
  isActive: boolean;
  cursor?: {
    fieldId?: string;
    stepId?: string;
    position?: { x: number; y: number };
  };
  role: "owner" | "editor" | "viewer";
}

interface RealTimeChange {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  changeType:
    | "field_update"
    | "step_navigation"
    | "file_upload"
    | "calculation_update";
  stepId: string;
  fieldPath: string;
  oldValue: any;
  newValue: any;
  metadata?: {
    confidence?: number;
    isAIGenerated?: boolean;
    conflictResolved?: boolean;
  };
}
```

**Key Methods:**

- `initializeSession()`: Establish real-time connection
- `broadcastChange()`: Send changes to all collaborators
- `updatePresence()`: Update user location and status
- `detectConflict()`: Identify conflicting changes
- `resolveConflict()`: Handle conflict resolution

#### 2. CollaborationProvider (`components/collaboration/CollaborationProvider.tsx`)

React context provider managing collaboration state and actions.

```typescript
interface CollaborationContextType {
  // Session state
  session: CollaborationSession | null;
  isConnected: boolean;
  participants: CollaboratorPresence[];

  // Real-time changes
  pendingChanges: RealTimeChange[];
  conflicts: any[];
  changeHistory: RealTimeChange[];

  // Permissions
  canEdit: (fieldPath?: string) => boolean;
  canNavigateToStep: (stepNumber: number) => boolean;

  // Actions
  broadcastChange: (
    stepId: string,
    fieldPath: string,
    oldValue: any,
    newValue: any,
  ) => Promise<void>;
  inviteCollaborator: (
    email: string,
    role: "owner" | "editor" | "viewer",
  ) => Promise<void>;
  resolveConflict: (
    conflictId: string,
    resolution: string,
    mergedValue?: any,
  ) => Promise<void>;
}
```

**Features:**

- Global collaboration state management
- Real-time event handling
- Permission checking and enforcement
- Conflict resolution coordination

#### 3. CollaborativeField (`components/collaboration/CollaborativeField.tsx`)

Enhanced form field with collaboration features.

```typescript
interface CollaborativeFieldProps {
  field: string;
  value: any;
  onChange: (value: any) => void;
  type?: "text" | "textarea" | "select" | "number" | "email" | "phone" | "date";
  showCollaborationInfo?: boolean;
  debounceMs?: number;
}
```

**Collaboration Features:**

- Real-time change broadcasting
- Visual editing indicators
- Conflict highlighting
- Presence awareness
- Permission enforcement

## Database Schema

### Collaboration Tables

#### estimate_collaborators

```sql
CREATE TABLE estimate_collaborators (
  id UUID PRIMARY KEY,
  estimate_id UUID REFERENCES estimates(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### estimate_changes

```sql
CREATE TABLE estimate_changes (
  id UUID PRIMARY KEY,
  estimate_id UUID REFERENCES estimates(id),
  user_id UUID REFERENCES auth.users(id),
  change_type TEXT CHECK (change_type IN ('field_update', 'step_navigation', 'file_upload', 'calculation_update')),
  step_id TEXT NOT NULL,
  field_path TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### collaboration_sessions

```sql
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY,
  estimate_id UUID REFERENCES estimates(id),
  user_id UUID REFERENCES auth.users(id),
  presence_data JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT NOW()
);
```

### Real-Time Subscriptions

The system uses Supabase real-time subscriptions for live updates:

```typescript
// Real-time channel setup
const channel = supabase.channel(`estimate_${estimateId}`, {
  config: {
    broadcast: { self: true },
    presence: { key: userId },
  },
});

// Handle presence changes
channel.on("presence", { event: "sync" }, () => {
  const participants = extractParticipants(channel.presenceState());
  onPresenceChange(participants);
});

// Handle real-time changes
channel.on("broadcast", { event: "data_change" }, (payload) => {
  handleIncomingChange(payload.change);
});
```

## Implementation Guide

### Basic Setup

1. **Wrap your application with CollaborationProvider:**

```tsx
import { CollaborationProvider } from "@/components/collaboration/CollaborationProvider";

<CollaborationProvider
  estimateId="estimate-123"
  autoConnect={true}
  conflictResolution="manual-review"
>
  <YourEstimateComponent />
</CollaborationProvider>;
```

2. **Use collaborative fields in your forms:**

```tsx
import { CollaborativeField } from "@/components/collaboration/CollaborativeField";

<CollaborativeField
  field="customer.name"
  value={customerName}
  onChange={(value) => setCustomerName(value)}
  label="Customer Name"
  required
  stepId="initial-contact"
  showCollaborationInfo={true}
/>;
```

3. **Add collaboration awareness to your components:**

```tsx
import { useCollaboration } from "@/components/collaboration/CollaborationProvider";

function YourComponent() {
  const { isConnected, activeUsers, canEdit, broadcastChange, updatePresence } =
    useCollaboration();

  // Your component logic
}
```

### Advanced Features

#### Custom Conflict Resolution

```typescript
const handleConflictResolution = async (
  conflictId: string,
  resolution: "accept_incoming" | "keep_local" | "merge",
) => {
  if (resolution === "merge") {
    // Implement custom merge logic
    const mergedValue = await customMergeFunction(localValue, incomingValue);
    await resolveConflict(conflictId, "merge", mergedValue);
  } else {
    await resolveConflict(conflictId, resolution);
  }
};
```

#### Permission-Based UI

```tsx
function PermissionAwareComponent() {
  const { canEdit, canNavigateToStep, permissions } = useCollaboration();

  return (
    <div>
      <CollaborativeField
        field="sensitive.data"
        value={value}
        onChange={onChange}
        disabled={!canEdit("sensitive.data")}
      />

      {permissions?.canShare && <CollaboratorInviteButton />}

      <Button disabled={!canNavigateToStep(nextStep)} onClick={handleNext}>
        Continue
      </Button>
    </div>
  );
}
```

#### Real-Time Activity Monitoring

```tsx
function ActivityMonitor() {
  const { getRecentChanges, activeUsers } = useCollaboration();

  const recentChanges = getRecentChanges("customer.name");
  const activeFieldUsers = activeUsers.filter(
    (user) => user.cursor?.fieldId === "customer.name",
  );

  return (
    <div>
      {activeFieldUsers.length > 0 && (
        <div className="text-sm text-blue-600">
          {activeFieldUsers[0].userName} is editing this field
        </div>
      )}

      <RealTimeChangeIndicator
        fieldPath="customer.name"
        showHistory={true}
        maxChanges={5}
      />
    </div>
  );
}
```

## Security & Permissions

### Role-Based Access Control

```typescript
interface CollaborationPermissions {
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canDelete: boolean;
  allowedSteps: number[];
  restrictedFields: string[];
}

const getDefaultPermissions = (role: "owner" | "editor" | "viewer") => {
  switch (role) {
    case "owner":
      return {
        canEdit: true,
        canComment: true,
        canShare: true,
        canDelete: true,
        allowedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        restrictedFields: [],
      };
    case "editor":
      return {
        canEdit: true,
        canComment: true,
        canShare: false,
        canDelete: false,
        allowedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        restrictedFields: ["final_pricing"],
      };
    case "viewer":
      return {
        canEdit: false,
        canComment: true,
        canShare: false,
        canDelete: false,
        allowedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        restrictedFields: ["pricing", "expenses", "final_pricing"],
      };
  }
};
```

### Row Level Security

All collaboration tables implement comprehensive RLS policies:

```sql
-- Users can only access collaborations for estimates they have permission to view
CREATE POLICY "collaboration_access" ON estimate_collaborators
  FOR SELECT USING (
    estimate_id IN (
      SELECT id FROM estimates WHERE user_id = auth.uid()
      UNION
      SELECT estimate_id FROM estimate_collaborators WHERE user_id = auth.uid()
    )
  );

-- Only estimate owners can manage collaborators
CREATE POLICY "manage_collaborators" ON estimate_collaborators
  FOR ALL USING (
    estimate_id IN (SELECT id FROM estimates WHERE user_id = auth.uid())
  );
```

## Mobile Optimization

### Touch-Friendly Collaboration

- **Compact Avatar Display**: Space-efficient user presence indicators
- **Bottom Sheet Conflicts**: Mobile-native conflict resolution interface
- **Swipe Gestures**: Intuitive navigation through collaboration features
- **Offline Awareness**: Graceful degradation when connectivity is poor

### Responsive Design

```tsx
function MobileCollaborationHeader() {
  const { isMobile } = useMobileDetection();
  const { activeUsers, isConnected } = useCollaboration();

  if (isMobile) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-white border-b z-40 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected && (
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            )}
            <span className="text-sm font-medium">
              {activeUsers.length} collaborator
              {activeUsers.length > 1 ? "s" : ""}
            </span>
          </div>
          <CollaboratorAvatars compact maxVisible={3} />
        </div>
      </div>
    );
  }

  return <DesktopCollaborationHeader />;
}
```

## Performance Optimization

### Change Batching

```typescript
class ChangeBuffer {
  private buffer: RealTimeChange[] = [];
  private timeout: NodeJS.Timeout | null = null;

  addChange(change: RealTimeChange) {
    this.buffer.push(change);

    if (this.timeout) clearTimeout(this.timeout);

    this.timeout = setTimeout(() => {
      this.flushBuffer();
    }, 500); // Batch changes for 500ms
  }

  private async flushBuffer() {
    if (this.buffer.length === 0) return;

    const changes = [...this.buffer];
    this.buffer = [];

    await this.broadcastBatch(changes);
  }
}
```

### Selective Updates

```typescript
const handleIncomingChange = (change: RealTimeChange) => {
  // Only process changes that affect current user's view
  if (change.stepId !== currentStep && !isFieldVisible(change.fieldPath)) {
    return;
  }

  // Apply change with minimal re-renders
  updateFieldValue(change.fieldPath, change.newValue);
};
```

## Error Handling & Reliability

### Connection Management

```typescript
class ConnectionManager {
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async handleDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      await this.delay(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      );
      this.reconnectAttempts++;

      try {
        await this.reconnect();
        this.reconnectAttempts = 0;
      } catch (error) {
        console.error("Reconnection failed:", error);
        this.handleDisconnection();
      }
    } else {
      this.notifyUserOfConnectionFailure();
    }
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

### Conflict Recovery

```typescript
const handleConflictRecovery = async (change: RealTimeChange) => {
  try {
    // Attempt automatic resolution
    const autoResolution = await attemptAutoResolve(change);

    if (autoResolution.success) {
      return autoResolution.value;
    }

    // Fall back to manual resolution
    showConflictDialog(change);
  } catch (error) {
    // Last resort: queue for later resolution
    queueConflictForLater(change);
  }
};
```

## Testing Strategy

### Unit Tests

```typescript
describe("RealTimeCollaborationEngine", () => {
  test("broadcasts changes to all participants", async () => {
    const engine = new RealTimeCollaborationEngine(
      supabase,
      "test-estimate",
      "user1",
      userProfile,
    );
    const mockChannel = { send: jest.fn() };

    await engine.broadcastChange(
      "step1",
      "customer.name",
      "oldValue",
      "newValue",
    );

    expect(mockChannel.send).toHaveBeenCalledWith({
      type: "broadcast",
      event: "data_change",
      change: expect.objectContaining({
        fieldPath: "customer.name",
        newValue: "newValue",
      }),
    });
  });
});
```

### Integration Tests

```typescript
describe("Collaboration Integration", () => {
  test("handles concurrent edits without data loss", async () => {
    const user1 = await createCollaborationSession("estimate1", "user1");
    const user2 = await createCollaborationSession("estimate1", "user2");

    // Simulate concurrent edits
    await Promise.all([
      user1.broadcastChange("step1", "customer.name", "", "User1 Edit"),
      user2.broadcastChange("step1", "customer.name", "", "User2 Edit"),
    ]);

    // Verify conflict detection
    expect(user1.conflicts).toHaveLength(1);
    expect(user2.conflicts).toHaveLength(1);
  });
});
```

## Monitoring & Analytics

### Real-Time Metrics

```typescript
interface CollaborationMetrics {
  activeUsers: number;
  changesPerMinute: number;
  conflictRate: number;
  averageResolutionTime: number;
  connectionStability: number;
}

const trackCollaborationMetrics = () => {
  const metrics = {
    activeUsers: activeUsers.length,
    changesPerMinute: calculateChangesPerMinute(),
    conflictRate: calculateConflictRate(),
    averageResolutionTime: calculateAverageResolutionTime(),
    connectionStability: calculateConnectionStability(),
  };

  sendMetrics("collaboration", metrics);
};
```

### Usage Analytics

```typescript
const trackCollaborationEvent = (event: string, data: any) => {
  analytics.track("collaboration_event", {
    event,
    estimateId: currentEstimateId,
    userId: currentUser.id,
    timestamp: new Date().toISOString(),
    ...data,
  });
};

// Track key collaboration events
trackCollaborationEvent("user_joined", { role: "editor" });
trackCollaborationEvent("conflict_resolved", { resolution: "merge" });
trackCollaborationEvent("field_edited", { fieldPath: "customer.name" });
```

## Troubleshooting

### Common Issues

#### Connection Problems

- **Symptoms**: Users appear offline, changes not syncing
- **Solutions**: Check network connectivity, verify Supabase real-time configuration
- **Debug**: Monitor connection status and retry logic

#### Conflict Resolution Failures

- **Symptoms**: Conflicts not resolving, data inconsistencies
- **Solutions**: Check conflict resolution logic, verify user permissions
- **Debug**: Review conflict queue and resolution history

#### Performance Issues

- **Symptoms**: Slow updates, UI lag during collaboration
- **Solutions**: Optimize change batching, reduce real-time subscriptions
- **Debug**: Monitor change frequency and processing time

### Debug Tools

```typescript
// Enable debug mode
localStorage.setItem("collaboration-debug", "true");

// Debug collaboration state
const debugCollaboration = () => {
  console.log("Collaboration State:", {
    isConnected,
    activeUsers: activeUsers.length,
    pendingChanges: pendingChanges.length,
    conflicts: conflicts.length,
    permissions,
  });
};

// Debug real-time events
const debugRealTimeEvents = (enabled: boolean) => {
  if (enabled) {
    channel.on("*", (event) => {
      console.log("Real-time event:", event);
    });
  }
};
```

## Future Enhancements

### Planned Features

1. **Voice Collaboration**: Voice chat integration for real-time discussions
2. **Advanced Analytics**: Detailed collaboration insights and team performance metrics
3. **Workflow Automation**: AI-powered suggestion of next steps based on team activity
4. **Integration APIs**: Third-party collaboration tools integration
5. **Advanced Permissions**: Time-based access, conditional permissions

### Enhancement Roadmap

- **Q1**: Voice collaboration and screen sharing
- **Q2**: Advanced analytics dashboard
- **Q3**: AI-powered collaboration insights
- **Q4**: Enterprise-grade security and compliance features

This comprehensive collaboration system transforms EstimatePro from a single-user tool into a powerful team collaboration platform, enabling seamless real-time work while maintaining data integrity and user experience quality.

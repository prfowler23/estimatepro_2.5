# Comprehensive Error Recovery System

## Overview

The EstimatePro Error Recovery System provides intelligent, user-friendly error handling throughout the guided estimation workflow. The system automatically detects errors, provides contextual recovery options, and learns from user patterns to improve future error prevention.

## Key Features

### 1. Intelligent Error Classification

- **Automatic Error Type Detection**: Categorizes errors by type (validation, network, AI service, etc.)
- **Error Context Analysis**: Understands the user's current workflow context
- **Pattern Recognition**: Identifies repeated errors and user struggle indicators
- **Severity Assessment**: Determines error criticality and recovery urgency

### 2. Smart Recovery Actions

- **Automatic Recovery**: Attempts self-healing for certain error types
- **Guided Manual Recovery**: Provides step-by-step recovery instructions
- **Contextual Help Integration**: Links with the help system for targeted assistance
- **Multiple Recovery Paths**: Offers various recovery options based on user experience

### 3. User Experience Enhancements

- **Non-Intrusive Notifications**: Smart error notifications that don't disrupt workflow
- **Progressive Recovery**: Escalates from auto-recovery to manual assistance
- **Error Prevention Tips**: Provides proactive guidance to prevent future issues
- **Adaptive Messaging**: Adjusts error messages based on user experience level

## System Architecture

### Core Components

#### 1. ErrorRecoveryEngine (`lib/error/error-recovery-engine.ts`)

Central intelligence for error processing and recovery strategy generation.

```typescript
interface ErrorContext {
  errorType: ErrorType;
  errorCode: string;
  originalError: Error | string;
  stepId: string;
  stepNumber: number;
  fieldId?: string;
  userId: string;
  flowData: GuidedFlowData;
  userBehavior?: {
    previousErrors: string[];
    timeOnStep: number;
    attemptCount: number;
  };
}

interface ErrorMessage {
  id: string;
  title: string;
  message: string;
  severity: "error" | "warning" | "info";
  category: ErrorCategory;
  isRecoverable: boolean;
  canRetry: boolean;
  userFriendly: string;
  technicalDetails?: string;
  helpContent?: HelpContent;
  recoveryActions: ErrorRecoveryAction[];
  preventionTips?: string[];
}
```

**Key Methods:**

- `processError(context)`: Analyzes error and generates recovery strategies
- `analyzeErrorPatterns(userId, stepId)`: Identifies user struggle patterns
- `generateRecoveryActions(context, patterns)`: Creates contextual recovery options
- `generateContextualHelp(context)`: Provides targeted help content

#### 2. ErrorBoundary (`components/error/ErrorBoundary.tsx`)

React error boundary with intelligent error recovery capabilities.

```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  stepId?: string;
  stepNumber?: number;
  userId?: string;
  flowData?: any;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolateErrors?: boolean;
}
```

**Features:**

- Catches unhandled React errors
- Categorizes errors automatically
- Provides immediate recovery options
- Logs errors to analytics systems
- Supports custom fallback UI

#### 3. ErrorRecoveryProvider (`components/error/ErrorRecoveryProvider.tsx`)

React context provider for error recovery state management.

```typescript
interface ErrorRecoveryContextType {
  currentError: ErrorMessage | null;
  isRecovering: boolean;
  recoveryAttempts: number;
  reportError: (
    error: Error | string,
    context?: Partial<ErrorContext>,
  ) => Promise<void>;
  clearError: () => void;
  retryLastAction: () => void;
  executeRecoveryAction: (actionId: string) => Promise<boolean>;
  startAutoRecovery: () => Promise<boolean>;
}
```

**Capabilities:**

- Global error state management
- Auto-recovery coordination
- Error pattern tracking
- Recovery action execution

#### 4. SmartErrorNotification (`components/error/SmartErrorNotification.tsx`)

Non-intrusive error notification component with recovery actions.

```typescript
interface SmartErrorNotificationProps {
  errorMessage: ErrorMessage;
  onDismiss: () => void;
  onActionExecute?: (action: ErrorRecoveryAction) => Promise<void>;
  onRetry?: () => void;
  position?: "top-right" | "top-center" | "bottom-right" | "bottom-center";
  autoHide?: boolean;
  autoHideDelay?: number;
}
```

**Features:**

- Contextual positioning (mobile/desktop)
- Auto-hide for non-critical errors
- Expandable recovery options
- Progress tracking for recovery actions

#### 5. useErrorHandler Hook (`hooks/useErrorHandler.ts`)

Comprehensive error handling hook for components.

```typescript
interface UseErrorHandlerReturn {
  currentError: ErrorMessage | null;
  isRecovering: boolean;
  hasError: boolean;
  retryCount: number;
  handleError: (
    error: Error | string,
    context?: Partial<ErrorContext>,
  ) => Promise<void>;
  handleAsyncOperation: <T>(operation: () => Promise<T>) => Promise<T | null>;
  clearError: () => void;
  retry: () => Promise<void>;
  executeRecoveryAction: (actionId: string) => Promise<boolean>;
  validateAndHandle: <T>(
    value: T,
    validator: (value: T) => boolean,
    errorMessage: string,
  ) => boolean;
  withErrorHandling: <T, R>(
    fn: (...args: T) => Promise<R>,
  ) => (...args: T) => Promise<R | null>;
}
```

## Error Types and Categories

### Error Types

- **validation**: Form input validation errors
- **network**: Network connectivity issues
- **authentication**: Authentication and session errors
- **permission**: Authorization and permission errors
- **data_corruption**: Data integrity issues
- **ai_service**: AI service failures
- **file_upload**: File upload problems
- **calculation**: Calculation engine errors
- **database**: Database operation failures
- **timeout**: Operation timeout errors
- **quota_exceeded**: Usage limit exceeded
- **unknown**: Unclassified errors

### Error Categories

- **user_input**: User-correctable input issues
- **system_error**: Internal system failures
- **external_service**: Third-party service problems
- **configuration**: Configuration or setup issues
- **performance**: Performance-related problems
- **security**: Security and authorization issues

## Recovery Actions

### Action Types

#### 1. Automatic Actions (`type: 'auto'`)

- Execute without user intervention
- Used for self-healing scenarios
- Examples: retry network requests, refresh authentication tokens

#### 2. User Actions (`type: 'user-action'`)

- Require explicit user interaction
- Provide clear instructions
- Examples: fix form validation, choose different file

#### 3. Guidance Actions (`type: 'guidance'`)

- Provide educational content
- Link to help system
- Examples: show examples, open tutorials

### Common Recovery Strategies

#### Network Errors

```typescript
{
  id: 'retry-connection',
  label: 'Retry',
  description: 'Try the operation again',
  type: 'auto',
  execute: () => retryLastOperation()
},
{
  id: 'work-offline',
  label: 'Continue Offline',
  description: 'Continue working with cached data',
  type: 'user-action',
  execute: () => enableOfflineMode()
}
```

#### Validation Errors

```typescript
{
  id: 'fix-validation',
  label: 'Fix Input Errors',
  description: 'Review and correct the highlighted field errors',
  type: 'user-action',
  execute: () => scrollToFirstError()
},
{
  id: 'show-examples',
  label: 'Show Examples',
  description: 'See example values for this field',
  type: 'guidance',
  execute: () => showExamples()
}
```

#### AI Service Errors

```typescript
{
  id: 'manual-entry',
  label: 'Enter Manually',
  description: 'Skip AI analysis and enter information manually',
  type: 'user-action',
  execute: () => switchToManualMode()
},
{
  id: 'retry-ai',
  label: 'Retry AI Analysis',
  description: 'Try AI analysis again',
  type: 'auto',
  execute: () => retryAIOperation()
}
```

## Implementation Guide

### Basic Setup

1. **Wrap your application with error providers**:

```tsx
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ErrorRecoveryProvider } from "@/components/error/ErrorRecoveryProvider";

<ErrorBoundary
  stepId="current-step"
  stepNumber={1}
  userId="user-123"
  flowData={flowData}
>
  <ErrorRecoveryProvider
    stepId="current-step"
    stepNumber={1}
    userId="user-123"
    flowData={flowData}
  >
    <YourComponent />
  </ErrorRecoveryProvider>
</ErrorBoundary>;
```

2. **Use error handling hooks in components**:

```tsx
import { useErrorHandler } from "@/hooks/useErrorHandler";

function MyComponent() {
  const { handleAsyncOperation, currentError, clearError } = useErrorHandler({
    stepId: "my-step",
    stepNumber: 1,
    enableAutoRecovery: true,
  });

  const handleSubmit = async () => {
    const result = await handleAsyncOperation(async () => {
      // Your async operation
      return await submitData();
    });

    if (result) {
      // Success handling
    }
    // Error handling is automatic
  };

  return (
    <div>
      {/* Your component content */}
      {currentError && (
        <SmartErrorNotification
          errorMessage={currentError}
          onDismiss={clearError}
        />
      )}
    </div>
  );
}
```

### Advanced Usage

#### Custom Error Recovery Actions

```typescript
const customRecoveryActions: ErrorRecoveryAction[] = [
  {
    id: "custom-action",
    label: "Custom Recovery",
    description: "Perform custom recovery logic",
    type: "user-action",
    priority: 1,
    execute: async () => {
      // Custom recovery logic
      await performCustomRecovery();
    },
  },
];

// Add custom actions to error message
const enhancedErrorMessage = {
  ...baseErrorMessage,
  recoveryActions: [
    ...baseErrorMessage.recoveryActions,
    ...customRecoveryActions,
  ],
};
```

#### Validation with Error Handling

```tsx
const { validateAndHandle, handleFormValidation } = useErrorHandler();

const handleFormSubmit = (formData) => {
  // Validate individual fields
  if (
    !validateAndHandle(
      formData.email,
      isValidEmail,
      "Please enter a valid email address",
    )
  ) {
    return;
  }

  // Validate entire form
  const errors = validateForm(formData);
  if (Object.keys(errors).length > 0) {
    handleFormValidation(errors);
    return;
  }

  // Proceed with submission
  submitForm(formData);
};
```

#### Async Operations with Error Handling

```tsx
const { withErrorHandling } = useErrorHandler();

// Wrap async functions
const saveDataWithErrorHandling = withErrorHandling(async (data) => {
  const response = await fetch("/api/save", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Save failed");
  }

  return response.json();
});

// Use the wrapped function
const handleSave = async () => {
  const result = await saveDataWithErrorHandling(formData);
  if (result) {
    // Success
  }
  // Errors are handled automatically
};
```

## Error Prevention

### Proactive Error Prevention

The system includes prevention mechanisms:

1. **Input Validation**: Real-time validation with helpful error messages
2. **Smart Defaults**: AI-powered suggestions to prevent common mistakes
3. **Contextual Help**: Proactive help to guide users before errors occur
4. **Pattern Learning**: Learns from user behavior to prevent repeated errors

### Prevention Tips

The system automatically generates prevention tips based on error patterns:

```typescript
const preventionTipsByType: Record<ErrorType, string[]> = {
  validation: [
    "Double-check required fields before proceeding",
    "Use the format examples provided",
    "Copy and paste values to avoid typos",
  ],
  network: [
    "Save your work frequently",
    "Check your internet connection stability",
    "Consider working offline if connection is unreliable",
  ],
  ai_service: [
    "Have manual data ready as backup",
    "Try AI analysis during off-peak hours",
    "Use clear, high-quality photos for better AI results",
  ],
};
```

## Analytics and Monitoring

### Error Tracking

The system automatically tracks error metrics:

```typescript
interface ErrorStatistics {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  recoveryPatterns: Record<string, number>;
  userStrugglingIndicators: {
    userId: string;
    stepId: string;
    errorCount: number;
    repeatPatterns: string[];
  }[];
}
```

### Integration with Analytics Services

```typescript
// Google Analytics integration
if (typeof window !== "undefined" && (window as any).gtag) {
  (window as any).gtag("event", "exception", {
    description: error.message,
    fatal: false,
    custom_parameters: {
      error_code: errorMessage.id,
      error_type: errorMessage.category,
      step_id: stepId,
      recovery_attempts: recoveryAttempts,
    },
  });
}

// Sentry integration
if (typeof window !== "undefined" && (window as any).Sentry) {
  (window as any).Sentry.captureException(error, {
    contexts: {
      errorBoundary: {
        stepId: stepId,
        stepNumber: stepNumber,
        recoveryAttempts: recoveryAttempts,
      },
    },
    tags: {
      errorCode: errorMessage.id,
      errorCategory: errorMessage.category,
      isRecoverable: errorMessage.isRecoverable,
    },
  });
}
```

## Mobile Optimization

### Touch-Friendly Error Handling

- **Bottom Sheet Notifications**: Mobile-native error displays
- **Large Touch Targets**: 44px minimum for all interactive elements
- **Swipe Gestures**: Swipe to dismiss non-critical errors
- **Simplified Actions**: Fewer, more focused recovery options on mobile

### Offline Error Handling

```typescript
const offlineRecoveryActions = [
  {
    id: "save-locally",
    label: "Save Locally",
    description: "Save your work in browser storage",
    type: "auto",
    execute: () => {
      localStorage.setItem("offline-backup", JSON.stringify(flowData));
    },
  },
  {
    id: "continue-offline",
    label: "Continue Offline",
    description: "Work without internet connection",
    type: "user-action",
    execute: () => {
      enableOfflineMode();
    },
  },
];
```

## Testing and Quality Assurance

### Error Simulation for Testing

```typescript
// Development helper for testing error scenarios
if (process.env.NODE_ENV === "development") {
  window.simulateError = (errorType: ErrorType, stepId: string) => {
    const mockError = new Error(`Simulated ${errorType} error`);
    ErrorRecoveryEngine.processError({
      errorType,
      errorCode: `SIMULATED_${errorType.toUpperCase()}`,
      originalError: mockError,
      stepId,
      stepNumber: 1,
      userId: "test-user",
      flowData: {},
    });
  };
}
```

### Automated Error Testing

```typescript
describe("Error Recovery System", () => {
  test("handles network errors with retry logic", async () => {
    const { handleAsyncOperation } = useErrorHandler();

    const failingOperation = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce("success");

    const result = await handleAsyncOperation(failingOperation);

    expect(failingOperation).toHaveBeenCalledTimes(2);
    expect(result).toBe("success");
  });

  test("provides appropriate recovery actions for validation errors", async () => {
    const errorMessage = await ErrorRecoveryEngine.processError({
      errorType: "validation",
      errorCode: "FIELD_REQUIRED",
      originalError: new Error("Name is required"),
      stepId: "initial-contact",
      stepNumber: 1,
      userId: "test-user",
      flowData: {},
    });

    expect(errorMessage.recoveryActions).toContainEqual(
      expect.objectContaining({
        type: "user-action",
        label: expect.stringContaining("Fix"),
      }),
    );
  });
});
```

## Accessibility

### Screen Reader Support

- **ARIA Labels**: All error messages have appropriate ARIA labels
- **Focus Management**: Error notifications manage focus appropriately
- **Semantic Markup**: Uses semantic HTML for error content
- **Keyboard Navigation**: All recovery actions are keyboard accessible

### Visual Accessibility

- **High Contrast**: Error notifications support high contrast mode
- **Scalable Text**: Respects user font size preferences
- **Color Independence**: Error severity indicated by icons, not just color
- **Motion Sensitivity**: Reduced motion options for animations

## Troubleshooting

### Common Issues

#### Error Recovery Not Working

- Verify ErrorRecoveryProvider is properly configured
- Check that error context includes required fields
- Ensure recovery actions are properly defined

#### Duplicate Error Notifications

- Check for multiple ErrorBoundary components
- Verify error clearing logic is working correctly
- Review error propagation in component hierarchy

#### Recovery Actions Failing

- Verify action execute functions are properly defined
- Check for async/await issues in recovery logic
- Review error handling within recovery actions

### Debug Mode

Enable detailed error logging:

```typescript
// Set environment variable
NEXT_PUBLIC_ERROR_DEBUG = true;

// Or programmatically
localStorage.setItem("error-debug", "true");
```

## Future Enhancements

### Planned Features

- **Machine Learning**: Predictive error prevention based on user patterns
- **Voice Commands**: Voice-activated error recovery for accessibility
- **Collaborative Recovery**: Team-based error resolution and knowledge sharing
- **Advanced Analytics**: Real-time error dashboards and insights
- **Integration APIs**: Third-party error monitoring service integration

### Enhancement Roadmap

1. **Q1**: Enhanced pattern recognition and predictive error prevention
2. **Q2**: Voice accessibility features and screen reader improvements
3. **Q3**: Advanced analytics dashboard and reporting
4. **Q4**: Machine learning-based error prediction and prevention

This comprehensive error recovery system transforms error handling from a frustrating experience into an opportunity for learning and improvement, ensuring users can complete their estimation workflows successfully regardless of technical issues they encounter.

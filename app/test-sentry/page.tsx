"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SentryErrorBoundary } from "@/components/monitoring/sentry-error-boundary";
import { useErrorTracking } from "@/contexts/error-context";
import { logger } from "@/lib/monitoring/sentry-logger";
import * as Sentry from "@sentry/nextjs";
import {
  AlertCircle,
  Bug,
  Zap,
  Database,
  Shield,
  Activity,
} from "lucide-react";

// Component that will throw an error
function BuggyComponent() {
  throw new Error("This is a test error from BuggyComponent!");
}

export default function TestSentryPage() {
  const [showBuggyComponent, setShowBuggyComponent] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const { trackError, trackMessage, trackPerformance, trackBusinessMetric } =
    useErrorTracking();

  const addResult = (result: string) => {
    setTestResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${result}`,
    ]);
  };

  // Test functions
  const testBasicError = () => {
    try {
      throw new Error("Test error: Basic exception");
    } catch (error) {
      const eventId = trackError(error as Error, {
        component: "TestSentry",
        action: "testBasicError",
        testType: "manual",
      });
      addResult(`Basic error sent to Sentry with ID: ${eventId}`);
    }
  };

  const testUnhandledError = () => {
    addResult("Triggering unhandled error in 2 seconds...");
    setTimeout(() => {
      throw new Error("Test error: Unhandled exception");
    }, 2000);
  };

  const testNetworkError = async () => {
    try {
      await fetch("https://this-domain-does-not-exist-12345.com");
    } catch (error) {
      const eventId = trackError(error as Error, {
        component: "TestSentry",
        action: "testNetworkError",
        errorType: "network",
      });
      addResult(`Network error sent to Sentry with ID: ${eventId}`);
    }
  };

  const testAPIError = async () => {
    try {
      const response = await fetch("/api/non-existent-endpoint");
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      logger.logAPIError(
        "/api/non-existent-endpoint",
        "GET",
        error as Error,
        404,
        {
          test: true,
        },
      );
      addResult("API error logged to Sentry");
    }
  };

  const testDatabaseError = () => {
    const dbError = new Error("Test error: Database connection failed");
    logger.logDatabaseError("SELECT", "users", dbError, {
      query: "SELECT * FROM users WHERE id = ?",
      params: ["test-id"],
    });
    addResult("Database error logged to Sentry");
  };

  const testAuthError = () => {
    const authError = new Error("Test error: Authentication failed");
    logger.logAuthError("login", authError, "test-user-id", {
      method: "password",
      ip: "127.0.0.1",
    });
    addResult("Auth error logged to Sentry");
  };

  const testPerformanceTracking = () => {
    // Simulate API performance
    const apiDuration = Math.floor(Math.random() * 1000) + 100;
    trackPerformance("api.test.endpoint", apiDuration, "ms");

    // Simulate database performance
    const dbDuration = Math.floor(Math.random() * 500) + 50;
    logger.trackDatabasePerformance("SELECT", "test_table", dbDuration, 42);

    addResult(
      `Performance metrics sent: API ${apiDuration}ms, DB ${dbDuration}ms`,
    );
  };

  const testBusinessMetrics = () => {
    // Track some business metrics
    trackBusinessMetric("test.conversion_rate", 0.23, {
      source: "test_page",
      variant: "A",
    });

    logger.trackBusinessMetric("test.revenue", 1234.56, "$", {
      product: "test_product",
      region: "US",
    });

    addResult("Business metrics tracked to Sentry");
  };

  const testTransaction = async () => {
    // Using Sentry's newer API for spans
    await Sentry.startSpan(
      {
        name: "test.workflow",
        op: "test",
      },
      async () => {
        Sentry.setTag("user_id", "test-user");
        addResult("Started transaction: test.workflow");

        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 1000));

        Sentry.setTag("transaction.status", "ok");
        addResult("Finished transaction with status: ok");
      },
    );
  };

  const testBreadcrumbs = () => {
    logger.addBreadcrumb("User clicked test button", "user", "info", {
      buttonId: "test-breadcrumb",
    });

    logger.addBreadcrumb("Test data loaded", "data", "info", {
      recordCount: 100,
      source: "test",
    });

    logger.addBreadcrumb("Test validation failed", "validation", "warning", {
      field: "email",
      reason: "invalid format",
    });

    addResult("Added 3 breadcrumbs to Sentry context");
  };

  const testMessages = () => {
    trackMessage("This is an info message from test page", "info");
    trackMessage("This is a warning message from test page", "warning");
    trackMessage("This is an error message from test page", "error");

    addResult("Sent 3 messages to Sentry (info, warning, error)");
  };

  const testUserContext = () => {
    Sentry.setUser({
      id: "test-user-123",
      email: "test@example.com",
      username: "testuser",
    });

    Sentry.setContext("test_context", {
      feature: "sentry_test",
      environment: "testing",
      timestamp: new Date().toISOString(),
    });

    addResult("Set user and test context in Sentry");
  };

  const clearTests = () => {
    setTestResults([]);
    setShowBuggyComponent(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-6 w-6" />
            Sentry Integration Test Page
          </CardTitle>
          <CardDescription>
            Test various Sentry features and error tracking capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This page is for testing Sentry integration. Errors triggered here
              are intentional and for testing purposes only.
            </AlertDescription>
          </Alert>

          {/* Error Tests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Tracking Tests
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={testBasicError} variant="outline">
                Test Basic Error
              </Button>
              <Button onClick={testUnhandledError} variant="outline">
                Test Unhandled Error
              </Button>
              <Button onClick={testNetworkError} variant="outline">
                Test Network Error
              </Button>
              <Button onClick={testAPIError} variant="outline">
                Test API Error
              </Button>
              <Button onClick={testDatabaseError} variant="outline">
                Test Database Error
              </Button>
              <Button onClick={testAuthError} variant="outline">
                Test Auth Error
              </Button>
            </div>
          </div>

          {/* Performance Tests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance Monitoring Tests
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={testPerformanceTracking} variant="outline">
                Test Performance Metrics
              </Button>
              <Button onClick={testBusinessMetrics} variant="outline">
                Test Business Metrics
              </Button>
              <Button onClick={testTransaction} variant="outline">
                Test Transaction
              </Button>
            </div>
          </div>

          {/* Context Tests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" />
              Context & Logging Tests
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={testBreadcrumbs} variant="outline">
                Test Breadcrumbs
              </Button>
              <Button onClick={testMessages} variant="outline">
                Test Messages
              </Button>
              <Button onClick={testUserContext} variant="outline">
                Test User Context
              </Button>
            </div>
          </div>

          {/* Error Boundary Test */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Error Boundary Test
            </h3>
            <SentryErrorBoundary
              component="TestSentry"
              showDetails={true}
              allowFeedback={true}
            >
              {showBuggyComponent ? (
                <BuggyComponent />
              ) : (
                <Button
                  onClick={() => setShowBuggyComponent(true)}
                  variant="destructive"
                >
                  Trigger Error Boundary
                </Button>
              )}
            </SentryErrorBoundary>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Test Results
                </h3>
                <Button onClick={clearTests} variant="ghost" size="sm">
                  Clear
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="text-sm space-y-1">
                  {testResults.map((result, index) => (
                    <div key={index}>{result}</div>
                  ))}
                </pre>
              </div>
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <AlertDescription className="space-y-2">
              <p className="font-semibold">How to verify Sentry integration:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Click any test button above</li>
                <li>Check your browser console for local logging</li>
                <li>Visit your Sentry dashboard to see the captured events</li>
                <li>
                  Events include error details, performance metrics, and custom
                  context
                </li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  startupValidator,
  StartupValidationResult,
} from "@/lib/config/startup-validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Settings,
  Zap,
} from "lucide-react";

interface StartupValidationContextType {
  validationResult: StartupValidationResult | null;
  isValid: boolean;
  isLoading: boolean;
  retryValidation: () => Promise<void>;
  clearValidation: () => void;
}

const StartupValidationContext = createContext<
  StartupValidationContextType | undefined
>(undefined);

export function useStartupValidation() {
  const context = useContext(StartupValidationContext);
  if (context === undefined) {
    throw new Error(
      "useStartupValidation must be used within a StartupValidationProvider",
    );
  }
  return context;
}

interface StartupValidationProviderProps {
  children: React.ReactNode;
  showValidationUI?: boolean;
}

export function StartupValidationProvider({
  children,
  showValidationUI = true,
}: StartupValidationProviderProps) {
  const [validationResult, setValidationResult] =
    useState<StartupValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showValidationScreen, setShowValidationScreen] = useState(false);

  const performValidation = async () => {
    try {
      setIsLoading(true);
      const result = await startupValidator.validateStartup();
      setValidationResult(result);

      // Show validation screen if there are critical errors
      if (!result.isValid && result.errors.length > 0) {
        setShowValidationScreen(true);
      }
    } catch (error) {
      console.error("Startup validation failed:", error);
      setValidationResult({
        isValid: false,
        errors: ["Startup validation failed"],
        warnings: [],
        missingConfig: [],
        databaseStatus: "error",
        features: {},
      });
      setShowValidationScreen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const retryValidation = async () => {
    startupValidator.clearValidationResult();
    await performValidation();
  };

  const clearValidation = () => {
    setValidationResult(null);
    setShowValidationScreen(false);
  };

  useEffect(() => {
    performValidation();
  }, []);

  const contextValue: StartupValidationContextType = {
    validationResult,
    isValid: validationResult?.isValid ?? false,
    isLoading,
    retryValidation,
    clearValidation,
  };

  // Show loading state
  if (isLoading) {
    return (
      <StartupValidationContext.Provider value={contextValue}>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Starting EstimatePro</h2>
              <p className="text-muted-foreground">
                Validating system configuration...
              </p>
            </div>
          </div>
        </div>
      </StartupValidationContext.Provider>
    );
  }

  // Show validation screen if there are critical issues
  if (
    showValidationUI &&
    showValidationScreen &&
    validationResult &&
    !validationResult.isValid
  ) {
    return (
      <StartupValidationContext.Provider value={contextValue}>
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-destructive">
                System Configuration Issues
              </h1>
              <p className="text-muted-foreground">
                EstimatePro detected some configuration problems that need to be
                resolved
              </p>
            </div>

            {/* Database Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Connection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {validationResult.databaseStatus === "connected" ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-600 font-medium">
                        Connected
                      </span>
                    </>
                  ) : validationResult.databaseStatus === "disconnected" ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="text-yellow-600 font-medium">
                        Disconnected
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-600 font-medium">Error</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Feature Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Feature Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(validationResult.features).map(
                    ([feature, enabled]) => (
                      <div key={feature} className="flex items-center gap-2">
                        {enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm capitalize">
                          {feature.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-5 w-5" />
                    Critical Errors ({validationResult.errors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {validationResult.errors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <Card className="border-yellow-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-5 w-5" />
                    Warnings ({validationResult.warnings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {validationResult.warnings.map((warning, index) => (
                      <Alert
                        key={index}
                        variant="default"
                        className="border-yellow-200 bg-yellow-50"
                      >
                        <AlertDescription>{warning}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Missing Configuration */}
            {validationResult.missingConfig.length > 0 && (
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <Settings className="h-5 w-5" />
                    Missing Configuration (
                    {validationResult.missingConfig.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {validationResult.missingConfig.map((config, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-orange-50 rounded border border-orange-200"
                      >
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <code className="text-sm font-mono text-orange-800">
                          {config}
                        </code>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Solution:</strong> Add these environment variables
                      to your <code>.env.local</code> file. Check the
                      documentation for setup instructions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={retryValidation}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Validation
              </Button>
              {validationResult.errors.length === 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowValidationScreen(false)}
                  className="flex items-center gap-2"
                >
                  Continue Anyway
                </Button>
              )}
            </div>

            {/* Development Mode Notice */}
            {process.env.NODE_ENV === "development" && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertTitle>Development Mode</AlertTitle>
                <AlertDescription>
                  You're running in development mode. Some features may not work
                  correctly without proper configuration, but the app will
                  continue to function.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </StartupValidationContext.Provider>
    );
  }

  // Show children normally
  return (
    <StartupValidationContext.Provider value={contextValue}>
      {children}
    </StartupValidationContext.Provider>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Building } from "lucide-react";
import { handleOAuthCallback } from "@/lib/auth/oauth-providers";
import { useAuth } from "@/contexts/auth-context";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get code and state from URL parameters
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error_param = searchParams.get("error");
        const error_description = searchParams.get("error_description");

        // Handle OAuth errors from provider
        if (error_param) {
          console.error("OAuth provider error:", {
            error_param,
            error_description,
          });
          setStatus("error");
          setError(error_description || `OAuth error: ${error_param}`);
          return;
        }

        // Validate required parameters
        if (!code) {
          console.error("No authorization code received");
          setStatus("error");
          setError("No authorization code received from OAuth provider");
          return;
        }

        setMessage("Processing OAuth authentication...");

        // Handle the OAuth callback
        const result = await handleOAuthCallback(code, state);

        if (result.success) {
          setStatus("success");
          setMessage("Authentication successful! Redirecting to dashboard...");

          // Short delay to show success message
          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else {
          console.error("OAuth callback failed:", result.error);
          setStatus("error");
          setError(result.error || "Failed to complete OAuth authentication");
        }
      } catch (err: any) {
        console.error("OAuth callback processing error:", err);
        setStatus("error");
        setError("An unexpected error occurred during authentication");
      }
    };

    // Don't process if still loading auth state or no search params
    if (!authLoading && searchParams.toString()) {
      processCallback();
    }
  }, [searchParams, authLoading, router]);

  // If user is already authenticated, redirect immediately
  useEffect(() => {
    if (!authLoading && user && status === "loading") {
      router.push("/dashboard");
    }
  }, [user, authLoading, status, router]);

  const handleRetry = () => {
    router.push("/auth/login");
  };

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Building className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">EstimatePro</h1>
          </div>
          <p className="text-muted-foreground">OAuth Authentication</p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {status === "loading" && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Processing...
                </>
              )}
              {status === "success" && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Authentication Successful
                </>
              )}
              {status === "error" && (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Authentication Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Loading State */}
            {status === "loading" && (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
                <p className="text-muted-foreground">
                  {message ||
                    "Please wait while we complete your authentication..."}
                </p>
              </div>
            )}

            {/* Success State */}
            {status === "success" && (
              <div className="text-center space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {message || "You have been successfully authenticated!"}
                  </AlertDescription>
                </Alert>
                <Button onClick={handleGoToDashboard} className="w-full">
                  Go to Dashboard
                </Button>
              </div>
            )}

            {/* Error State */}
            {status === "error" && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Button onClick={handleRetry} className="w-full">
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/auth/signup")}
                    className="w-full"
                  >
                    Create New Account
                  </Button>
                </div>

                {/* Additional Help */}
                <div className="text-center text-sm text-muted-foreground">
                  <p>
                    Need help? Contact support or try signing in with email and
                    password.
                  </p>
                </div>
              </div>
            )}

            {/* Debug Information (Development Only) */}
            {process.env.NODE_ENV === "development" && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-xs font-mono text-muted-foreground">
                  Debug Info (dev only):
                </p>
                <ul className="text-xs font-mono text-muted-foreground mt-2 space-y-1">
                  <li>Code: {searchParams.get("code") ? "✓" : "✗"}</li>
                  <li>State: {searchParams.get("state") || "none"}</li>
                  <li>Error: {searchParams.get("error") || "none"}</li>
                  <li>Status: {status}</li>
                  <li>Auth Loading: {authLoading.toString()}</li>
                  <li>User: {user ? "authenticated" : "none"}</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back to Login Link */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/auth/login")}
            className="text-sm"
          >
            ← Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}

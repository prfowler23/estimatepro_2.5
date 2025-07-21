"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Building, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { debug, info, warn, error as logError } from "@/lib/utils/logger";

export default function LoginPage() {
  const { signIn, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [envError, setEnvError] = useState("");

  // Environment validation
  useEffect(() => {
    debug("Checking environment configuration", {
      component: "LoginPage",
      action: "environmentValidation",
    });

    // Add a small delay to allow Next.js to inject environment variables
    const checkEnv = () => {
      const missingVars = [];

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
      }
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
      }

      if (missingVars.length > 0) {
        const message = `Missing environment variables: ${missingVars.join(", ")}`;
        logError("Configuration error", {
          component: "LoginPage",
          action: "environmentValidation",
          missingVars,
        });

        // In development, be more lenient
        if (process.env.NODE_ENV === "development") {
          warn(
            "Environment variables missing in development - continuing anyway",
            {
              component: "LoginPage",
              missingVars,
            },
          );
          setEnvError("");
        } else {
          setEnvError(message);
        }
      } else {
        debug("Environment configuration validated successfully", {
          component: "LoginPage",
        });
        setEnvError("");
      }
    };

    // Small delay to allow environment variable injection
    setTimeout(checkEnv, 100);
  }, []);

  // Only redirect if already logged in when page first loads
  useEffect(() => {
    if (!authLoading && user && !loading) {
      info("User already authenticated, redirecting to dashboard", {
        component: "LoginPage",
        action: "automaticRedirect",
        userId: user.id,
      });
      router.replace("/dashboard");
    }
  }, [authLoading, user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 Login form submitted with:", formData);
    console.log("🔧 Environment check:", {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? "✅ Set"
        : "❌ Missing",
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "✅ Set"
        : "❌ Missing",
    });

    setLoading(true);
    setError("");

    try {
      console.log("📡 Attempting Supabase sign in...");
      const { data, error } = await signIn(formData.email, formData.password);
      console.log("📊 Supabase response:", {
        success: !!data.user,
        error: error?.message || "None",
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
      });

      if (error) {
        logError("Login authentication failed", {
          component: "LoginPage",
          action: "signIn",
          email: formData.email,
          error: error.message,
        });
        // Provide user-friendly error messages
        let userMessage = error.message;
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          userMessage =
            "Incorrect email or password. Please check your credentials and try again.";
        } else if (
          error.message.toLowerCase().includes("email not confirmed")
        ) {
          userMessage =
            "Please check your email and click the confirmation link before signing in.";
        } else if (error.message.toLowerCase().includes("too many requests")) {
          userMessage =
            "Too many login attempts. Please wait a few minutes before trying again.";
        } else if (error.message.toLowerCase().includes("network")) {
          userMessage =
            "Network error. Please check your internet connection and try again.";
        }
        setError(userMessage);
      } else if (data.user) {
        console.log("✅ Login successful! Redirecting to dashboard...");
        // Simple redirect - development middleware will allow access
        router.push("/dashboard");
      } else {
        console.warn("⚠️ No error but no user returned");
        setError("Login failed - no user returned");
      }
    } catch (err: any) {
      console.error("💥 Unexpected error during login:", err);
      setError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setLoading(false);
      console.log("🏁 Login attempt completed");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleDemoLogin = async () => {
    console.log("🎯 Demo login button clicked");
    const demoCredentials = {
      email: "demo@estimatepro.com",
      password: "demo123",
    };

    console.log("📝 Setting demo credentials:", demoCredentials);
    setFormData(demoCredentials);

    // Auto-submit the form with demo credentials
    console.log("🤖 Auto-submitting demo login...");
    setLoading(true);
    setError("");

    try {
      console.log("📡 Attempting demo Supabase sign in...");
      const { data, error } = await signIn(
        demoCredentials.email,
        demoCredentials.password,
      );
      console.log("📊 Demo Supabase response:", {
        success: !!data.user,
        error: error?.message || "None",
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
      });

      if (error) {
        console.error("❌ Demo login error:", error);
        // Provide user-friendly demo error messages
        let userMessage = error.message;
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          userMessage =
            "Demo account not found. The demo user may not be set up in the database.";
        } else if (
          error.message.toLowerCase().includes("email not confirmed")
        ) {
          userMessage =
            "Demo account needs email confirmation. Please contact support.";
        } else if (error.message.toLowerCase().includes("network")) {
          userMessage =
            "Network error. Please check your internet connection and try again.";
        }
        setError(`Demo login failed: ${userMessage}`);
      } else if (data.user) {
        console.log("✅ Demo login successful! Redirecting to dashboard...");
        // Simple redirect - development middleware will allow access
        router.push("/dashboard");
      } else {
        console.warn("⚠️ Demo login: No error but no user returned");
        setError("Demo login failed - no user returned");
      }
    } catch (err: any) {
      console.error("💥 Unexpected error during demo login:", err);
      setError(`Demo login error: ${err.message}`);
    } finally {
      setLoading(false);
      console.log("🏁 Demo login attempt completed");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Building className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">EstimatePro</h1>
          </div>
          <p className="text-muted-foreground">
            Building Services Estimation Platform
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your EstimatePro account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Environment Error */}
            {envError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>
                  <strong>Configuration Error:</strong> {envError}
                  <br />
                  <small>
                    Please check your .env.local file contains the required
                    Supabase credentials.
                  </small>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Loading State Indicator */}
              {loading && (
                <Alert>
                  <AlertDescription className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Signing you in...
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !!envError}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>

              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Account */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Demo Account</p>
              <div className="text-xs space-y-1">
                <p>Email: demo@estimatepro.com</p>
                <p>Password: demo123</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDemoLogin}
                disabled={loading || !!envError}
                className="mt-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                    Logging in...
                  </div>
                ) : (
                  "Use Demo Account"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

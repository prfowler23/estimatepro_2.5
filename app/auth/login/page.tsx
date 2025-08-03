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
import { Eye, EyeOff, Building, Mail, Lock, Github } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { SiMicrosoft } from "react-icons/si";
import { useAuth } from "@/contexts/auth-context";
import { error as logError } from "@/lib/utils/logger";
import {
  signInWithOAuth,
  getSupportedOAuthProviders,
  getOAuthProviderInfo,
  isOAuthProviderConfigured,
} from "@/lib/auth/oauth-providers";

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
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // Environment validation
  useEffect(() => {
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
          setEnvError("");
        } else {
          setEnvError(message);
        }
      } else {
        setEnvError("");
      }
    };

    // Small delay to allow environment variable injection
    setTimeout(checkEnv, 100);
  }, []);

  // Only redirect if already logged in when page first loads
  useEffect(() => {
    if (!authLoading && user && !loading) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await signIn(formData.email, formData.password);

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
        router.push("/dashboard");
      } else {
        setError("Login failed - no user returned");
      }
    } catch (err: any) {
      logError("Unexpected error during login", {
        component: "LoginPage",
        action: "signIn",
        error: err.message,
      });
      setError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleDemoLogin = async () => {
    const demoCredentials = {
      email: "demo@estimatepro.com",
      password: "demo123",
    };

    setFormData(demoCredentials);
    setLoading(true);
    setError("");

    try {
      const { data, error } = await signIn(
        demoCredentials.email,
        demoCredentials.password,
      );

      if (error) {
        logError("Demo login authentication failed", {
          component: "LoginPage",
          action: "demoSignIn",
          error: error.message,
        });
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
        router.push("/dashboard");
      } else {
        setError("Demo login failed - no user returned");
      }
    } catch (err: any) {
      logError("Unexpected error during demo login", {
        component: "LoginPage",
        action: "demoSignIn",
        error: err.message,
      });
      setError(`Demo login error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "github" | "azure" | "google") => {
    setOauthLoading(provider);
    setError("");

    try {
      const result = await signInWithOAuth(provider);

      if (!result.success) {
        logError(`OAuth ${provider} authentication failed`, {
          component: "LoginPage",
          action: "oauthSignIn",
          provider,
          error: result.error,
        });
        setError(result.error || `Failed to sign in with ${provider}`);
      } else if (result.requiresRedirect && result.redirectUrl) {
        // Redirect to OAuth provider
        window.location.href = result.redirectUrl;
      }
    } catch (err: any) {
      logError(`Unexpected error during ${provider} OAuth`, {
        component: "LoginPage",
        action: "oauthSignIn",
        provider,
        error: err.message,
      });
      setError(`An unexpected error occurred with ${provider}: ${err.message}`);
    } finally {
      setOauthLoading(null);
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

            {/* OAuth Providers */}
            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* GitHub */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn("github")}
                  disabled={loading || oauthLoading !== null || !!envError}
                  className="w-full"
                >
                  {oauthLoading === "github" ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Connecting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      Continue with GitHub
                    </div>
                  )}
                </Button>

                {/* Google */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={loading || oauthLoading !== null || !!envError}
                  className="w-full"
                >
                  {oauthLoading === "google" ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Connecting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FcGoogle className="h-4 w-4" />
                      Continue with Google
                    </div>
                  )}
                </Button>

                {/* Microsoft */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOAuthSignIn("azure")}
                  disabled={loading || oauthLoading !== null || !!envError}
                  className="w-full"
                >
                  {oauthLoading === "azure" ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      Connecting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <SiMicrosoft className="h-4 w-4 text-blue-600" />
                      Continue with Microsoft
                    </div>
                  )}
                </Button>
              </div>
            </div>

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

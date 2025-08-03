"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Key,
  Copy,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  generateBackupCodes,
} from "@/lib/auth/two-factor-auth";

interface TwoFactorStatus {
  enabled: boolean;
  verified: boolean;
  backup_codes_generated: boolean;
  secret?: string;
  qr_code?: string;
}

export function TwoFactorSetup() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TwoFactorStatus>({
    enabled: false,
    verified: false,
    backup_codes_generated: false,
  });
  const [setupData, setSetupData] = useState<{
    secret: string;
    qr_code: string;
    backup_codes: string[];
  } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadTwoFactorStatus();
    }
  }, [user]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadTwoFactorStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_two_factor")
        .select("enabled, verified, backup_codes_generated")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Failed to load 2FA status:", error);
        return;
      }

      if (data) {
        setStatus(data);
      }
    } catch (error) {
      console.error("Error loading 2FA status:", error);
    }
  };

  const handleSetupTwoFactor = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await setupTwoFactor();

      if (result.success && result.data) {
        setSetupData(result.data);
        setStatus((prev) => ({ ...prev, enabled: true }));
        setMessage({
          type: "success",
          text: "Two-factor authentication setup initiated. Please scan the QR code.",
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to setup two-factor authentication",
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `Setup error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (!user || !verificationCode || !setupData) return;

    setLoading(true);
    try {
      const result = await verifyTwoFactor(verificationCode);

      if (result.success) {
        setStatus((prev) => ({ ...prev, verified: true }));
        setMessage({
          type: "success",
          text: "Two-factor authentication verified successfully!",
        });
        // Clear setup data after successful verification
        setSetupData(null);
        setVerificationCode("");
        await loadTwoFactorStatus();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Invalid verification code",
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `Verification error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!user) return;

    if (
      !confirm(
        "Are you sure you want to disable two-factor authentication? This will make your account less secure.",
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const result = await disableTwoFactor();

      if (result.success) {
        setStatus({
          enabled: false,
          verified: false,
          backup_codes_generated: false,
        });
        setSetupData(null);
        setBackupCodes([]);
        setMessage({
          type: "success",
          text: "Two-factor authentication disabled successfully",
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to disable two-factor authentication",
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `Disable error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBackupCodes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await generateBackupCodes();

      if (result.success && result.backup_codes) {
        setBackupCodes(result.backup_codes);
        setStatus((prev) => ({ ...prev, backup_codes_generated: true }));
        setMessage({
          type: "success",
          text: "Backup codes generated successfully. Please save them securely.",
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to generate backup codes",
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `Backup codes error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({
      type: "success",
      text: "Copied to clipboard",
    });
  };

  const downloadBackupCodes = () => {
    if (!backupCodes.length) return;

    const content = `EstimatePro Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}
User: ${user?.email}

WARNING: Store these codes securely. Each code can only be used once.

${backupCodes.map((code, index) => `${index + 1}. ${code}`).join("\n")}

Important:
- Keep these codes in a secure location
- Each code can only be used once
- Use these codes if you lose access to your authenticator app
- Generate new codes if you suspect these have been compromised`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimatepro-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {message && (
        <Alert
          variant={
            message.type === "success"
              ? "default"
              : message.type === "warning"
                ? "warning"
                : "destructive"
          }
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : message.type === "warning" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.verified ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : status.enabled ? (
              <Shield className="h-5 w-5 text-yellow-600" />
            ) : (
              <ShieldX className="h-5 w-5 text-red-600" />
            )}
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with 2FA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge
                  variant={
                    status.verified
                      ? "success"
                      : status.enabled
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {status.verified
                    ? "Active"
                    : status.enabled
                      ? "Setup Required"
                      : "Disabled"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {status.verified
                  ? "Your account is protected with two-factor authentication"
                  : status.enabled
                    ? "Complete setup by verifying your authenticator app"
                    : "Enable 2FA to secure your account"}
              </p>
            </div>
            {!status.enabled ? (
              <Button onClick={handleSetupTwoFactor} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Enable 2FA
                  </>
                )}
              </Button>
            ) : !status.verified ? (
              <Badge variant="secondary">Setup in Progress</Badge>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDisableTwoFactor}
                disabled={loading}
              >
                {loading ? "Disabling..." : "Disable 2FA"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Process */}
      {setupData && !status.verified && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Complete 2FA Setup
            </CardTitle>
            <CardDescription>
              Scan the QR code with your authenticator app and enter the
              verification code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="qr" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qr">QR Code</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg">
                    <img
                      src={setupData.qr_code}
                      alt="2FA QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Scan this QR code with your authenticator app (Google
                  Authenticator, Authy, etc.)
                </p>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={setupData.secret}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(setupData.secret)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter this secret key manually in your authenticator app
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-lg font-mono"
                />
              </div>
              <Button
                onClick={handleVerifySetup}
                disabled={loading || verificationCode.length !== 6}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify & Enable 2FA
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Codes */}
      {status.verified && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Backup Codes
            </CardTitle>
            <CardDescription>
              Generate backup codes to access your account if you lose your
              authenticator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!status.backup_codes_generated || backupCodes.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Backup codes help you regain access to your account if you
                  lose your authenticator device.
                </p>
                <Button onClick={handleGenerateBackupCodes} disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Generate Backup Codes
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Save these backup codes
                    securely. Each code can only be used once.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-background rounded"
                    >
                      <span>
                        {index + 1}. {code}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={downloadBackupCodes}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Codes
                  </Button>
                  <Button variant="outline" onClick={handleGenerateBackupCodes}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate New Codes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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
  Mail,
  Key,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { mfaService, type MFAEnrollmentResult } from "@/lib/auth/mfa-service";

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: "totp" | "phone";
  status: "verified" | "unverified";
  created_at: string;
}

interface MFAStatus {
  enabled: boolean;
  factorCount: number;
  recommendations: string[];
  assuranceLevel: string;
}

export function EnhancedMFASetup() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState<MFAFactor[]>([]);
  const [status, setStatus] = useState<MFAStatus>({
    enabled: false,
    factorCount: 0,
    recommendations: [],
    assuranceLevel: "aal1",
  });
  const [enrollmentData, setEnrollmentData] = useState<
    MFAEnrollmentResult["data"] | null
  >(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadMFAData();
    }
  }, [user]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadMFAData = async () => {
    setLoading(true);
    try {
      const [factorsResult, statusResult] = await Promise.all([
        mfaService.getUserMFAFactors(),
        mfaService.getMFAStatus(),
      ]);

      if (factorsResult.success) {
        setFactors(factorsResult.factors || []);
      }

      setStatus(statusResult);
    } catch (error) {
      console.error("Error loading MFA data:", error);
      setMessage({
        type: "error",
        text: "Failed to load MFA configuration",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollTOTP = async () => {
    setLoading(true);
    try {
      const result = await mfaService.enrollTOTP();

      if (result.success && result.data) {
        setEnrollmentData(result.data);
        setMessage({
          type: "success",
          text: "TOTP enrollment started. Please scan the QR code with your authenticator app.",
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to enroll TOTP",
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `TOTP enrollment error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEnrollment = async () => {
    if (!enrollmentData || !verificationCode) return;

    setLoading(true);
    try {
      const result = await mfaService.verifyTOTPEnrollment(
        enrollmentData.id,
        verificationCode,
      );

      if (result.success) {
        setMessage({
          type: "success",
          text: "MFA enrollment verified successfully! Your account is now more secure.",
        });
        setEnrollmentData(null);
        setVerificationCode("");
        await loadMFAData();
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

  const handleRemoveFactor = async (factorId: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this MFA factor? This will reduce your account security.",
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const result = await mfaService.unenrollMFAFactor(factorId);

      if (result.success) {
        setMessage({
          type: "success",
          text: "MFA factor removed successfully",
        });
        await loadMFAData();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to remove MFA factor",
        });
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `Remove factor error: ${error.message}`,
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

  const getStatusIcon = () => {
    if (status.factorCount > 0 && status.assuranceLevel === "aal2") {
      return <ShieldCheck className="h-5 w-5 text-green-600" />;
    } else if (status.factorCount > 0) {
      return <Shield className="h-5 w-5 text-yellow-600" />;
    } else {
      return <ShieldX className="h-5 w-5 text-red-600" />;
    }
  };

  const getStatusBadge = () => {
    if (status.factorCount > 0 && status.assuranceLevel === "aal2") {
      return (
        <Badge className="bg-green-100 text-green-800">Fully Protected</Badge>
      );
    } else if (status.factorCount > 0) {
      return <Badge variant="secondary">Partially Protected</Badge>;
    } else {
      return <Badge variant="destructive">Unprotected</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <Alert
          variant={
            message.type === "success"
              ? "default"
              : message.type === "warning"
                ? "default"
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

      {/* Enhanced Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Multi-Factor Authentication (Enhanced)
          </CardTitle>
          <CardDescription>
            Strengthen your account security with multiple authentication
            methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Security Status:</span>
                  {getStatusBadge()}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Factors: {status.factorCount}</span>
                  <span>•</span>
                  <span>Level: {status.assuranceLevel.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Security Recommendations */}
            {status.recommendations.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm font-medium">
                  Security Recommendations:
                </span>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {status.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active MFA Factors */}
      {factors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Active Authentication Methods
            </CardTitle>
            <CardDescription>
              Your configured multi-factor authentication methods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {factors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {factor.factor_type === "totp" ? (
                      <Smartphone className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Mail className="h-5 w-5 text-green-600" />
                    )}
                    <div>
                      <div className="font-medium">
                        {factor.factor_type === "totp"
                          ? "Authenticator App"
                          : "Email OTP"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {factor.friendly_name ||
                          `${factor.factor_type.toUpperCase()} Factor`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        factor.status === "verified" ? "default" : "secondary"
                      }
                    >
                      {factor.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFactor(factor.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New MFA Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Authentication Method
          </CardTitle>
          <CardDescription>
            Set up additional security factors to protect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={handleEnrollTOTP}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Add Authenticator App (TOTP)
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                More authentication methods coming soon
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TOTP Enrollment Process */}
      {enrollmentData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Complete Authenticator Setup
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
                  <div className="p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
                    <img
                      src={enrollmentData.qr_code}
                      alt="MFA QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Recommended apps: Google Authenticator, Authy, 1Password,
                    Bitwarden
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={enrollmentData.secret}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(enrollmentData.secret)}
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
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
              <Button
                onClick={handleVerifyEnrollment}
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
                    Verify & Complete Setup
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Security Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">Use multiple factors</p>
                <p className="text-muted-foreground">
                  Set up both authenticator app and backup methods for maximum
                  security
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Key className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">Keep backup codes secure</p>
                <p className="text-muted-foreground">
                  Store backup codes in a secure location separate from your
                  authenticator app
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Smartphone className="h-4 w-4 text-purple-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">Use trusted apps</p>
                <p className="text-muted-foreground">
                  Only use reputable authenticator apps from official app stores
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

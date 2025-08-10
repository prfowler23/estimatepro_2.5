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
import {
  Shield,
  Smartphone,
  Mail,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Key,
} from "lucide-react";
import { mfaService, type MFAChallenge } from "@/lib/auth/mfa-service";
import { motion, AnimatePresence } from "framer-motion";

interface MFAFactor {
  id: string;
  friendly_name?: string;
  factor_type: "totp" | "phone";
  status: "verified" | "unverified";
  created_at: string;
}

interface MFAChallengeProps {
  factors: MFAFactor[];
  onSuccess: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

export function MFAChallenge({
  factors,
  onSuccess,
  onCancel,
  onError,
}: MFAChallengeProps) {
  const [selectedFactor, setSelectedFactor] = useState<MFAFactor | null>(null);
  const [challenge, setChallenge] = useState<MFAChallenge | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning" | "info";
    text: string;
  } | null>(null);

  // Auto-select the first verified factor
  useEffect(() => {
    const verifiedFactor = factors.find((f) => f.status === "verified");
    if (verifiedFactor && !selectedFactor) {
      setSelectedFactor(verifiedFactor);
      initializeChallenge(verifiedFactor);
    }
  }, [factors, selectedFactor]);

  // Countdown timer
  useEffect(() => {
    if (challenge && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      setMessage({
        type: "error",
        text: "Challenge expired. Please try again.",
      });
      setChallenge(null);
      setSelectedFactor(null);
    }
  }, [challenge, timeLeft]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const initializeChallenge = async (factor: MFAFactor) => {
    setLoading(true);
    try {
      const result = await mfaService.challengeMFAFactor(factor.id);

      if (result.success && result.challenge) {
        setChallenge(result.challenge);
        setTimeLeft(300); // Reset timer
        setMessage({
          type: "info",
          text: `Challenge sent to your ${factor.factor_type === "totp" ? "authenticator app" : "email"}`,
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to create MFA challenge",
        });
        onError(result.error || "MFA challenge failed");
      }
    } catch (error: any) {
      const errorMessage = `Challenge initialization error: ${error.message}`;
      setMessage({ type: "error", text: errorMessage });
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFactorSelect = (factor: MFAFactor) => {
    setSelectedFactor(factor);
    setChallenge(null);
    setVerificationCode("");
    setMessage(null);
    initializeChallenge(factor);
  };

  const handleVerification = async () => {
    if (!selectedFactor || !challenge || !verificationCode) return;

    setLoading(true);
    try {
      const result = await mfaService.verifyMFACode(
        selectedFactor.id,
        challenge.challenge_id,
        verificationCode,
      );

      if (result.success) {
        setMessage({
          type: "success",
          text: "Authentication successful!",
        });
        setTimeout(() => onSuccess(), 1000);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Invalid verification code",
        });
        setVerificationCode("");
      }
    } catch (error: any) {
      const errorMessage = `Verification error: ${error.message}`;
      setMessage({ type: "error", text: errorMessage });
      setVerificationCode("");
    } finally {
      setLoading(false);
    }
  };

  const handleResendChallenge = () => {
    if (selectedFactor) {
      initializeChallenge(selectedFactor);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getFactorIcon = (type: "totp" | "phone") => {
    return type === "totp" ? (
      <Smartphone className="h-5 w-5 text-blue-600" />
    ) : (
      <Mail className="h-5 w-5 text-green-600" />
    );
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert
              variant={
                message.type === "success" || message.type === "info"
                  ? "default"
                  : message.type === "warning"
                    ? "default"
                    : "destructive"
              }
            >
              {message.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : message.type === "info" ? (
                <Shield className="h-4 w-4" />
              ) : message.type === "warning" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Multi-Factor Authentication Required
              </CardTitle>
              <CardDescription>
                Complete the security challenge to continue
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Factor Selection */}
      {factors.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Authentication Method</CardTitle>
            <CardDescription>
              Select how you'd like to verify your identity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {factors.map((factor) => (
                <button
                  key={factor.id}
                  onClick={() => handleFactorSelect(factor)}
                  disabled={loading || factor.status !== "verified"}
                  className={`w-full flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedFactor?.id === factor.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getFactorIcon(factor.factor_type)}
                    <div className="text-left">
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
                    {selectedFactor?.id === factor.id && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification Form */}
      {selectedFactor && challenge && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Enter Verification Code
              </CardTitle>
              <CardDescription>
                {selectedFactor.factor_type === "totp"
                  ? "Enter the 6-digit code from your authenticator app"
                  : "Enter the verification code sent to your email"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Challenge expires in: {formatTime(timeLeft)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendChallenge}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend
                </Button>
              </div>

              {/* Code Input */}
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Verification Code</Label>
                <Input
                  id="mfa-code"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-lg font-mono tracking-wider"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerification}
                  disabled={
                    loading || verificationCode.length !== 6 || timeLeft === 0
                  }
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && !challenge && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Setting up security challenge...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Card className="border-muted">
        <CardContent className="pt-4">
          <div className="text-sm space-y-2">
            <h4 className="font-medium">Having trouble?</h4>
            <ul className="text-muted-foreground space-y-1">
              <li>• Make sure your device's time is synchronized</li>
              <li>
                • For TOTP: Check that your authenticator app is showing the
                latest code
              </li>
              <li>
                • For email: Check your spam folder if you don't see the code
              </li>
              <li>• Try refreshing the challenge if it has expired</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

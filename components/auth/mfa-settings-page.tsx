"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Settings,
  Key,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { mfaService } from "@/lib/auth/mfa-service";
import { EnhancedMFASetup } from "./enhanced-mfa-setup";
import { BackupCodes } from "./backup-codes";
import { motion } from "framer-motion";

interface MFAStatus {
  enabled: boolean;
  factorCount: number;
  recommendations: string[];
  assuranceLevel: string;
}

interface MFASettingsPageProps {
  onBack?: () => void;
}

export function MFASettingsPage({ onBack }: MFASettingsPageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MFAStatus>({
    enabled: false,
    factorCount: 0,
    recommendations: [],
    assuranceLevel: "aal1",
  });
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadMFAStatus();
    }
  }, [user]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadMFAStatus = async () => {
    setLoading(true);
    try {
      const mfaStatus = await mfaService.getMFAStatus();
      setStatus(mfaStatus);
    } catch (error: any) {
      console.error("Error loading MFA status:", error);
      setMessage({
        type: "error",
        text: "Failed to load MFA status",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMFAUpdate = () => {
    // Refresh status when MFA setup changes
    loadMFAStatus();
    setMessage({
      type: "success",
      text: "MFA configuration updated successfully",
    });
  };

  const getSecurityLevel = () => {
    if (status.factorCount > 0 && status.assuranceLevel === "aal2") {
      return {
        level: "Excellent",
        color: "text-green-600",
        bgColor: "bg-green-100",
        icon: <ShieldCheck className="h-5 w-5" />,
        description: "Your account has maximum security protection",
      };
    } else if (status.factorCount > 0) {
      return {
        level: "Good",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        icon: <Shield className="h-5 w-5" />,
        description:
          "Your account has additional security, but can be improved",
      };
    } else {
      return {
        level: "Basic",
        color: "text-red-600",
        bgColor: "bg-red-100",
        icon: <ShieldX className="h-5 w-5" />,
        description: "Your account needs additional security measures",
      };
    }
  };

  const securityLevel = getSecurityLevel();

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Account Security Settings
              </CardTitle>
              <CardDescription>
                Manage your multi-factor authentication and security preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
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
              <ShieldX className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {securityLevel.icon}
            Security Level: {securityLevel.level}
          </CardTitle>
          <CardDescription>{securityLevel.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {status.factorCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  Authentication Methods
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {status.assuranceLevel.toUpperCase()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Assurance Level
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${securityLevel.color} ${securityLevel.bgColor}`}
                >
                  {securityLevel.level}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Overall Status
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {status.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  Security Recommendations:
                </h4>
                <div className="space-y-2">
                  {status.recommendations.map((recommendation, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      {recommendation}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="mfa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mfa" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Authentication Methods
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Backup Codes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mfa" className="space-y-6">
          <EnhancedMFASetup />
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <BackupCodes
            onCodesGenerated={() => {
              setMessage({
                type: "success",
                text: "Backup codes generated! Make sure to save them securely.",
              });
            }}
            onCodesDownloaded={() => {
              setMessage({
                type: "info",
                text: "Backup codes downloaded successfully. Store them in a secure location.",
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Security Tips */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">Security Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium">
                    Use multiple authentication methods
                  </p>
                  <p className="text-muted-foreground">
                    Set up both TOTP and backup codes for redundancy
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Key className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium">Secure backup codes</p>
                  <p className="text-muted-foreground">
                    Store backup codes in a password manager or secure vault
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Smartphone className="h-4 w-4 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium">Keep devices secure</p>
                  <p className="text-muted-foreground">
                    Use device locks and biometric authentication when possible
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RefreshCw className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium">Regular security checkups</p>
                  <p className="text-muted-foreground">
                    Review and update your security settings periodically
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

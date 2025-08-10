"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  Download,
  Copy,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Printer,
  Key,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BackupCodesProps {
  onCodesGenerated?: (codes: string[]) => void;
  onCodesDownloaded?: () => void;
}

interface BackupCodeStatus {
  generated: boolean;
  totalCodes: number;
  usedCodes: number;
  lastGenerated?: string;
}

export function BackupCodes({
  onCodesGenerated,
  onCodesDownloaded,
}: BackupCodesProps) {
  const [codes, setCodes] = useState<string[]>([]);
  const [status, setStatus] = useState<BackupCodeStatus>({
    generated: false,
    totalCodes: 0,
    usedCodes: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const [codesRevealed, setCodesRevealed] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadBackupCodeStatus();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadBackupCodeStatus = async () => {
    // In a real implementation, this would fetch from the API
    // For now, we'll use local storage to simulate the status
    try {
      const storedStatus = localStorage.getItem("backup_codes_status");
      if (storedStatus) {
        setStatus(JSON.parse(storedStatus));
      }
    } catch (error) {
      console.error("Error loading backup code status:", error);
    }
  };

  const generateBackupCodes = async () => {
    setLoading(true);
    try {
      // Simulate API call to generate backup codes
      const newCodes = Array.from({ length: 8 }, () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
      });

      setCodes(newCodes);
      const newStatus = {
        generated: true,
        totalCodes: newCodes.length,
        usedCodes: 0,
        lastGenerated: new Date().toISOString(),
      };
      setStatus(newStatus);

      // Store status (in real implementation, this would be stored server-side)
      localStorage.setItem("backup_codes_status", JSON.stringify(newStatus));

      setMessage({
        type: "success",
        text: "Backup codes generated successfully! Make sure to save them in a secure location.",
      });

      setShowCodes(true);
      onCodesGenerated?.(newCodes);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: `Failed to generate backup codes: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateBackupCodes = async () => {
    if (
      !confirm(
        "Are you sure you want to regenerate your backup codes? This will invalidate all existing codes.",
      )
    ) {
      return;
    }

    await generateBackupCodes();
    setMessage({
      type: "warning",
      text: "New backup codes generated. Previous codes are now invalid.",
    });
  };

  const downloadBackupCodes = () => {
    if (codes.length === 0) return;

    const content = `EstimatePro Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Store these codes in a secure location. Each code can only be used once.

${codes.map((code, index) => `${index + 1}. ${code}`).join("\n")}

Instructions:
- Use these codes if you lose access to your authenticator device
- Each code can only be used once
- Generate new codes if you use all of them
- Keep these codes secure and private

EstimatePro Security Team`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `estimatepro-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setMessage({
      type: "success",
      text: "Backup codes downloaded successfully!",
    });

    onCodesDownloaded?.();
  };

  const printBackupCodes = () => {
    if (codes.length === 0) return;

    const printContent = `
      <html>
        <head>
          <title>EstimatePro Backup Codes</title>
          <style>
            body { font-family: monospace; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .codes { list-style: none; padding: 0; }
            .codes li { margin: 10px 0; padding: 10px; border: 1px dashed #ccc; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>EstimatePro Backup Codes</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="warning">
            <strong>IMPORTANT:</strong> Store these codes in a secure location. Each code can only be used once.
          </div>
          
          <ol class="codes">
            ${codes.map((code) => `<li>${code}</li>`).join("")}
          </ol>
          
          <div class="warning">
            <h3>Instructions:</h3>
            <ul>
              <li>Use these codes if you lose access to your authenticator device</li>
              <li>Each code can only be used once</li>
              <li>Generate new codes if you use all of them</li>
              <li>Keep these codes secure and private</li>
            </ul>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow?.document.write(printContent);
    printWindow?.document.close();
    printWindow?.print();

    setMessage({
      type: "info",
      text: "Print dialog opened. Remember to store the printed codes securely!",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({
      type: "success",
      text: "Copied to clipboard",
    });
  };

  const copyAllCodes = () => {
    const allCodes = codes.join("\n");
    copyToClipboard(allCodes);
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

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Backup Codes Status
          </CardTitle>
          <CardDescription>
            Single-use backup codes for account recovery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge variant={status.generated ? "default" : "destructive"}>
                    {status.generated ? "Generated" : "Not Generated"}
                  </Badge>
                </div>
                {status.generated && (
                  <div className="text-sm text-muted-foreground">
                    Codes: {status.totalCodes - status.usedCodes} unused,{" "}
                    {status.usedCodes} used
                    {status.lastGenerated && (
                      <span className="ml-2">
                        • Last generated:{" "}
                        {new Date(status.lastGenerated).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!status.generated && (
              <div className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You don't have backup codes generated. We recommend creating
                    them now in case you lose access to your authenticator
                    device.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={generateBackupCodes}
                  disabled={loading}
                  className="w-full"
                >
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
            )}

            {status.generated && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Dialog open={showCodes} onOpenChange={setShowCodes}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        <Eye className="h-4 w-4 mr-2" />
                        View Codes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Lock className="h-5 w-5" />
                          Your Backup Codes
                        </DialogTitle>
                        <DialogDescription>
                          Each code can only be used once. Store them securely!
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        {codes.length > 0 && (
                          <>
                            <Alert>
                              <Shield className="h-4 w-4" />
                              <AlertDescription>
                                These codes are only shown once. Make sure to
                                save them before closing this dialog.
                              </AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  Backup Codes:
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setCodesRevealed(!codesRevealed)
                                  }
                                >
                                  {codesRevealed ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <div className="space-y-1">
                                {codes.map((code, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-muted rounded font-mono text-sm"
                                  >
                                    <span>
                                      {index + 1}.{" "}
                                      {codesRevealed ? code : "••••••"}
                                    </span>
                                    {codesRevealed && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => copyToClipboard(code)}
                                        className="h-6 w-6 p-0"
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {codesRevealed && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={copyAllCodes}
                                  className="flex-1"
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy All
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={downloadBackupCodes}
                                  className="flex-1"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={printBackupCodes}
                                  className="flex-1"
                                >
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    onClick={regenerateBackupCodes}
                    disabled={loading}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </Button>
                </div>

                {status.usedCodes > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      You've used {status.usedCodes} of your backup codes.{" "}
                      {status.totalCodes - status.usedCodes <= 2 && (
                        <strong>
                          Consider generating new codes as you're running low.
                        </strong>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">About Backup Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-3">
            <div className="flex items-start gap-3">
              <Key className="h-4 w-4 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">Single-use codes</p>
                <p className="text-muted-foreground">
                  Each backup code can only be used once to sign in to your
                  account
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-4 w-4 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">Secure storage</p>
                <p className="text-muted-foreground">
                  Store your codes in a secure location like a password manager
                  or safe
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RefreshCw className="h-4 w-4 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium">Regular regeneration</p>
                <p className="text-muted-foreground">
                  Generate new codes periodically or when running low
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

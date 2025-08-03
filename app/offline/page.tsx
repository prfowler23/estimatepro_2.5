// PHASE 3 FIX: Enhanced Offline Page Component
"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  WifiOff,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  FileText,
  Calculator,
  Camera,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { offlineManager, OfflineStatus } from "@/lib/pwa/offline-manager";
import { PWAStatus } from "@/components/pwa/pwa-status";

export default function OfflinePage() {
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>(
    offlineManager.getStatus(),
  );
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryProgress, setRetryProgress] = useState(0);

  useEffect(() => {
    // Subscribe to offline status changes
    const unsubscribe = offlineManager.subscribe(setOfflineStatus);

    // Check connection periodically
    const interval = setInterval(() => {
      setOfflineStatus(offlineManager.getStatus());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    setRetryProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setRetryProgress((prev) => Math.min(prev + 10, 90));
    }, 100);

    try {
      // Force a network check
      const response = await fetch("/api/health", {
        method: "GET",
        cache: "no-cache",
      });

      clearInterval(progressInterval);
      setRetryProgress(100);

      if (response.ok) {
        // Connection restored, attempt sync
        await offlineManager.sync();

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setRetryProgress(0);
    } finally {
      setTimeout(() => {
        setIsRetrying(false);
        setRetryProgress(0);
      }, 2000);
    }
  };

  const handleSyncPendingActions = async () => {
    if (navigator.onLine) {
      await offlineManager.sync();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <motion.div
            animate={{
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
            className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center"
          >
            <WifiOff className="w-12 h-12 text-blue-600" />
          </motion.div>

          <h1 className="text-4xl font-bold text-gray-900">
            You&apos;re Working Offline
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Don&apos;t worry! EstimatePro works offline. You can continue
            working, and your changes will automatically sync when you&apos;re
            back online.
          </p>
        </motion.div>

        {/* Connection Status Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <CloudOff className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Connection Status</h2>
                  <p className="text-gray-600">Currently offline</p>
                </div>
              </div>

              <Button
                onClick={handleRetryConnection}
                disabled={isRetrying}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isRetrying ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {isRetrying ? "Checking..." : "Check Connection"}
              </Button>
            </div>

            {isRetrying && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-6"
              >
                <Progress value={retryProgress} className="h-2" />
                <p className="text-sm text-gray-600 mt-2">
                  Testing connection...
                </p>
              </motion.div>
            )}

            {/* Pending Actions */}
            {offlineStatus.pendingActions > 0 && (
              <Alert className="bg-blue-50 border-blue-200">
                <Clock className="w-4 h-4 text-blue-600" />
                <div className="ml-2">
                  <h4 className="font-semibold text-blue-800">
                    Pending Changes
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    You have {offlineStatus.pendingActions} changes waiting to
                    sync.
                    {offlineStatus.lastSync && (
                      <>
                        {" "}
                        Last synced{" "}
                        {new Date(offlineStatus.lastSync).toLocaleTimeString()}.
                      </>
                    )}
                  </p>
                  {navigator.onLine && (
                    <Button
                      size="sm"
                      onClick={handleSyncPendingActions}
                      disabled={offlineStatus.syncInProgress}
                    >
                      {offlineStatus.syncInProgress ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 mr-1" />
                          Sync Now
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </Alert>
            )}
          </Card>
        </motion.div>

        {/* Available Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">
              What You Can Do Offline
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Available Features */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer"
              >
                <Link href="/estimates/new/guided" className="block">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-green-900">
                        Create Estimates
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        Use the guided flow to create new estimates with full
                        offline support
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer"
              >
                <Link href="/calculator" className="block">
                  <div className="flex items-start gap-3">
                    <Calculator className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-green-900">
                        Service Calculator
                      </h3>
                      <p className="text-sm text-green-700 mt-1">
                        Access all 11 service calculators for real-time pricing
                      </p>
                    </div>
                  </div>
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <Camera className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-900">
                      Photo Analysis
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Take photos and prepare them for AI analysis when online
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-900">
                      View Estimates
                    </h3>
                    <p className="text-sm text-green-700 mt-1">
                      Access previously downloaded estimates and data
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Limited Features */}
              <motion.div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg opacity-75">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-900">
                      AI Features (Limited)
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      AI analysis will be queued and processed when online
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg opacity-75">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-900">
                      Data Sync (Queued)
                    </h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Changes will be saved locally and synced automatically
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </Card>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-4"
        >
          <Button variant="outline" asChild className="flex items-center gap-2">
            <Link href="/dashboard">
              <Home className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </Button>

          <Button asChild className="flex items-center gap-2">
            <Link href="/estimates/new/guided">
              <FileText className="w-4 h-4" />
              Create New Estimate
            </Link>
          </Button>
        </motion.div>

        {/* PWA Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <PWAStatus showDetails={true} />
        </motion.div>
      </div>
    </div>
  );
}

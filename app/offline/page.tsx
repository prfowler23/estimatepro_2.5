// Offline Page
// Fallback page when user is offline and content is not cached

"use client";

import React, { useState, useEffect } from "react";
import {
  WifiOff,
  RefreshCw,
  Home,
  Calculator,
  FileText,
  Users,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useOfflineStatus, useOfflineActions } from "@/hooks/use-offline";

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const { isOnline, pendingActions, syncInProgress } = useOfflineStatus();
  const { actions } = useOfflineActions();

  const handleRetry = async () => {
    setIsRetrying(true);

    // Wait a bit to show loading state
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Try to reload the page
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const handleGoToSection = (path: string) => {
    window.location.href = path;
  };

  // Available offline sections
  const offlineSections = [
    {
      title: "Dashboard",
      description: "View cached estimates and analytics",
      icon: <Home className="w-5 h-5" />,
      path: "/dashboard",
    },
    {
      title: "Calculator",
      description: "Use service calculators offline",
      icon: <Calculator className="w-5 h-5" />,
      path: "/calculator",
    },
    {
      title: "Estimates",
      description: "Access cached estimates",
      icon: <FileText className="w-5 h-5" />,
      path: "/estimates",
    },
    {
      title: "Customers",
      description: "View customer information",
      icon: <Users className="w-5 h-5" />,
      path: "/customers",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold">EstimatePro</h1>
                <p className="text-sm text-gray-600">Offline Mode</p>
              </div>
            </div>
            <Badge
              variant={isOnline ? "default" : "destructive"}
              className="flex items-center space-x-1"
            >
              {isOnline ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            You&apos;re Currently Offline
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            This page is not available offline, but you can still access cached
            content and use many features.
          </p>
        </div>

        {/* Connection Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Network Status</p>
                  <p className="text-sm text-gray-600">
                    {isOnline
                      ? "Connected to internet"
                      : "No internet connection"}
                  </p>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Pending Actions</p>
                  <p className="text-sm text-gray-600">
                    {pendingActions === 0
                      ? "No pending actions"
                      : `${pendingActions} actions waiting`}
                  </p>
                </div>
                <Badge variant="outline">{pendingActions}</Badge>
              </div>
            </div>

            {syncInProgress && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center space-x-2 mb-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Syncing data...</span>
                </div>
                <Progress value={60} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offline Actions */}
        {actions.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {actions.slice(0, 5).map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {action.type.charAt(0).toUpperCase() +
                          action.type.slice(1)}{" "}
                        {action.resource}
                      </p>
                      <p className="text-xs text-gray-600">
                        {new Date(action.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {action.retryCount > 0
                        ? `Retry ${action.retryCount}`
                        : "Pending"}
                    </Badge>
                  </div>
                ))}
                {actions.length > 5 && (
                  <p className="text-sm text-gray-600 text-center">
                    ... and {actions.length - 5} more actions
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Sections */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Available Offline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offlineSections.map((section) => (
                <div
                  key={section.title}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleGoToSection(section.path)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {section.icon}
                    </div>
                    <div>
                      <h3 className="font-medium">{section.title}</h3>
                      <p className="text-sm text-gray-600">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center space-x-2"
          >
            {isRetrying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{isRetrying ? "Retrying..." : "Retry Connection"}</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleGoHome}
            className="flex items-center space-x-2"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </Button>
        </div>

        {/* Tips */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Offline Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p>
                  You can still use the calculator and view cached estimates
                  while offline.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p>
                  Any changes you make will be synchronized when you&apos;re
                  back online.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p>
                  The app will automatically retry failed actions when your
                  connection returns.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p>
                  Install the app to your home screen for better offline
                  experience.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

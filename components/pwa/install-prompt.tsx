// Install Prompt Component
// PWA installation prompt and app management

"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  X,
  Smartphone,
  Monitor,
  Zap,
  Shield,
  Wifi,
  Bell,
  Star,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Install prompt interface
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [installSupported, setInstallSupported] = useState(false);

  useEffect(() => {
    // Check if PWA is already installed
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInIOSApp = isIOS && (window.navigator as any).standalone;

    setIsInstalled(isStandalone || isInIOSApp);
    setInstallSupported(
      "serviceWorker" in navigator && "BeforeInstallPromptEvent" in window,
    );

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Show prompt after a delay if not dismissed
      setTimeout(() => {
        if (!isInstalled && !localStorage.getItem("pwa-install-dismissed")) {
          setShowPrompt(true);
        }
      }, 10000); // Show after 10 seconds
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowPrompt(false);
      localStorage.setItem("pwa-installed", "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("PWA installation accepted");
        setShowPrompt(false);
        setShowDetails(false);
      } else {
        console.log("PWA installation dismissed");
      }

      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error("Installation failed:", error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  const handleShowDetails = () => {
    setShowDetails(true);
    setShowPrompt(false);
  };

  // PWA features
  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Lightning Fast",
      description: "Instant loading with offline support",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Secure",
      description: "HTTPS encryption and secure data storage",
    },
    {
      icon: <Wifi className="w-5 h-5" />,
      title: "Works Offline",
      description: "Continue working even without internet",
    },
    {
      icon: <Bell className="w-5 h-5" />,
      title: "Push Notifications",
      description: "Stay updated with real-time alerts",
    },
    {
      icon: <Monitor className="w-5 h-5" />,
      title: "Native Experience",
      description: "App-like experience on any device",
    },
    {
      icon: <Smartphone className="w-5 h-5" />,
      title: "Cross-Platform",
      description: "Works on desktop, mobile, and tablet",
    },
  ];

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <>
      {/* Floating install prompt */}
      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
          <Card className="shadow-lg border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Install EstimatePro</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Get the full app experience with offline support
                  </p>
                  <div className="flex items-center space-x-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleInstall}
                      className="text-xs"
                    >
                      Install
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowDetails}
                      className="text-xs"
                    >
                      Learn More
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Install details dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Download className="w-5 h-5 mr-2" />
              Install EstimatePro App
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* App preview */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold">EstimatePro</h2>
              <p className="text-gray-600">
                Professional Building Services Estimation
              </p>
              <div className="flex items-center justify-center space-x-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
                <span className="text-sm text-gray-600 ml-2">
                  4.9 • Progressive Web App
                </span>
              </div>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                    <p className="text-xs text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Installation benefits */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2 flex items-center">
                <Check className="w-4 h-4 text-green-600 mr-2" />
                Why Install?
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Faster loading times with intelligent caching</li>
                <li>• Work offline when internet is unavailable</li>
                <li>• Home screen access without browser clutter</li>
                <li>• Push notifications for important updates</li>
                <li>• Automatic updates in the background</li>
                <li>• Uses less storage than traditional apps</li>
              </ul>
            </div>

            {/* System requirements */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">
                System Requirements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium">Desktop</h4>
                  <ul className="text-gray-600 mt-1">
                    <li>Chrome 67+</li>
                    <li>Firefox 68+</li>
                    <li>Edge 79+</li>
                    <li>Safari 14+</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium">Mobile</h4>
                  <ul className="text-gray-600 mt-1">
                    <li>Android 5.0+</li>
                    <li>iOS 14.0+</li>
                    <li>Chrome Mobile 67+</li>
                    <li>Safari Mobile 14+</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Privacy and security */}
            <div className="text-center text-sm text-gray-600">
              <p>
                <Shield className="w-4 h-4 inline mr-1" />
                Your data is encrypted and stored securely. No personal
                information is shared.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center space-x-3">
              <Button onClick={handleInstall} className="px-8">
                <Download className="w-4 h-4 mr-2" />
                Install Now
              </Button>
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Install status component for settings
export const InstallStatus: React.FC = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSupported, setInstallSupported] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInIOSApp = isIOS && (window.navigator as any).standalone;

    setIsInstalled(isStandalone || isInIOSApp);
    setInstallSupported("serviceWorker" in navigator);
  }, []);

  const getInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    if (isIOS) {
      return (
        <div className="text-sm text-gray-600">
          <p>To install on iOS:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Tap the Share button in Safari</li>
            <li>Select &quot;Add to Home Screen&quot;</li>
            <li>Tap &quot;Add&quot; to confirm</li>
          </ol>
        </div>
      );
    }

    if (isAndroid) {
      return (
        <div className="text-sm text-gray-600">
          <p>To install on Android:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Tap the menu button (⋮) in Chrome</li>
            <li>Select &quot;Add to Home screen&quot;</li>
            <li>Tap &quot;Add&quot; to confirm</li>
          </ol>
        </div>
      );
    }

    return (
      <div className="text-sm text-gray-600">
        <p>To install on Desktop:</p>
        <ol className="list-decimal list-inside mt-1 space-y-1">
          <li>Look for the install icon in your browser&apos;s address bar</li>
          <li>Click it and select &quot;Install&quot;</li>
          <li>The app will open in its own window</li>
        </ol>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Smartphone className="w-5 h-5 mr-2" />
          App Installation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Installation Status</p>
            <p className="text-sm text-gray-600">
              {isInstalled
                ? "EstimatePro is installed"
                : "EstimatePro is not installed"}
            </p>
          </div>
          <Badge variant={isInstalled ? "default" : "outline"}>
            {isInstalled ? "Installed" : "Not Installed"}
          </Badge>
        </div>

        {installSupported && (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">PWA Support</p>
              <p className="text-sm text-gray-600">
                Your browser supports Progressive Web Apps
              </p>
            </div>
            <Badge variant="outline">
              <Check className="w-3 h-3 mr-1" />
              Supported
            </Badge>
          </div>
        )}

        {!isInstalled && installSupported && (
          <div className="pt-4 border-t">{getInstallInstructions()}</div>
        )}

        {isInstalled && (
          <div className="pt-4 border-t">
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              <span>
                You&apos;re using the installed version of EstimatePro
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InstallPrompt;

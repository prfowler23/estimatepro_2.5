/**
 * Enhanced Install Prompt Component
 * Beautiful, informative PWA installation prompt with feature highlights
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Smartphone,
  Wifi,
  Bell,
  Zap,
  X,
  Check,
  Star,
} from "lucide-react";

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
  className?: string;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt({
  onInstall,
  onDismiss,
  className = "",
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installStep, setInstallStep] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after a delay to avoid being intrusive
      setTimeout(() => {
        if (!localStorage.getItem("pwa-install-dismissed")) {
          setShowPrompt(true);
        }
      }, 5000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowPrompt(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    setInstallStep(1);

    try {
      await deferredPrompt.prompt();

      setInstallStep(2);
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setInstallStep(3);
        setTimeout(() => {
          setShowPrompt(false);
          onInstall?.();
        }, 2000);
      } else {
        setIsInstalling(false);
        setInstallStep(0);
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error("Installation failed:", error);
      setIsInstalling(false);
      setInstallStep(0);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    onDismiss?.();
  };

  const features = [
    {
      icon: Wifi,
      title: "Works Offline",
      description: "Continue working even without internet connection",
    },
    {
      icon: Bell,
      title: "Push Notifications",
      description: "Get notified about important updates instantly",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Native app performance with instant loading",
    },
    {
      icon: Smartphone,
      title: "Mobile Optimized",
      description: "Perfect experience on all your devices",
    },
  ];

  const installSteps = [
    "Preparing installation...",
    "Waiting for user confirmation...",
    "Installing EstimatePro...",
    "Installation complete!",
  ];

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50 ${className}`}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full mx-4 sm:mx-0 overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
                disabled={isInstalling}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <img
                    src="/icon-192x192.svg"
                    alt="EstimatePro"
                    className="w-10 h-10"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-xl">Install EstimatePro</h3>
                  <p className="text-blue-100 text-sm">
                    Get the full app experience
                  </p>
                </div>
              </div>

              {/* Rating display */}
              <div className="flex items-center mt-4 space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-current text-yellow-400"
                  />
                ))}
                <span className="ml-2 text-sm text-blue-100">
                  Trusted by 1000+ contractors
                </span>
              </div>
            </div>

            {/* Installation progress */}
            <AnimatePresence>
              {isInstalling && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-blue-50 border-b border-blue-100"
                >
                  <div className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-8 h-8 border-2 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                        {installStep === 3 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {installSteps[installStep]}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <motion.div
                            className="bg-blue-600 h-1.5 rounded-full"
                            initial={{ width: "0%" }}
                            animate={{
                              width: `${((installStep + 1) / 4) * 100}%`,
                            }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Features */}
            {!isInstalling && (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="text-center"
                    >
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <feature.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <h4 className="font-medium text-sm text-gray-900">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {feature.description}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Benefits list */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-sm text-gray-900 mb-3">
                    Why install the app?
                  </h4>
                  <ul className="space-y-2">
                    {[
                      "Faster loading and better performance",
                      "Works completely offline",
                      "Push notifications for updates",
                      "Easy access from your home screen",
                      "More storage for your estimates",
                    ].map((benefit, index) => (
                      <motion.li
                        key={benefit}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        className="flex items-center text-sm text-gray-700"
                      >
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {benefit}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInstall}
                    disabled={!deferredPrompt}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center space-x-2 hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App</span>
                  </motion.button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Later
                  </button>
                </div>

                {/* Privacy note */}
                <p className="text-xs text-gray-500 text-center mt-4">
                  No data is shared during installation. You can uninstall
                  anytime.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InstallPrompt;

/**
 * Mobile Gesture Provider
 *
 * Global provider for managing touch gestures, haptic feedback,
 * and mobile interaction patterns across the application.
 *
 * Features:
 * - Global gesture configuration
 * - Haptic feedback management
 * - Device capability detection
 * - Performance monitoring
 * - Accessibility compliance
 * - Battery-aware optimizations
 *
 * Part of Phase 4 Priority 2: Advanced Touch Gestures & Haptic Feedback
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

interface DeviceCapabilities {
  isMobile: boolean;
  isTablet: boolean;
  hasTouch: boolean;
  hasHapticFeedback: boolean;
  hasVibration: boolean;
  hasSpeechRecognition: boolean;
  hasCamera: boolean;
  maxTouchPoints: number;
  screenSize: {
    width: number;
    height: number;
    orientation: "portrait" | "landscape";
  };
  batteryLevel?: number;
  memoryGB?: number;
  connectionType?: string;
}

interface GestureSettings {
  enableHapticFeedback: boolean;
  hapticIntensity: "light" | "medium" | "heavy";
  enableVoiceInput: boolean;
  enableCameraInput: boolean;
  gestureThresholds: {
    swipeThreshold: number;
    panThreshold: number;
    pinchThreshold: number;
    longPressDelay: number;
  };
  performanceMode: "battery-saver" | "balanced" | "performance";
  accessibilityMode: boolean;
}

interface GestureMetrics {
  totalGestures: number;
  gestureTypes: Record<string, number>;
  averageResponseTime: number;
  errorRate: number;
  hapticUsage: number;
  batteryImpact: number;
}

interface MobileGestureContextValue {
  deviceCapabilities: DeviceCapabilities;
  gestureSettings: GestureSettings;
  gestureMetrics: GestureMetrics;
  updateSettings: (settings: Partial<GestureSettings>) => void;
  triggerGlobalHaptic: (
    type: "selection" | "impact" | "notification",
    intensity?: "light" | "medium" | "heavy",
  ) => void;
  resetMetrics: () => void;
  optimizeForBattery: () => void;
  optimizeForPerformance: () => void;
  enableAccessibilityMode: () => void;
}

const MobileGestureContext = createContext<MobileGestureContextValue | null>(
  null,
);

interface MobileGestureProviderProps {
  children: React.ReactNode;
  initialSettings?: Partial<GestureSettings>;
  enableMetrics?: boolean;
  enableAutoOptimization?: boolean;
}

const DEFAULT_GESTURE_SETTINGS: GestureSettings = {
  enableHapticFeedback: true,
  hapticIntensity: "light",
  enableVoiceInput: false,
  enableCameraInput: false,
  gestureThresholds: {
    swipeThreshold: 50,
    panThreshold: 10,
    pinchThreshold: 0.1,
    longPressDelay: 500,
  },
  performanceMode: "balanced",
  accessibilityMode: false,
};

/**
 * Mobile Gesture Provider Component
 */
export function MobileGestureProvider({
  children,
  initialSettings = {},
  enableMetrics = true,
  enableAutoOptimization = true,
}: MobileGestureProviderProps) {
  const [deviceCapabilities, setDeviceCapabilities] =
    useState<DeviceCapabilities>({
      isMobile: false,
      isTablet: false,
      hasTouch: false,
      hasHapticFeedback: false,
      hasVibration: false,
      hasSpeechRecognition: false,
      hasCamera: false,
      maxTouchPoints: 0,
      screenSize: {
        width: 0,
        height: 0,
        orientation: "portrait",
      },
    });

  const [gestureSettings, setGestureSettings] = useState<GestureSettings>({
    ...DEFAULT_GESTURE_SETTINGS,
    ...initialSettings,
  });

  const [gestureMetrics, setGestureMetrics] = useState<GestureMetrics>({
    totalGestures: 0,
    gestureTypes: {},
    averageResponseTime: 0,
    errorRate: 0,
    hapticUsage: 0,
    batteryImpact: 0,
  });

  /**
   * Detect device capabilities on mount
   */
  useEffect(() => {
    const detectCapabilities = async () => {
      const capabilities: DeviceCapabilities = {
        isMobile: window.innerWidth < 768,
        isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
        hasTouch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
        hasHapticFeedback: "vibrate" in navigator,
        hasVibration: "vibrate" in navigator,
        hasSpeechRecognition:
          "webkitSpeechRecognition" in window || "SpeechRecognition" in window,
        hasCamera: false, // Will be detected asynchronously
        maxTouchPoints: navigator.maxTouchPoints || 0,
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight,
          orientation:
            window.innerWidth > window.innerHeight ? "landscape" : "portrait",
        },
      };

      // Detect additional capabilities
      if ("deviceMemory" in navigator) {
        capabilities.memoryGB = (navigator as any).deviceMemory;
      }

      // Detect connection type
      if ("connection" in navigator) {
        const connection = (navigator as any).connection;
        capabilities.connectionType = connection.effectiveType;
      }

      // Detect camera access (requires permission)
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          capabilities.hasCamera = true;
        }
      } catch (error) {
        console.warn("Camera detection failed:", error);
      }

      // Detect battery level
      if ("getBattery" in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          capabilities.batteryLevel = Math.round(battery.level * 100);
        } catch (error) {
          console.warn("Battery detection failed:", error);
        }
      }

      setDeviceCapabilities(capabilities);
    };

    detectCapabilities();

    // Listen for orientation changes
    const handleOrientationChange = () => {
      setDeviceCapabilities((prev) => ({
        ...prev,
        screenSize: {
          width: window.innerWidth,
          height: window.innerHeight,
          orientation:
            window.innerWidth > window.innerHeight ? "landscape" : "portrait",
        },
      }));
    };

    window.addEventListener("resize", handleOrientationChange);
    return () => window.removeEventListener("resize", handleOrientationChange);
  }, []);

  /**
   * Auto-optimization based on device capabilities
   */
  useEffect(() => {
    if (!enableAutoOptimization) return;

    const optimizeSettings = () => {
      const updates: Partial<GestureSettings> = {};

      // Battery optimization
      if (
        deviceCapabilities.batteryLevel !== undefined &&
        deviceCapabilities.batteryLevel < 20
      ) {
        updates.performanceMode = "battery-saver";
        updates.enableHapticFeedback = false;
        updates.hapticIntensity = "light";
      }

      // Memory optimization
      if (deviceCapabilities.memoryGB && deviceCapabilities.memoryGB < 4) {
        updates.performanceMode = "battery-saver";
      }

      // Connection optimization
      if (
        deviceCapabilities.connectionType === "2g" ||
        deviceCapabilities.connectionType === "slow-2g"
      ) {
        updates.performanceMode = "battery-saver";
      }

      // Apply optimizations
      if (Object.keys(updates).length > 0) {
        setGestureSettings((prev) => ({ ...prev, ...updates }));
      }
    };

    optimizeSettings();
  }, [deviceCapabilities, enableAutoOptimization]);

  /**
   * Update gesture settings
   */
  const updateSettings = useCallback(
    (updates: Partial<GestureSettings>) => {
      setGestureSettings((prev) => ({ ...prev, ...updates }));

      // Store settings in localStorage for persistence
      const updatedSettings = { ...gestureSettings, ...updates };
      localStorage.setItem(
        "mobile-gesture-settings",
        JSON.stringify(updatedSettings),
      );
    },
    [gestureSettings],
  );

  /**
   * Global haptic feedback handler
   */
  const triggerGlobalHaptic = useCallback(
    (
      type: "selection" | "impact" | "notification" = "impact",
      intensity?: "light" | "medium" | "heavy",
    ) => {
      if (
        !gestureSettings.enableHapticFeedback ||
        !deviceCapabilities.hasHapticFeedback
      ) {
        return;
      }

      const feedbackIntensity = intensity || gestureSettings.hapticIntensity;

      try {
        // Web Vibration API
        if ("vibrate" in navigator) {
          const patterns = {
            selection: { light: 10, medium: 15, heavy: 25 },
            impact: { light: 15, medium: 25, heavy: 40 },
            notification: {
              light: [10, 50, 10],
              medium: [15, 50, 15],
              heavy: [25, 50, 25],
            },
          };

          const pattern = patterns[type][feedbackIntensity];
          navigator.vibrate(pattern);

          // Update metrics
          if (enableMetrics) {
            setGestureMetrics((prev) => ({
              ...prev,
              hapticUsage: prev.hapticUsage + 1,
              batteryImpact:
                prev.batteryImpact +
                (typeof pattern === "number"
                  ? pattern
                  : pattern.reduce((a, b) => a + b, 0)) *
                  0.001,
            }));
          }
        }
      } catch (error) {
        console.warn("Haptic feedback failed:", error);
      }
    },
    [
      gestureSettings.enableHapticFeedback,
      gestureSettings.hapticIntensity,
      deviceCapabilities.hasHapticFeedback,
      enableMetrics,
    ],
  );

  /**
   * Reset gesture metrics
   */
  const resetMetrics = useCallback(() => {
    setGestureMetrics({
      totalGestures: 0,
      gestureTypes: {},
      averageResponseTime: 0,
      errorRate: 0,
      hapticUsage: 0,
      batteryImpact: 0,
    });
  }, []);

  /**
   * Battery optimization mode
   */
  const optimizeForBattery = useCallback(() => {
    updateSettings({
      performanceMode: "battery-saver",
      enableHapticFeedback: false,
      hapticIntensity: "light",
      gestureThresholds: {
        swipeThreshold: 60, // Higher threshold = less sensitive
        panThreshold: 15,
        pinchThreshold: 0.15,
        longPressDelay: 600,
      },
    });
  }, [updateSettings]);

  /**
   * Performance optimization mode
   */
  const optimizeForPerformance = useCallback(() => {
    updateSettings({
      performanceMode: "performance",
      enableHapticFeedback: true,
      hapticIntensity: "medium",
      gestureThresholds: {
        swipeThreshold: 40, // Lower threshold = more sensitive
        panThreshold: 8,
        pinchThreshold: 0.05,
        longPressDelay: 400,
      },
    });
  }, [updateSettings]);

  /**
   * Accessibility mode
   */
  const enableAccessibilityMode = useCallback(() => {
    updateSettings({
      accessibilityMode: true,
      enableHapticFeedback: true,
      hapticIntensity: "heavy",
      gestureThresholds: {
        swipeThreshold: 70, // Higher threshold for better accessibility
        panThreshold: 20,
        pinchThreshold: 0.2,
        longPressDelay: 800,
      },
    });
  }, [updateSettings]);

  /**
   * Load persisted settings on mount
   */
  useEffect(() => {
    const savedSettings = localStorage.getItem("mobile-gesture-settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setGestureSettings((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn("Failed to load gesture settings:", error);
      }
    }
  }, []);

  /**
   * Context value
   */
  const contextValue = useMemo(
    () => ({
      deviceCapabilities,
      gestureSettings,
      gestureMetrics,
      updateSettings,
      triggerGlobalHaptic,
      resetMetrics,
      optimizeForBattery,
      optimizeForPerformance,
      enableAccessibilityMode,
    }),
    [
      deviceCapabilities,
      gestureSettings,
      gestureMetrics,
      updateSettings,
      triggerGlobalHaptic,
      resetMetrics,
      optimizeForBattery,
      optimizeForPerformance,
      enableAccessibilityMode,
    ],
  );

  return (
    <MobileGestureContext.Provider value={contextValue}>
      {children}
    </MobileGestureContext.Provider>
  );
}

/**
 * Hook to use mobile gesture context
 */
export function useMobileGestures() {
  const context = useContext(MobileGestureContext);
  if (!context) {
    throw new Error(
      "useMobileGestures must be used within a MobileGestureProvider",
    );
  }
  return context;
}

/**
 * Hook for simplified haptic feedback
 */
export function useHapticFeedback() {
  const { triggerGlobalHaptic, deviceCapabilities, gestureSettings } =
    useMobileGestures();

  const canHaptic =
    deviceCapabilities.hasHapticFeedback &&
    gestureSettings.enableHapticFeedback;

  const haptic = useCallback(
    (
      type: "selection" | "impact" | "notification" = "impact",
      intensity?: "light" | "medium" | "heavy",
    ) => {
      if (canHaptic) {
        triggerGlobalHaptic(type, intensity);
      }
    },
    [canHaptic, triggerGlobalHaptic],
  );

  return {
    haptic,
    canHaptic,
    settings: gestureSettings,
  };
}

/**
 * Hook for device-aware conditionals
 */
export function useDeviceCapabilities() {
  const { deviceCapabilities } = useMobileGestures();

  return {
    ...deviceCapabilities,
    isTouch: deviceCapabilities.hasTouch,
    canVibrate: deviceCapabilities.hasVibration,
    canSpeak: deviceCapabilities.hasSpeechRecognition,
    hasCamera: deviceCapabilities.hasCamera,
    isLowMemory:
      (deviceCapabilities.memoryGB && deviceCapabilities.memoryGB < 4) || false,
    isLowBattery:
      (deviceCapabilities.batteryLevel &&
        deviceCapabilities.batteryLevel < 20) ||
      false,
    isSlowConnection:
      deviceCapabilities.connectionType === "2g" ||
      deviceCapabilities.connectionType === "slow-2g",
  };
}

/**
 * Gesture settings panel component for debugging/testing
 */
interface GestureSettingsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function GestureSettingsPanel({
  visible,
  onClose,
}: GestureSettingsPanelProps) {
  const {
    deviceCapabilities,
    gestureSettings,
    gestureMetrics,
    updateSettings,
    resetMetrics,
    optimizeForBattery,
    optimizeForPerformance,
    enableAccessibilityMode,
  } = useMobileGestures();

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Gesture Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Device Info */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Device Capabilities</h3>
          <div className="text-sm space-y-1 text-gray-600">
            <div>Mobile: {deviceCapabilities.isMobile ? "Yes" : "No"}</div>
            <div>Touch: {deviceCapabilities.hasTouch ? "Yes" : "No"}</div>
            <div>
              Haptics: {deviceCapabilities.hasHapticFeedback ? "Yes" : "No"}
            </div>
            <div>
              Voice: {deviceCapabilities.hasSpeechRecognition ? "Yes" : "No"}
            </div>
            <div>Camera: {deviceCapabilities.hasCamera ? "Yes" : "No"}</div>
            <div>Memory: {deviceCapabilities.memoryGB || "Unknown"}GB</div>
            <div>Battery: {deviceCapabilities.batteryLevel || "Unknown"}%</div>
          </div>
        </div>

        {/* Settings */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={gestureSettings.enableHapticFeedback}
                onChange={(e) =>
                  updateSettings({ enableHapticFeedback: e.target.checked })
                }
                className="mr-2"
              />
              Enable Haptic Feedback
            </label>

            <div>
              <label className="block text-sm font-medium mb-1">
                Haptic Intensity
              </label>
              <select
                value={gestureSettings.hapticIntensity}
                onChange={(e) =>
                  updateSettings({ hapticIntensity: e.target.value as any })
                }
                className="w-full border rounded px-2 py-1"
              >
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="heavy">Heavy</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Performance Mode
              </label>
              <select
                value={gestureSettings.performanceMode}
                onChange={(e) =>
                  updateSettings({ performanceMode: e.target.value as any })
                }
                className="w-full border rounded px-2 py-1"
              >
                <option value="battery-saver">Battery Saver</option>
                <option value="balanced">Balanced</option>
                <option value="performance">Performance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="font-medium mb-2">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={optimizeForBattery}
              className="w-full px-3 py-2 bg-orange-100 text-orange-800 rounded hover:bg-orange-200 text-sm"
            >
              Optimize for Battery
            </button>
            <button
              onClick={optimizeForPerformance}
              className="w-full px-3 py-2 bg-green-100 text-green-800 rounded hover:bg-green-200 text-sm"
            >
              Optimize for Performance
            </button>
            <button
              onClick={enableAccessibilityMode}
              className="w-full px-3 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 text-sm"
            >
              Enable Accessibility Mode
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Metrics</h3>
            <button
              onClick={resetMetrics}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Reset
            </button>
          </div>
          <div className="text-sm space-y-1 text-gray-600">
            <div>Total Gestures: {gestureMetrics.totalGestures}</div>
            <div>
              Avg Response: {gestureMetrics.averageResponseTime.toFixed(1)}ms
            </div>
            <div>Haptic Usage: {gestureMetrics.hapticUsage}</div>
            <div>
              Battery Impact: {gestureMetrics.batteryImpact.toFixed(3)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileGestureProvider;

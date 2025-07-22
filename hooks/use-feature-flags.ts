/**
 * React Hook for Feature Flags
 * Provides easy access to feature flags in React components
 */

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  featureFlagManager,
  type UserContext,
} from "@/lib/features/feature-flags";

export interface UseFeatureFlagsResult {
  isEnabled: (flagKey: string) => boolean;
  enabledFeatures: string[];
  loading: boolean;
  refresh: () => void;
}

/**
 * Hook to check if a single feature is enabled
 */
export function useFeatureFlag(flagKey: string): {
  isEnabled: boolean;
  loading: boolean;
} {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFlag = async () => {
      setLoading(true);
      try {
        const userContext: UserContext | undefined = user
          ? {
              userId: user.id,
              email: user.email || undefined,
              role: user.user_metadata?.role,
              customProperties: user.user_metadata,
            }
          : undefined;

        const enabled = await featureFlagManager.isEnabled(
          flagKey,
          userContext,
        );
        setIsEnabled(enabled);
      } catch (error) {
        console.error(`Error checking feature flag ${flagKey}:`, error);
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkFlag();
  }, [flagKey, user]);

  return { isEnabled, loading };
}

/**
 * Hook to get all enabled features
 */
export function useFeatureFlags(): UseFeatureFlagsResult {
  const { user } = useAuth();
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const userContext: UserContext | undefined = user
        ? {
            userId: user.id,
            email: user.email || undefined,
            role: user.user_metadata?.role,
            customProperties: user.user_metadata,
          }
        : undefined;

      const features = await featureFlagManager.getEnabledFeatures(userContext);
      setEnabledFeatures(features);
    } catch (error) {
      console.error("Error loading feature flags:", error);
      setEnabledFeatures([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const isEnabled = useCallback(
    (flagKey: string) => {
      return enabledFeatures.includes(flagKey);
    },
    [enabledFeatures],
  );

  const refresh = useCallback(() => {
    featureFlagManager.clearCache();
    loadFeatures();
  }, [loadFeatures]);

  return {
    isEnabled,
    enabledFeatures,
    loading,
    refresh,
  };
}

/**
 * Hook for conditional rendering based on feature flags
 */
export function useConditionalFeature<T>(
  flagKey: string,
  enabledValue: T,
  disabledValue: T,
): {
  value: T;
  loading: boolean;
} {
  const { isEnabled, loading } = useFeatureFlag(flagKey);

  return {
    value: isEnabled ? enabledValue : disabledValue,
    loading,
  };
}

/**
 * HOC to conditionally render components based on feature flags
 */
export function withFeatureFlag<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  flagKey: string,
  fallback?: React.ComponentType<P> | null,
) {
  return function FeatureFlagWrapper(props: P) {
    const { isEnabled, loading } = useFeatureFlag(flagKey);

    if (loading) {
      return React.createElement("div", {
        className: "animate-pulse bg-gray-200 h-8 w-32 rounded",
      });
    }

    if (!isEnabled) {
      return fallback ? React.createElement(fallback, props) : null;
    }

    return React.createElement(WrappedComponent, props);
  };
}

/**
 * Utility for checking feature flags outside of React components
 */
export async function checkFeatureFlag(
  flagKey: string,
  userContext?: UserContext,
): Promise<boolean> {
  return await featureFlagManager.isEnabled(flagKey, userContext);
}

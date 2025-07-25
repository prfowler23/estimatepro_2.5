/**
 * Advanced Feature Flag Management System
 * Supports dynamic feature flags, user-based flags, and A/B testing
 */

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/supabase";

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage?: number; // 0-100 for gradual rollouts
  userWhitelist?: string[]; // Specific user IDs
  userBlacklist?: string[]; // Blocked user IDs
  conditions?: FeatureFlagCondition[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface FeatureFlagCondition {
  type: "user_role" | "user_email" | "date_range" | "custom";
  operator: "equals" | "contains" | "starts_with" | "in" | "between";
  value: any;
}

export interface UserContext {
  userId?: string;
  email?: string;
  role?: string;
  customProperties?: Record<string, any>;
}

export class FeatureFlagManager {
  private supabase = createClientComponentClient<Database>();
  private flagCache: Map<string, FeatureFlag> = new Map();
  private cacheExpiry: Date = new Date(0);
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Static feature flags from environment variables
  private staticFlags: Record<string, boolean> = {
    ai: process.env.NEXT_PUBLIC_ENABLE_AI === "true",
    threeDimensional: process.env.NEXT_PUBLIC_ENABLE_3D === "true",
    weather: process.env.NEXT_PUBLIC_ENABLE_WEATHER === "true",
    drone: process.env.NEXT_PUBLIC_ENABLE_DRONE === "true",
    guidedFlow: process.env.NEXT_PUBLIC_ENABLE_GUIDED_FLOW === "true",
    collaboration: process.env.NEXT_PUBLIC_ENABLE_COLLABORATION === "true",
    aiAssistant: process.env.NEXT_PUBLIC_ENABLE_AI_ASSISTANT === "true",
    vendorManagement:
      process.env.NEXT_PUBLIC_ENABLE_VENDOR_MANAGEMENT === "true",
    pilotCertification:
      process.env.NEXT_PUBLIC_ENABLE_PILOT_CERTIFICATION === "true",
    mobileNavigation: process.env.NEXT_PUBLIC_ENABLE_MOBILE_NAV === "true",
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    monitoring: process.env.NEXT_PUBLIC_ENABLE_MONITORING === "true",
  };

  /**
   * Check if a feature is enabled for a specific user context
   */
  async isEnabled(
    flagKey: string,
    userContext?: UserContext,
  ): Promise<boolean> {
    // Check static flags first (for backwards compatibility)
    if (this.staticFlags.hasOwnProperty(flagKey)) {
      return this.staticFlags[flagKey];
    }

    // Check dynamic flags from database
    const flag = await this.getFlag(flagKey);

    if (!flag) {
      // Feature not found - default to disabled
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check user whitelist
    if (flag.userWhitelist && userContext?.userId) {
      if (flag.userWhitelist.includes(userContext.userId)) {
        return true;
      }
    }

    // Check user blacklist
    if (flag.userBlacklist && userContext?.userId) {
      if (flag.userBlacklist.includes(userContext.userId)) {
        return false;
      }
    }

    // Check conditions
    if (flag.conditions && userContext) {
      const conditionsMet = await this.evaluateConditions(
        flag.conditions,
        userContext,
      );
      if (!conditionsMet) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      if (userContext?.userId) {
        // Use user ID to create deterministic rollout
        const hash = this.hashUserId(userContext.userId);
        const userPercentage = hash % 100;
        return userPercentage < flag.rolloutPercentage;
      } else {
        // Random rollout for anonymous users
        return Math.random() * 100 < flag.rolloutPercentage;
      }
    }

    return true;
  }

  /**
   * Get all enabled features for a user
   */
  async getEnabledFeatures(userContext?: UserContext): Promise<string[]> {
    const enabledFeatures: string[] = [];

    // Check static flags
    for (const [key, enabled] of Object.entries(this.staticFlags)) {
      if (enabled) {
        enabledFeatures.push(key);
      }
    }

    // Check dynamic flags
    const dynamicFlags = await this.getAllFlags();
    for (const flag of dynamicFlags) {
      if (await this.isEnabled(flag.key, userContext)) {
        enabledFeatures.push(flag.key);
      }
    }

    return enabledFeatures;
  }

  /**
   * Get a specific feature flag
   */
  private async getFlag(key: string): Promise<FeatureFlag | null> {
    // Check cache first
    if (this.isCacheValid() && this.flagCache.has(key)) {
      return this.flagCache.get(key)!;
    }

    // For now, only support static flags since feature_flags table doesn't exist
    // In the future, this could be extended to use a database table
    if (key in this.staticFlags) {
      const flag: FeatureFlag = {
        key,
        name: key,
        description: `Static flag for ${key}`,
        enabled: this.staticFlags[key],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.flagCache.set(key, flag);
      return flag;
    }

    return null;
  }

  /**
   * Get all feature flags
   */
  private async getAllFlags(): Promise<FeatureFlag[]> {
    if (this.isCacheValid()) {
      return Array.from(this.flagCache.values());
    }

    // Return static flags only since feature_flags table doesn't exist
    const flags: FeatureFlag[] = Object.entries(this.staticFlags).map(
      ([key, enabled]) => ({
        key,
        name: key,
        description: `Static flag for ${key}`,
        enabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    // Update cache
    this.flagCache.clear();
    flags.forEach((flag) => this.flagCache.set(flag.key, flag));
    this.cacheExpiry = new Date(Date.now() + this.CACHE_TTL_MS);

    return flags;
  }

  /**
   * Evaluate feature flag conditions
   */
  private async evaluateConditions(
    conditions: FeatureFlagCondition[],
    userContext: UserContext,
  ): Promise<boolean> {
    for (const condition of conditions) {
      const conditionMet = await this.evaluateCondition(condition, userContext);
      if (!conditionMet) {
        return false; // All conditions must be met
      }
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: FeatureFlagCondition,
    userContext: UserContext,
  ): Promise<boolean> {
    let contextValue: any;

    switch (condition.type) {
      case "user_role":
        contextValue = userContext.role;
        break;
      case "user_email":
        contextValue = userContext.email;
        break;
      case "date_range":
        contextValue = new Date();
        break;
      case "custom":
        contextValue = userContext.customProperties;
        break;
      default:
        return false;
    }

    if (contextValue === undefined) {
      return false;
    }

    switch (condition.operator) {
      case "equals":
        return contextValue === condition.value;
      case "contains":
        return String(contextValue).includes(String(condition.value));
      case "starts_with":
        return String(contextValue).startsWith(String(condition.value));
      case "in":
        return (
          Array.isArray(condition.value) &&
          condition.value.includes(contextValue)
        );
      case "between":
        if (
          condition.type === "date_range" &&
          Array.isArray(condition.value) &&
          condition.value.length === 2
        ) {
          const date = new Date(contextValue);
          const start = new Date(condition.value[0]);
          const end = new Date(condition.value[1]);
          return date >= start && date <= end;
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * Hash user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return new Date() < this.cacheExpiry;
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.flagCache.clear();
    this.cacheExpiry = new Date(0);
  }

  /**
   * Create or update a feature flag (admin only)
   */
  async createOrUpdateFlag(
    flag: Omit<FeatureFlag, "id" | "createdAt" | "updatedAt">,
  ): Promise<boolean> {
    // Since we don't have a database table, we can't create/update flags
    // This method is kept for API compatibility but returns false
    console.warn("Cannot create/update feature flags without database table");
    return false;
  }
}

// Global instance
export const featureFlagManager = new FeatureFlagManager();

// Convenience functions
export const isFeatureEnabled = (
  flagKey: string,
  userContext?: UserContext,
): Promise<boolean> => {
  return featureFlagManager.isEnabled(flagKey, userContext);
};

export const getEnabledFeatures = (
  userContext?: UserContext,
): Promise<string[]> => {
  return featureFlagManager.getEnabledFeatures(userContext);
};

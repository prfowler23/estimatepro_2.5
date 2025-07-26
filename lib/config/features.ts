/**
 * Feature Configuration
 * Centralized feature flag definitions with metadata
 */

export const FEATURES = {
  AI: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_AI === "true",
    name: "AI Features",
    description: "AI-powered photo analysis and insights",
    requiredPlan: "starter",
  },
  THREE_DIMENSIONAL: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_3D === "true",
    name: "3D Visualization",
    description: "Interactive 3D building modeling",
    requiredPlan: "professional",
  },
  WEATHER: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_WEATHER === "true",
    name: "Weather Integration",
    description: "Real-time weather data and scheduling",
    requiredPlan: "starter",
  },
  DRONE: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_DRONE === "true",
    name: "Drone Integration",
    description: "Drone flight planning and aerial analysis",
    requiredPlan: "enterprise",
  },
  GUIDED_FLOW: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_GUIDED_FLOW === "true",
    name: "Guided Estimation Flow",
    description: "Step-by-step estimation workflow",
    requiredPlan: "starter",
  },
  COLLABORATION: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_COLLABORATION === "true",
    name: "Real-time Collaboration",
    description: "Multi-user real-time collaboration",
    requiredPlan: "professional",
  },
  AI_ASSISTANT: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_AI_ASSISTANT === "true",
    name: "AI Assistant",
    description: "Intelligent estimation assistant",
    requiredPlan: "professional",
  },
  VENDOR_MANAGEMENT: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_VENDOR_MANAGEMENT === "true",
    name: "Vendor Management",
    description: "Manage vendors and subcontractors",
    requiredPlan: "professional",
  },
  PILOT_CERTIFICATION: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_PILOT_CERTIFICATION === "true",
    name: "Pilot Certification",
    description: "Drone pilot certification tracking",
    requiredPlan: "enterprise",
  },
  MOBILE_NAVIGATION: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_MOBILE_NAV === "true",
    name: "Mobile Navigation",
    description: "Enhanced mobile navigation experience",
    requiredPlan: "starter",
  },
  ANALYTICS: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
    name: "Advanced Analytics",
    description: "Business insights and performance metrics",
    requiredPlan: "professional",
  },
  MONITORING: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_MONITORING === "true",
    name: "System Monitoring",
    description: "Performance and error monitoring",
    requiredPlan: "professional",
  },
  FACADE_ANALYSIS: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS === "true",
    name: "AI Facade Analysis",
    description: "Automated building measurement from images",
    requiredPlan: "professional",
  },
} as const;

// Plan hierarchy for feature access
export const PLAN_HIERARCHY = {
  starter: 0,
  professional: 1,
  enterprise: 2,
} as const;

export type PlanType = keyof typeof PLAN_HIERARCHY;
export type FeatureKey = keyof typeof FEATURES;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: FeatureKey): boolean {
  return FEATURES[feature]?.enabled ?? false;
}

/**
 * Check if a feature is available for a given plan
 */
export function isFeatureAvailableForPlan(
  feature: FeatureKey,
  userPlan: PlanType,
): boolean {
  const featureConfig = FEATURES[feature];
  if (!featureConfig) return false;

  const requiredPlanLevel = PLAN_HIERARCHY[featureConfig.requiredPlan];
  const userPlanLevel = PLAN_HIERARCHY[userPlan];

  return userPlanLevel >= requiredPlanLevel;
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureKey[] {
  return (Object.keys(FEATURES) as FeatureKey[]).filter((key) =>
    isFeatureEnabled(key),
  );
}

/**
 * Get all features available for a plan
 */
export function getFeaturesForPlan(plan: PlanType): FeatureKey[] {
  return (Object.keys(FEATURES) as FeatureKey[]).filter((key) =>
    isFeatureAvailableForPlan(key, plan),
  );
}

/**
 * Get feature metadata
 */
export function getFeatureMetadata(feature: FeatureKey) {
  return FEATURES[feature];
}

// AI Feature Flags Configuration
// These control the availability of various AI features across the application

export const AI_FEATURES = {
  // Voice input functionality
  VOICE_INPUT: process.env.NEXT_PUBLIC_ENABLE_VOICE === "true",

  // File attachment in AI chat
  FILE_ATTACHMENT: process.env.NEXT_PUBLIC_ENABLE_FILE_UPLOAD === "true",

  // Real-time metrics dashboard
  REAL_TIME_METRICS: process.env.NEXT_PUBLIC_ENABLE_REALTIME === "true",

  // Smart defaults system
  SMART_DEFAULTS: process.env.NEXT_PUBLIC_ENABLE_SMART_DEFAULTS !== "false", // Default true

  // Intelligent service suggestions
  INTELLIGENT_SUGGESTIONS:
    process.env.NEXT_PUBLIC_ENABLE_AI_SUGGESTIONS !== "false", // Default true

  // AI tool execution
  TOOL_EXECUTION: process.env.NEXT_PUBLIC_ENABLE_AI_TOOLS !== "false", // Default true

  // Enhanced chat features
  ENHANCED_CHAT: process.env.NEXT_PUBLIC_ENABLE_ENHANCED_CHAT !== "false", // Default true

  // AI error recovery
  ERROR_RECOVERY: process.env.NEXT_PUBLIC_ENABLE_AI_ERROR_RECOVERY !== "false", // Default true

  // Predictive input
  PREDICTIVE_INPUT: process.env.NEXT_PUBLIC_ENABLE_PREDICTIVE_INPUT !== "false", // Default true
} as const;

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof AI_FEATURES): boolean {
  return AI_FEATURES[feature] === true;
}

// Log enabled features in development
if (process.env.NODE_ENV === "development") {
  console.log("AI Features Status:", AI_FEATURES);
}

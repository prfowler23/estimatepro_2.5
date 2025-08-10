/**
 * Network Information API Types
 * Provides proper typing for the Network Information API
 */

export type ConnectionType =
  | "bluetooth"
  | "cellular"
  | "ethernet"
  | "mixed"
  | "none"
  | "other"
  | "unknown"
  | "wifi"
  | "wimax";

export type EffectiveConnectionType = "2g" | "3g" | "4g" | "slow-2g";

export interface NetworkInformation {
  /**
   * Effective bandwidth estimate in megabits per second
   */
  downlink?: number;

  /**
   * Maximum downlink speed for the underlying connection technology
   */
  downlinkMax?: number;

  /**
   * Effective type of the connection
   */
  effectiveType?: EffectiveConnectionType;

  /**
   * Estimated round-trip time in milliseconds
   */
  rtt?: number;

  /**
   * Whether the user has requested reduced data usage
   */
  saveData?: boolean;

  /**
   * Type of connection (WiFi, cellular, etc.)
   */
  type?: ConnectionType;

  /**
   * Event listener for connection change
   */
  onchange?: ((this: NetworkInformation, ev: Event) => any) | null;

  addEventListener(
    type: "change",
    listener: (this: NetworkInformation, ev: Event) => any,
    options?: boolean | AddEventListenerOptions,
  ): void;

  removeEventListener(
    type: "change",
    listener: (this: NetworkInformation, ev: Event) => any,
    options?: boolean | EventListenerOptions,
  ): void;
}

/**
 * Extend Navigator interface to include connection property
 */
declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

/**
 * Helper to get network connection with fallbacks
 */
export function getNetworkConnection(): NetworkInformation | undefined {
  if (typeof window === "undefined") return undefined;

  return (
    navigator.connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection
  );
}

/**
 * Check if user is on a slow connection
 */
export function isSlowConnection(): boolean {
  const connection = getNetworkConnection();

  if (!connection) return false;

  // Check save data mode
  if (connection.saveData) return true;

  // Check effective type
  if (
    connection.effectiveType === "slow-2g" ||
    connection.effectiveType === "2g"
  ) {
    return true;
  }

  // Check downlink speed (less than 1 Mbps)
  if (connection.downlink && connection.downlink < 1) {
    return true;
  }

  // Check RTT (more than 400ms)
  if (connection.rtt && connection.rtt > 400) {
    return true;
  }

  return false;
}

/**
 * Get connection quality score (0-100)
 */
export function getConnectionQuality(): number {
  const connection = getNetworkConnection();

  if (!connection) return 50; // Unknown quality

  if (connection.saveData) return 0;

  const effectiveTypeScores: Record<EffectiveConnectionType, number> = {
    "slow-2g": 10,
    "2g": 25,
    "3g": 50,
    "4g": 100,
  };

  let score = 50; // Default score

  if (connection.effectiveType) {
    score = effectiveTypeScores[connection.effectiveType] || 50;
  }

  // Adjust based on downlink speed
  if (connection.downlink) {
    if (connection.downlink > 10) score = Math.min(100, score + 20);
    else if (connection.downlink < 1) score = Math.max(0, score - 20);
  }

  // Adjust based on RTT
  if (connection.rtt) {
    if (connection.rtt < 100) score = Math.min(100, score + 10);
    else if (connection.rtt > 300) score = Math.max(0, score - 10);
  }

  return Math.round(score);
}

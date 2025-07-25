import { ServiceType } from "@/lib/types/estimate-types";

/**
 * Service Type Mapping Utilities
 *
 * Provides bidirectional mapping between short service codes (ServiceType)
 * and full service names used in various parts of the application.
 */

// Mapping from short codes to full names
export const SERVICE_CODE_TO_NAME: Record<ServiceType, string> = {
  WC: "window-cleaning",
  PW: "pressure-washing",
  SW: "soft-washing",
  BF: "biofilm-removal",
  GR: "glass-restoration",
  FR: "frame-restoration",
  HD: "high-dusting",
  FC: "final-clean",
  GRC: "granite-reconditioning",
  PWS: "pressure-wash-seal",
  PD: "parking-deck",
  GC: "general-cleaning",
};

// Reverse mapping from full names to short codes
export const SERVICE_NAME_TO_CODE: Record<string, ServiceType> = {
  "window-cleaning": "WC",
  "pressure-washing": "PW",
  "soft-washing": "SW",
  "biofilm-removal": "BF",
  "glass-restoration": "GR",
  "frame-restoration": "FR",
  "high-dusting": "HD",
  "final-clean": "FC",
  "granite-reconditioning": "GRC",
  "pressure-wash-seal": "PWS",
  "parking-deck": "PD",
  "general-cleaning": "GC",
};

/**
 * Convert ServiceType short code to full service name
 */
export function toFullName(serviceType: ServiceType): string {
  return SERVICE_CODE_TO_NAME[serviceType];
}

/**
 * Convert full service name to ServiceType short code
 */
export function toShortCode(serviceName: string): ServiceType | null {
  return SERVICE_NAME_TO_CODE[serviceName] || null;
}

/**
 * Check if a string is a valid ServiceType short code
 */
export function isValidServiceType(code: string): code is ServiceType {
  return code in SERVICE_CODE_TO_NAME;
}

/**
 * Check if a string is a valid service name
 */
export function isValidServiceName(name: string): boolean {
  return name in SERVICE_NAME_TO_CODE;
}

/**
 * Get all valid ServiceType codes
 */
export function getAllServiceTypes(): ServiceType[] {
  return Object.keys(SERVICE_CODE_TO_NAME) as ServiceType[];
}

/**
 * Get all valid service names
 */
export function getAllServiceNames(): string[] {
  return Object.values(SERVICE_CODE_TO_NAME);
}

/**
 * Convert array of service names to ServiceType array
 */
export function namesToServiceTypes(names: string[]): ServiceType[] {
  return names
    .map((name) => toShortCode(name))
    .filter((code): code is ServiceType => code !== null);
}

/**
 * Convert array of ServiceType codes to service names
 */
export function serviceTypesToNames(types: ServiceType[]): string[] {
  return types.map((type) => toFullName(type));
}

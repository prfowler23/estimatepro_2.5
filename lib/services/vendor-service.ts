// MIGRATED: Vendor Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All vendor management functionality has been moved to resource-service-unified.ts

export {
  unifiedResourceService as vendorService,
  UnifiedResourceService as VendorService,
  type Vendor,
  type VendorPricing,
  type EquipmentWithVendors,
} from "./resource-service-unified";

// Legacy default export for compatibility
export { unifiedResourceService as default } from "./resource-service-unified";

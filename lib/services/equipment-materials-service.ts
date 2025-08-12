// MIGRATED: Equipment & Materials Service - Now uses unified service
// This file provides backward compatibility during consolidation
// All equipment and materials functionality has been moved to resource-service-unified.ts

export {
  unifiedResourceService as equipmentMaterialsService,
  UnifiedResourceService as EquipmentMaterialsService,
  type EquipmentItem,
  type EquipmentVendor,
  type MaterialItem,
  type MaterialVendor,
} from "./resource-service-unified";

// Legacy default export for compatibility
export { unifiedResourceService as default } from "./resource-service-unified";

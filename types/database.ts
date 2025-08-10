// Re-export types from the comprehensive Supabase types file
import type { Database as SupabaseDatabase, Json } from "./supabase";

export type Database = SupabaseDatabase;
export type { Json };

/**
 * Helper type to extract row types from database tables
 * @template T - The table name
 */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
/**
 * Helper type to extract insert types from database tables
 * @template T - The table name
 */
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
/**
 * Helper type to extract update types from database tables
 * @template T - The table name
 */
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
/**
 * Helper type to extract enum types from the database
 * @template T - The enum name
 */
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

// Specific table types for common usage
export type Profile = Tables<"profiles">;
export type Customer = Tables<"customers">;
export type EstimateRow = Tables<"estimates">;
export type EstimateService = Tables<"estimate_services">;
export type EstimationFlow = Tables<"estimation_flows">;
export type EstimateFlow = EstimationFlow; // Alias for backward compatibility
export type ServiceRate = Tables<"service_rates">;
export type AnalyticsEvent = Tables<"analytics_events">;
export type WorkflowAnalytics = Tables<"workflow_analytics">;
export type AIAnalysisResult = Tables<"ai_analysis_results">;
export type EstimateCollaborator = Tables<"estimate_collaborators">;
export type EstimateChange = Tables<"estimate_changes">;
export type CollaborationSession = Tables<"collaboration_sessions">;
export type Integration = Tables<"integrations">;
export type IntegrationEvent = Tables<"integration_events">;
export type AuditEvent = Tables<"audit_events">;
export type ComplianceReport = Tables<"compliance_reports">;

// Enum types for type safety - only export if they exist in the database
// These types are kept for future use when the enums are added to the database
// export type ServiceType = Enums<"service_type">;
// export type EstimateStatus = Enums<"estimate_status">;
// export type UserRole = Enums<"user_role">;
// export type CollaborationRole = Enums<"collaboration_role">;
// export type ChangeType = Enums<"change_type">;
// export type AnalysisType = Enums<"analysis_type">;
// export type Location = Enums<"location">;
// export type UnitType = Enums<"unit_type">;

// Insert types for creating new records
export type ProfileInsert = TablesInsert<"profiles">;
export type CustomerInsert = TablesInsert<"customers">;
export type EstimateInsert = TablesInsert<"estimates">;
export type EstimateServiceInsert = TablesInsert<"estimate_services">;
export type EstimationFlowInsert = TablesInsert<"estimation_flows">;

// Update types for modifying existing records
export type ProfileUpdate = TablesUpdate<"profiles">;
export type CustomerUpdate = TablesUpdate<"customers">;
export type EstimateUpdate = TablesUpdate<"estimates">;
export type EstimateServiceUpdate = TablesUpdate<"estimate_services">;
export type EstimationFlowUpdate = TablesUpdate<"estimation_flows">;

// View types
export type QuoteSummary = Database["public"]["Views"]["quote_summary"]["Row"];
export type ServiceTypeStats =
  Database["public"]["Views"]["service_type_stats"]["Row"];

// Function types
export type IsAdminFunction = Database["public"]["Functions"]["is_admin"];
export type GetUserRoleFunction =
  Database["public"]["Functions"]["get_user_role"];
export type CalculateQuoteTotalFunction =
  Database["public"]["Functions"]["calculate_quote_total"];
// export type CreateDemoProfileFunction =
//   Database["public"]["Functions"]["create_demo_profile"];

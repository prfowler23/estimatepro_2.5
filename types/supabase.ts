export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          role: "admin" | "sales" | "viewer" | null;
          company_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          role?: "admin" | "sales" | "viewer" | null;
          company_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          role?: "admin" | "sales" | "viewer" | null;
          company_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          company: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          company?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          company?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      estimates: {
        Row: {
          id: string;
          quote_number: string;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          company_name: string | null;
          building_name: string;
          building_address: string;
          building_height_stories: number;
          building_height_feet: number | null;
          building_type: string | null;
          total_price: number;
          status: "draft" | "sent" | "approved" | "rejected";
          notes: string | null;
          created_by: string | null;
          sent_at: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quote_number?: string;
          customer_name: string;
          customer_email: string;
          customer_phone?: string | null;
          company_name?: string | null;
          building_name: string;
          building_address: string;
          building_height_stories: number;
          building_height_feet?: number | null;
          building_type?: string | null;
          total_price?: number;
          status?: "draft" | "sent" | "approved" | "rejected";
          notes?: string | null;
          created_by?: string | null;
          sent_at?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quote_number?: string;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string | null;
          company_name?: string | null;
          building_name?: string;
          building_address?: string;
          building_height_stories?: number;
          building_height_feet?: number | null;
          building_type?: string | null;
          total_price?: number;
          status?: "draft" | "sent" | "approved" | "rejected";
          notes?: string | null;
          created_by?: string | null;
          sent_at?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "estimates_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      estimate_services: {
        Row: {
          id: string;
          quote_id: string;
          service_type:
            | "GR"
            | "WC"
            | "PW"
            | "PWS"
            | "FC"
            | "FR"
            | "HD"
            | "SW"
            | "PD"
            | "GRC"
            | "BR";
          area_sqft: number | null;
          glass_sqft: number | null;
          price: number;
          labor_hours: number | null;
          setup_hours: number | null;
          rig_hours: number | null;
          total_hours: number | null;
          crew_size: number | null;
          equipment_type: string | null;
          equipment_days: number | null;
          equipment_cost: number | null;
          calculation_details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          service_type:
            | "GR"
            | "WC"
            | "PW"
            | "PWS"
            | "FC"
            | "FR"
            | "HD"
            | "SW"
            | "PD"
            | "GRC"
            | "BR";
          area_sqft?: number | null;
          glass_sqft?: number | null;
          price: number;
          labor_hours?: number | null;
          setup_hours?: number | null;
          rig_hours?: number | null;
          total_hours?: number | null;
          crew_size?: number | null;
          equipment_type?: string | null;
          equipment_days?: number | null;
          equipment_cost?: number | null;
          calculation_details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          service_type?:
            | "GR"
            | "WC"
            | "PW"
            | "PWS"
            | "FC"
            | "FR"
            | "HD"
            | "SW"
            | "PD"
            | "GRC"
            | "BR";
          area_sqft?: number | null;
          glass_sqft?: number | null;
          price?: number;
          labor_hours?: number | null;
          setup_hours?: number | null;
          rig_hours?: number | null;
          total_hours?: number | null;
          crew_size?: number | null;
          equipment_type?: string | null;
          equipment_days?: number | null;
          equipment_cost?: number | null;
          calculation_details?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "estimate_services_quote_id_fkey";
            columns: ["quote_id"];
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
        ];
      };
      estimation_flows: {
        Row: {
          id: string;
          user_id: string;
          estimate_id: string | null;
          flow_data: Json;
          current_step: number;
          total_steps: number;
          is_complete: boolean;
          template_used: string | null;
          auto_save_enabled: boolean;
          last_saved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          estimate_id?: string | null;
          flow_data?: Json;
          current_step?: number;
          total_steps?: number;
          is_complete?: boolean;
          template_used?: string | null;
          auto_save_enabled?: boolean;
          last_saved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          estimate_id?: string | null;
          flow_data?: Json;
          current_step?: number;
          total_steps?: number;
          is_complete?: boolean;
          template_used?: string | null;
          auto_save_enabled?: boolean;
          last_saved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "estimation_flows_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimation_flows_estimate_id_fkey";
            columns: ["estimate_id"];
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
        ];
      };
      service_rates: {
        Row: {
          id: string;
          service_type: string;
          location: "raleigh" | "charlotte" | "greensboro";
          base_rate: number;
          unit_type:
            | "per_hour"
            | "per_sqft"
            | "per_window"
            | "per_frame"
            | "per_space";
          effective_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          service_type: string;
          location: "raleigh" | "charlotte" | "greensboro";
          base_rate: number;
          unit_type:
            | "per_hour"
            | "per_sqft"
            | "per_window"
            | "per_frame"
            | "per_space";
          effective_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          service_type?: string;
          location?: "raleigh" | "charlotte" | "greensboro";
          base_rate?: number;
          unit_type?:
            | "per_hour"
            | "per_sqft"
            | "per_window"
            | "per_frame"
            | "per_space";
          effective_date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          event_type: string;
          event_data: Json;
          user_id: string | null;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          event_data: Json;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          event_data?: Json;
          user_id?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_analytics: {
        Row: {
          id: string;
          estimate_id: string;
          user_id: string;
          user_name: string;
          user_role: string;
          template_used: string | null;
          start_time: string;
          end_time: string | null;
          current_step: number;
          total_steps: number;
          total_duration: number | null;
          step_durations: Json | null;
          ai_interactions: Json | null;
          validation_score: number | null;
          error_count: number | null;
          warning_count: number | null;
          auto_fixes_applied: number | null;
          collaborator_count: number | null;
          conflict_count: number | null;
          average_conflict_resolution_time: number | null;
          completion_rate: number | null;
          abandonment_point: number | null;
          completion_quality: Json | null;
          user_satisfaction_score: number | null;
          usability_score: number | null;
          estimate_value: number | null;
          conversion_rate: number | null;
          revision_count: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          estimate_id: string;
          user_id: string;
          user_name: string;
          user_role: string;
          template_used?: string | null;
          start_time?: string;
          end_time?: string | null;
          current_step?: number;
          total_steps?: number;
          total_duration?: number | null;
          step_durations?: Json | null;
          ai_interactions?: Json | null;
          validation_score?: number | null;
          error_count?: number | null;
          warning_count?: number | null;
          auto_fixes_applied?: number | null;
          collaborator_count?: number | null;
          conflict_count?: number | null;
          average_conflict_resolution_time?: number | null;
          completion_rate?: number | null;
          abandonment_point?: number | null;
          completion_quality?: Json | null;
          user_satisfaction_score?: number | null;
          usability_score?: number | null;
          estimate_value?: number | null;
          conversion_rate?: number | null;
          revision_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          estimate_id?: string;
          user_id?: string;
          user_name?: string;
          user_role?: string;
          template_used?: string | null;
          start_time?: string;
          end_time?: string | null;
          current_step?: number;
          total_steps?: number;
          total_duration?: number | null;
          step_durations?: Json | null;
          ai_interactions?: Json | null;
          validation_score?: number | null;
          error_count?: number | null;
          warning_count?: number | null;
          auto_fixes_applied?: number | null;
          collaborator_count?: number | null;
          conflict_count?: number | null;
          average_conflict_resolution_time?: number | null;
          completion_rate?: number | null;
          abandonment_point?: number | null;
          completion_quality?: Json | null;
          user_satisfaction_score?: number | null;
          usability_score?: number | null;
          estimate_value?: number | null;
          conversion_rate?: number | null;
          revision_count?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_analytics_estimate_id_fkey";
            columns: ["estimate_id"];
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_analytics_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_analysis_results: {
        Row: {
          id: string;
          quote_id: string;
          analysis_type:
            | "facade"
            | "building_measurement"
            | "material_detection";
          image_url: string | null;
          analysis_data: Json;
          confidence_score: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          analysis_type:
            | "facade"
            | "building_measurement"
            | "material_detection";
          image_url?: string | null;
          analysis_data: Json;
          confidence_score?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          analysis_type?:
            | "facade"
            | "building_measurement"
            | "material_detection";
          image_url?: string | null;
          analysis_data?: Json;
          confidence_score?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_analysis_results_quote_id_fkey";
            columns: ["quote_id"];
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
        ];
      };
      estimate_collaborators: {
        Row: {
          id: string;
          estimate_id: string;
          user_id: string;
          role: "owner" | "editor" | "viewer";
          permissions: Json | null;
          invited_by: string | null;
          invited_at: string;
          accepted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          estimate_id: string;
          user_id: string;
          role: "owner" | "editor" | "viewer";
          permissions?: Json | null;
          invited_by?: string | null;
          invited_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          estimate_id?: string;
          user_id?: string;
          role?: "owner" | "editor" | "viewer";
          permissions?: Json | null;
          invited_by?: string | null;
          invited_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "estimate_collaborators_estimate_id_fkey";
            columns: ["estimate_id"];
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_collaborators_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_collaborators_invited_by_fkey";
            columns: ["invited_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      estimate_changes: {
        Row: {
          id: string;
          estimate_id: string;
          user_id: string;
          change_id: string;
          change_type:
            | "field_update"
            | "step_navigation"
            | "file_upload"
            | "calculation_update";
          step_id: string;
          field_path: string;
          old_value: Json | null;
          new_value: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          estimate_id: string;
          user_id: string;
          change_id: string;
          change_type:
            | "field_update"
            | "step_navigation"
            | "file_upload"
            | "calculation_update";
          step_id: string;
          field_path: string;
          old_value?: Json | null;
          new_value?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          estimate_id?: string;
          user_id?: string;
          change_id?: string;
          change_type?:
            | "field_update"
            | "step_navigation"
            | "file_upload"
            | "calculation_update";
          step_id?: string;
          field_path?: string;
          old_value?: Json | null;
          new_value?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "estimate_changes_estimate_id_fkey";
            columns: ["estimate_id"];
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_changes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      collaboration_sessions: {
        Row: {
          id: string;
          estimate_id: string;
          user_id: string;
          session_id: string;
          presence_data: Json | null;
          is_active: boolean | null;
          last_seen: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          estimate_id: string;
          user_id: string;
          session_id: string;
          presence_data?: Json | null;
          is_active?: boolean | null;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          estimate_id?: string;
          user_id?: string;
          session_id?: string;
          presence_data?: Json | null;
          is_active?: boolean | null;
          last_seen?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "collaboration_sessions_estimate_id_fkey";
            columns: ["estimate_id"];
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collaboration_sessions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      integrations: {
        Row: {
          id: string;
          name: string;
          type: string;
          config: Json;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          config?: Json;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          config?: Json;
          is_active?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integrations_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_events: {
        Row: {
          id: string;
          integration_id: string;
          event_type: string;
          payload: Json;
          status: string;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          integration_id: string;
          event_type: string;
          payload?: Json;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          integration_id?: string;
          event_type?: string;
          payload?: Json;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_events_integration_id_fkey";
            columns: ["integration_id"];
            referencedRelation: "integrations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          resource_type: string;
          resource_id: string | null;
          details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          resource_type: string;
          resource_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?: string;
          resource_type?: string;
          resource_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      compliance_reports: {
        Row: {
          id: string;
          user_id: string;
          report_type: string;
          period_start: string | null;
          period_end: string | null;
          data: Json | null;
          status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_type: string;
          period_start?: string | null;
          period_end?: string | null;
          data?: Json | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          report_type?: string;
          period_start?: string | null;
          period_end?: string | null;
          data?: Json | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "compliance_reports_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      quote_summary: {
        Row: {
          id: string | null;
          quote_number: string | null;
          customer_name: string | null;
          customer_email: string | null;
          building_name: string | null;
          building_address: string | null;
          status: "draft" | "sent" | "approved" | "rejected" | null;
          total_price: number | null;
          created_at: string | null;
          sent_at: string | null;
          approved_at: string | null;
          created_by_name: string | null;
          service_count: number | null;
        };
        Relationships: [];
      };
      service_type_stats: {
        Row: {
          service_type:
            | "GR"
            | "WC"
            | "PW"
            | "PWS"
            | "FC"
            | "FR"
            | "HD"
            | "SW"
            | "PD"
            | "GRC"
            | "BR"
            | null;
          usage_count: number | null;
          avg_price: number | null;
          total_revenue: number | null;
          avg_hours: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      calculate_quote_total: {
        Args: {
          quote_id_param: string;
        };
        Returns: number;
      };
      create_demo_profile: {
        Args: {
          user_id: string;
        };
        Returns: void;
      };
    };
    Enums: {
      service_type:
        | "GR"
        | "WC"
        | "PW"
        | "PWS"
        | "FC"
        | "FR"
        | "HD"
        | "SW"
        | "PD"
        | "GRC"
        | "BR";
      estimate_status: "draft" | "sent" | "approved" | "rejected";
      user_role: "admin" | "sales" | "viewer";
      collaboration_role: "owner" | "editor" | "viewer";
      change_type:
        | "field_update"
        | "step_navigation"
        | "file_upload"
        | "calculation_update";
      analysis_type: "facade" | "building_measurement" | "material_detection";
      location: "raleigh" | "charlotte" | "greensboro";
      unit_type:
        | "per_hour"
        | "per_sqft"
        | "per_window"
        | "per_frame"
        | "per_space";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

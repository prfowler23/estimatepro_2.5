export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      ai_analysis_results: {
        Row: {
          analysis_data: Json;
          analysis_type: string;
          confidence_score: number | null;
          created_at: string | null;
          id: string;
          image_url: string | null;
          quote_id: string | null;
        };
        Insert: {
          analysis_data: Json;
          analysis_type: string;
          confidence_score?: number | null;
          created_at?: string | null;
          id?: string;
          image_url?: string | null;
          quote_id?: string | null;
        };
        Update: {
          analysis_data?: Json;
          analysis_type?: string;
          confidence_score?: number | null;
          created_at?: string | null;
          id?: string;
          image_url?: string | null;
          quote_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_analysis_results_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_analysis_results_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_events: {
        Row: {
          created_at: string | null;
          event_data: Json;
          event_type: string;
          id: string;
          session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          event_data: Json;
          event_type: string;
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          event_data?: Json;
          event_type?: string;
          id?: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_configurations: {
        Row: {
          alert_thresholds: Json | null;
          anonymization_rules: Json | null;
          auto_purge: boolean | null;
          compliance_standards: string[] | null;
          created_at: string | null;
          enabled: boolean | null;
          encryption_enabled: boolean | null;
          excluded_events: string[] | null;
          id: string;
          real_time_alerts: boolean | null;
          retention_days: number | null;
          sensitive_fields: string[] | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          alert_thresholds?: Json | null;
          anonymization_rules?: Json | null;
          auto_purge?: boolean | null;
          compliance_standards?: string[] | null;
          created_at?: string | null;
          enabled?: boolean | null;
          encryption_enabled?: boolean | null;
          excluded_events?: string[] | null;
          id?: string;
          real_time_alerts?: boolean | null;
          retention_days?: number | null;
          sensitive_fields?: string[] | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          alert_thresholds?: Json | null;
          anonymization_rules?: Json | null;
          auto_purge?: boolean | null;
          compliance_standards?: string[] | null;
          created_at?: string | null;
          enabled?: boolean | null;
          encryption_enabled?: boolean | null;
          excluded_events?: string[] | null;
          id?: string;
          real_time_alerts?: boolean | null;
          retention_days?: number | null;
          sensitive_fields?: string[] | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          created_at: string | null;
          details: Json | null;
          event_type: string;
          id: string;
          ip_address: unknown | null;
          resource_id: string | null;
          resource_type: string;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          details?: Json | null;
          event_type: string;
          id?: string;
          ip_address?: unknown | null;
          resource_id?: string | null;
          resource_type: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          details?: Json | null;
          event_type?: string;
          id?: string;
          ip_address?: unknown | null;
          resource_id?: string | null;
          resource_type?: string;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      cache_performance: {
        Row: {
          cache_key: string;
          cache_type: string;
          created_at: string | null;
          eviction_count: number;
          hit_count: number;
          hit_rate: number | null;
          id: string;
          last_accessed: string | null;
          miss_count: number;
          total_requests: number;
          updated_at: string | null;
        };
        Insert: {
          cache_key: string;
          cache_type: string;
          created_at?: string | null;
          eviction_count?: number;
          hit_count?: number;
          hit_rate?: number | null;
          id?: string;
          last_accessed?: string | null;
          miss_count?: number;
          total_requests?: number;
          updated_at?: string | null;
        };
        Update: {
          cache_key?: string;
          cache_type?: string;
          created_at?: string | null;
          eviction_count?: number;
          hit_count?: number;
          hit_rate?: number | null;
          id?: string;
          last_accessed?: string | null;
          miss_count?: number;
          total_requests?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      collaboration_sessions: {
        Row: {
          created_at: string | null;
          estimate_id: string | null;
          id: string;
          is_active: boolean | null;
          last_seen: string | null;
          presence_data: Json | null;
          session_id: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          estimate_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_seen?: string | null;
          presence_data?: Json | null;
          session_id: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          estimate_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_seen?: string | null;
          presence_data?: Json | null;
          session_id?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "collaboration_sessions_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collaboration_sessions_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
      };
      compliance_reports: {
        Row: {
          created_at: string | null;
          data: Json | null;
          id: string;
          period_end: string | null;
          period_start: string | null;
          report_type: string;
          status: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          data?: Json | null;
          id?: string;
          period_end?: string | null;
          period_start?: string | null;
          report_type: string;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          data?: Json | null;
          id?: string;
          period_end?: string | null;
          period_start?: string | null;
          report_type?: string;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      compliance_violations: {
        Row: {
          description: string;
          detected_at: string | null;
          event_ids: string[] | null;
          id: string;
          remediation_required: boolean | null;
          remediation_steps: string[] | null;
          report_id: string | null;
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          rule: string;
          severity: string;
          standard: string;
        };
        Insert: {
          description: string;
          detected_at?: string | null;
          event_ids?: string[] | null;
          id?: string;
          remediation_required?: boolean | null;
          remediation_steps?: string[] | null;
          report_id?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          rule: string;
          severity: string;
          standard: string;
        };
        Update: {
          description?: string;
          detected_at?: string | null;
          event_ids?: string[] | null;
          id?: string;
          remediation_required?: boolean | null;
          remediation_steps?: string[] | null;
          report_id?: string | null;
          resolution_notes?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          rule?: string;
          severity?: string;
          standard?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          company_name: string | null;
          created_at: string | null;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          updated_at: string | null;
        };
        Insert: {
          company_name?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          company_name?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      estimate_changes: {
        Row: {
          change_id: string;
          change_type: string;
          created_at: string | null;
          estimate_id: string | null;
          field_path: string;
          id: string;
          metadata: Json | null;
          new_value: Json | null;
          old_value: Json | null;
          step_id: string;
          user_id: string | null;
        };
        Insert: {
          change_id: string;
          change_type: string;
          created_at?: string | null;
          estimate_id?: string | null;
          field_path: string;
          id?: string;
          metadata?: Json | null;
          new_value?: Json | null;
          old_value?: Json | null;
          step_id: string;
          user_id?: string | null;
        };
        Update: {
          change_id?: string;
          change_type?: string;
          created_at?: string | null;
          estimate_id?: string | null;
          field_path?: string;
          id?: string;
          metadata?: Json | null;
          new_value?: Json | null;
          old_value?: Json | null;
          step_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "estimate_changes_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_changes_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
      };
      estimate_collaborators: {
        Row: {
          accepted_at: string | null;
          created_at: string | null;
          estimate_id: string | null;
          id: string;
          invited_at: string | null;
          invited_by: string | null;
          permissions: Json | null;
          role: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string | null;
          estimate_id?: string | null;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          permissions?: Json | null;
          role: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string | null;
          estimate_id?: string | null;
          id?: string;
          invited_at?: string | null;
          invited_by?: string | null;
          permissions?: Json | null;
          role?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "estimate_collaborators_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "estimate_collaborators_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
      };
      estimate_services: {
        Row: {
          area_sqft: number | null;
          calculation_details: Json | null;
          created_at: string | null;
          crew_size: number | null;
          equipment_cost: number | null;
          equipment_days: number | null;
          equipment_type: string | null;
          glass_sqft: number | null;
          id: string;
          labor_hours: number | null;
          price: number;
          quote_id: string | null;
          rig_hours: number | null;
          service_type: string;
          setup_hours: number | null;
          total_hours: number | null;
        };
        Insert: {
          area_sqft?: number | null;
          calculation_details?: Json | null;
          created_at?: string | null;
          crew_size?: number | null;
          equipment_cost?: number | null;
          equipment_days?: number | null;
          equipment_type?: string | null;
          glass_sqft?: number | null;
          id?: string;
          labor_hours?: number | null;
          price: number;
          quote_id?: string | null;
          rig_hours?: number | null;
          service_type: string;
          setup_hours?: number | null;
          total_hours?: number | null;
        };
        Update: {
          area_sqft?: number | null;
          calculation_details?: Json | null;
          created_at?: string | null;
          crew_size?: number | null;
          equipment_cost?: number | null;
          equipment_days?: number | null;
          equipment_type?: string | null;
          glass_sqft?: number | null;
          id?: string;
          labor_hours?: number | null;
          price?: number;
          quote_id?: string | null;
          rig_hours?: number | null;
          service_type?: string;
          setup_hours?: number | null;
          total_hours?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "quote_services_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_services_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
      };
      estimates: {
        Row: {
          approved_at: string | null;
          building_address: string;
          building_height_feet: number | null;
          building_height_stories: number;
          building_name: string;
          building_type: string | null;
          company_name: string | null;
          created_at: string | null;
          created_by: string | null;
          customer_email: string;
          customer_name: string;
          customer_phone: string | null;
          id: string;
          notes: string | null;
          quote_number: string;
          sent_at: string | null;
          status: string | null;
          total_price: number;
          updated_at: string | null;
        };
        Insert: {
          approved_at?: string | null;
          building_address: string;
          building_height_feet?: number | null;
          building_height_stories: number;
          building_name: string;
          building_type?: string | null;
          company_name?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          customer_email: string;
          customer_name: string;
          customer_phone?: string | null;
          id?: string;
          notes?: string | null;
          quote_number: string;
          sent_at?: string | null;
          status?: string | null;
          total_price?: number;
          updated_at?: string | null;
        };
        Update: {
          approved_at?: string | null;
          building_address?: string;
          building_height_feet?: number | null;
          building_height_stories?: number;
          building_name?: string;
          building_type?: string | null;
          company_name?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          customer_email?: string;
          customer_name?: string;
          customer_phone?: string | null;
          id?: string;
          notes?: string | null;
          quote_number?: string;
          sent_at?: string | null;
          status?: string | null;
          total_price?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      estimation_flow_auto_save_state: {
        Row: {
          conflict_detected: boolean | null;
          estimate_id: string;
          is_dirty: boolean | null;
          is_saving: boolean | null;
          last_save_attempt: string | null;
          last_saved: string | null;
          local_version: number | null;
          save_error: string | null;
          server_version: number | null;
          session_id: string | null;
        };
        Insert: {
          conflict_detected?: boolean | null;
          estimate_id: string;
          is_dirty?: boolean | null;
          is_saving?: boolean | null;
          last_save_attempt?: string | null;
          last_saved?: string | null;
          local_version?: number | null;
          save_error?: string | null;
          server_version?: number | null;
          session_id?: string | null;
        };
        Update: {
          conflict_detected?: boolean | null;
          estimate_id?: string;
          is_dirty?: boolean | null;
          is_saving?: boolean | null;
          last_save_attempt?: string | null;
          last_saved?: string | null;
          local_version?: number | null;
          save_error?: string | null;
          server_version?: number | null;
          session_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_auto_save_state_estimate_id";
            columns: ["estimate_id"];
            isOneToOne: true;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_auto_save_state_estimate_id";
            columns: ["estimate_id"];
            isOneToOne: true;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
      };
      estimation_flow_conflicts: {
        Row: {
          conflicted_fields: string[] | null;
          created_at: string | null;
          estimate_id: string;
          id: string;
          local_data: Json;
          resolution_strategy: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          resolved_data: Json | null;
          server_data: Json;
        };
        Insert: {
          conflicted_fields?: string[] | null;
          created_at?: string | null;
          estimate_id: string;
          id?: string;
          local_data: Json;
          resolution_strategy?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolved_data?: Json | null;
          server_data: Json;
        };
        Update: {
          conflicted_fields?: string[] | null;
          created_at?: string | null;
          estimate_id?: string;
          id?: string;
          local_data?: Json;
          resolution_strategy?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolved_data?: Json | null;
          server_data?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "fk_conflicts_estimate_id";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_conflicts_estimate_id";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
      };
      estimation_flow_versions: {
        Row: {
          change_description: string | null;
          created_at: string | null;
          data: Json;
          device_info: Json | null;
          estimate_id: string;
          id: string;
          step_id: string | null;
          timestamp: string | null;
          user_id: string | null;
          version: number;
        };
        Insert: {
          change_description?: string | null;
          created_at?: string | null;
          data: Json;
          device_info?: Json | null;
          estimate_id: string;
          id?: string;
          step_id?: string | null;
          timestamp?: string | null;
          user_id?: string | null;
          version: number;
        };
        Update: {
          change_description?: string | null;
          created_at?: string | null;
          data?: Json;
          device_info?: Json | null;
          estimate_id?: string;
          id?: string;
          step_id?: string | null;
          timestamp?: string | null;
          user_id?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fk_versions_estimate_id";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_versions_estimate_id";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
      };
      estimation_flows: {
        Row: {
          ai_analysis_results: Json | null;
          ai_extracted_data: Json | null;
          auto_save_enabled: boolean | null;
          conflict_detected: boolean | null;
          contact_date: string | null;
          contact_method: string | null;
          created_at: string | null;
          current_step: number | null;
          customer_id: string | null;
          device_info: Json | null;
          equipment_costs: Json | null;
          estimate_id: string;
          estimated_duration: number | null;
          final_estimate: Json | null;
          flow_data: Json;
          id: string;
          initial_notes: string | null;
          labor_costs: Json | null;
          last_auto_save: string | null;
          last_modified: string | null;
          manual_overrides: Json | null;
          material_costs: Json | null;
          measurements: Json | null;
          pricing_calculations: Json | null;
          proposal_generated: boolean | null;
          save_interval: number | null;
          selected_services: string[] | null;
          service_dependencies: Json | null;
          status: string | null;
          step: string | null;
          takeoff_data: Json | null;
          updated_at: string | null;
          uploaded_files: Json | null;
          user_id: string;
          version: number | null;
          weather_analysis: Json | null;
          work_areas: Json | null;
        };
        Insert: {
          ai_analysis_results?: Json | null;
          ai_extracted_data?: Json | null;
          auto_save_enabled?: boolean | null;
          conflict_detected?: boolean | null;
          contact_date?: string | null;
          contact_method?: string | null;
          created_at?: string | null;
          current_step?: number | null;
          customer_id?: string | null;
          device_info?: Json | null;
          equipment_costs?: Json | null;
          estimate_id: string;
          estimated_duration?: number | null;
          final_estimate?: Json | null;
          flow_data?: Json;
          id?: string;
          initial_notes?: string | null;
          labor_costs?: Json | null;
          last_auto_save?: string | null;
          last_modified?: string | null;
          manual_overrides?: Json | null;
          material_costs?: Json | null;
          measurements?: Json | null;
          pricing_calculations?: Json | null;
          proposal_generated?: boolean | null;
          save_interval?: number | null;
          selected_services?: string[] | null;
          service_dependencies?: Json | null;
          status?: string | null;
          step?: string | null;
          takeoff_data?: Json | null;
          updated_at?: string | null;
          uploaded_files?: Json | null;
          user_id: string;
          version?: number | null;
          weather_analysis?: Json | null;
          work_areas?: Json | null;
        };
        Update: {
          ai_analysis_results?: Json | null;
          ai_extracted_data?: Json | null;
          auto_save_enabled?: boolean | null;
          conflict_detected?: boolean | null;
          contact_date?: string | null;
          contact_method?: string | null;
          created_at?: string | null;
          current_step?: number | null;
          customer_id?: string | null;
          device_info?: Json | null;
          equipment_costs?: Json | null;
          estimate_id?: string;
          estimated_duration?: number | null;
          final_estimate?: Json | null;
          flow_data?: Json;
          id?: string;
          initial_notes?: string | null;
          labor_costs?: Json | null;
          last_auto_save?: string | null;
          last_modified?: string | null;
          manual_overrides?: Json | null;
          material_costs?: Json | null;
          measurements?: Json | null;
          pricing_calculations?: Json | null;
          proposal_generated?: boolean | null;
          save_interval?: number | null;
          selected_services?: string[] | null;
          service_dependencies?: Json | null;
          status?: string | null;
          step?: string | null;
          takeoff_data?: Json | null;
          updated_at?: string | null;
          uploaded_files?: Json | null;
          user_id?: string;
          version?: number | null;
          weather_analysis?: Json | null;
          work_areas?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_estimation_flows_customer_id";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_estimation_flows_estimate_id";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_estimation_flows_estimate_id";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
      };
      estimation_flows_backup: {
        Row: {
          ai_analysis_results: Json | null;
          ai_extracted_data: Json | null;
          auto_save_enabled: boolean | null;
          backup_id: number;
          contact_date: string | null;
          contact_method: string | null;
          created_at: string | null;
          current_step: number | null;
          customer_id: string | null;
          device_info: Json | null;
          equipment_costs: Json | null;
          estimate_id: string | null;
          estimated_duration: number | null;
          final_estimate: Json | null;
          flow_data: Json | null;
          id: string | null;
          initial_notes: string | null;
          labor_costs: Json | null;
          last_modified: string | null;
          manual_overrides: Json | null;
          material_costs: Json | null;
          measurements: Json | null;
          pricing_calculations: Json | null;
          proposal_generated: boolean | null;
          save_interval: number | null;
          selected_services: string[] | null;
          service_dependencies: Json | null;
          status: string | null;
          takeoff_data: Json | null;
          updated_at: string | null;
          uploaded_files: Json | null;
          user_id: string | null;
          version: number | null;
          weather_analysis: Json | null;
          work_areas: Json | null;
        };
        Insert: {
          ai_analysis_results?: Json | null;
          ai_extracted_data?: Json | null;
          auto_save_enabled?: boolean | null;
          backup_id?: number;
          contact_date?: string | null;
          contact_method?: string | null;
          created_at?: string | null;
          current_step?: number | null;
          customer_id?: string | null;
          device_info?: Json | null;
          equipment_costs?: Json | null;
          estimate_id?: string | null;
          estimated_duration?: number | null;
          final_estimate?: Json | null;
          flow_data?: Json | null;
          id?: string | null;
          initial_notes?: string | null;
          labor_costs?: Json | null;
          last_modified?: string | null;
          manual_overrides?: Json | null;
          material_costs?: Json | null;
          measurements?: Json | null;
          pricing_calculations?: Json | null;
          proposal_generated?: boolean | null;
          save_interval?: number | null;
          selected_services?: string[] | null;
          service_dependencies?: Json | null;
          status?: string | null;
          takeoff_data?: Json | null;
          updated_at?: string | null;
          uploaded_files?: Json | null;
          user_id?: string | null;
          version?: number | null;
          weather_analysis?: Json | null;
          work_areas?: Json | null;
        };
        Update: {
          ai_analysis_results?: Json | null;
          ai_extracted_data?: Json | null;
          auto_save_enabled?: boolean | null;
          backup_id?: number;
          contact_date?: string | null;
          contact_method?: string | null;
          created_at?: string | null;
          current_step?: number | null;
          customer_id?: string | null;
          device_info?: Json | null;
          equipment_costs?: Json | null;
          estimate_id?: string | null;
          estimated_duration?: number | null;
          final_estimate?: Json | null;
          flow_data?: Json | null;
          id?: string | null;
          initial_notes?: string | null;
          labor_costs?: Json | null;
          last_modified?: string | null;
          manual_overrides?: Json | null;
          material_costs?: Json | null;
          measurements?: Json | null;
          pricing_calculations?: Json | null;
          proposal_generated?: boolean | null;
          save_interval?: number | null;
          selected_services?: string[] | null;
          service_dependencies?: Json | null;
          status?: string | null;
          takeoff_data?: Json | null;
          updated_at?: string | null;
          uploaded_files?: Json | null;
          user_id?: string | null;
          version?: number | null;
          weather_analysis?: Json | null;
          work_areas?: Json | null;
        };
        Relationships: [];
      };
      integration_credentials: {
        Row: {
          created_at: string | null;
          credential_type: string;
          encrypted_value: string;
          expires_at: string | null;
          id: string;
          integration_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          credential_type: string;
          encrypted_value: string;
          expires_at?: string | null;
          id?: string;
          integration_id: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          credential_type?: string;
          encrypted_value?: string;
          expires_at?: string | null;
          id?: string;
          integration_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "integration_credentials_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "integration_health_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_credentials_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "integrations";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_events: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          event_data: Json;
          event_type: string;
          id: string;
          integration_id: string;
          max_retries: number | null;
          processed_at: string | null;
          retries: number | null;
          status: string;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          event_data?: Json;
          event_type: string;
          id?: string;
          integration_id: string;
          max_retries?: number | null;
          processed_at?: string | null;
          retries?: number | null;
          status?: string;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          event_data?: Json;
          event_type?: string;
          id?: string;
          integration_id?: string;
          max_retries?: number | null;
          processed_at?: string | null;
          retries?: number | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_events_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "integration_health_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_events_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "integrations";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_field_mappings: {
        Row: {
          created_at: string | null;
          id: string;
          integration_id: string;
          is_active: boolean | null;
          source_field: string;
          target_field: string;
          transformation_rules: Json | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          integration_id: string;
          is_active?: boolean | null;
          source_field: string;
          target_field: string;
          transformation_rules?: Json | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          integration_id?: string;
          is_active?: boolean | null;
          source_field?: string;
          target_field?: string;
          transformation_rules?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "integration_field_mappings_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "integration_health_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_field_mappings_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "integrations";
            referencedColumns: ["id"];
          },
        ];
      };
      integration_sync_logs: {
        Row: {
          completed_at: string | null;
          error_message: string | null;
          id: string;
          integration_id: string;
          records_failed: number | null;
          records_processed: number | null;
          records_successful: number | null;
          started_at: string | null;
          status: string;
          sync_data: Json | null;
          sync_direction: string;
        };
        Insert: {
          completed_at?: string | null;
          error_message?: string | null;
          id?: string;
          integration_id: string;
          records_failed?: number | null;
          records_processed?: number | null;
          records_successful?: number | null;
          started_at?: string | null;
          status: string;
          sync_data?: Json | null;
          sync_direction: string;
        };
        Update: {
          completed_at?: string | null;
          error_message?: string | null;
          id?: string;
          integration_id?: string;
          records_failed?: number | null;
          records_processed?: number | null;
          records_successful?: number | null;
          started_at?: string | null;
          status?: string;
          sync_data?: Json | null;
          sync_direction?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "integration_health_view";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "integration_sync_logs_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "integrations";
            referencedColumns: ["id"];
          },
        ];
      };
      integrations: {
        Row: {
          authentication: Json;
          created_at: string | null;
          created_by: string;
          enabled: boolean | null;
          field_mappings: Json | null;
          id: string;
          name: string;
          provider: string;
          settings: Json | null;
          sync_settings: Json | null;
          updated_at: string | null;
          webhooks: Json | null;
        };
        Insert: {
          authentication?: Json;
          created_at?: string | null;
          created_by: string;
          enabled?: boolean | null;
          field_mappings?: Json | null;
          id?: string;
          name: string;
          provider: string;
          settings?: Json | null;
          sync_settings?: Json | null;
          updated_at?: string | null;
          webhooks?: Json | null;
        };
        Update: {
          authentication?: Json;
          created_at?: string | null;
          created_by?: string;
          enabled?: boolean | null;
          field_mappings?: Json | null;
          id?: string;
          name?: string;
          provider?: string;
          settings?: Json | null;
          sync_settings?: Json | null;
          updated_at?: string | null;
          webhooks?: Json | null;
        };
        Relationships: [];
      };
      performance_alerts: {
        Row: {
          actual_value: number;
          alert_type: string;
          created_at: string | null;
          id: string;
          message: string;
          metric_name: string;
          resolved: boolean;
          resolved_at: string | null;
          resolved_by: string | null;
          threshold_value: number;
        };
        Insert: {
          actual_value: number;
          alert_type: string;
          created_at?: string | null;
          id?: string;
          message: string;
          metric_name: string;
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          threshold_value: number;
        };
        Update: {
          actual_value?: number;
          alert_type?: string;
          created_at?: string | null;
          id?: string;
          message?: string;
          metric_name?: string;
          resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          threshold_value?: number;
        };
        Relationships: [];
      };
      performance_config: {
        Row: {
          created_at: string | null;
          enabled: boolean;
          id: string;
          setting_name: string;
          setting_type: string;
          setting_value: Json;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          enabled?: boolean;
          id?: string;
          setting_name: string;
          setting_type: string;
          setting_value: Json;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          enabled?: boolean;
          id?: string;
          setting_name?: string;
          setting_type?: string;
          setting_value?: Json;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      performance_logs: {
        Row: {
          created_at: string | null;
          duration_ms: number;
          error_message: string | null;
          id: string;
          ip_address: unknown | null;
          metadata: Json | null;
          operation_name: string;
          operation_type: string;
          success: boolean;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          duration_ms: number;
          error_message?: string | null;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          operation_name: string;
          operation_type: string;
          success?: boolean;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          duration_ms?: number;
          error_message?: string | null;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          operation_name?: string;
          operation_type?: string;
          success?: boolean;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          company_name: string | null;
          created_at: string | null;
          drone_pilot_license: string | null;
          email: string | null;
          flight_hours: number | null;
          full_name: string | null;
          id: string;
          is_certified_pilot: boolean | null;
          last_medical_exam: string | null;
          part_107_expiry: string | null;
          phone: string | null;
          pilot_certifications: Json | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          company_name?: string | null;
          created_at?: string | null;
          drone_pilot_license?: string | null;
          email?: string | null;
          flight_hours?: number | null;
          full_name?: string | null;
          id: string;
          is_certified_pilot?: boolean | null;
          last_medical_exam?: string | null;
          part_107_expiry?: string | null;
          phone?: string | null;
          pilot_certifications?: Json | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          company_name?: string | null;
          created_at?: string | null;
          drone_pilot_license?: string | null;
          email?: string | null;
          flight_hours?: number | null;
          full_name?: string | null;
          id?: string;
          is_certified_pilot?: boolean | null;
          last_medical_exam?: string | null;
          part_107_expiry?: string | null;
          phone?: string | null;
          pilot_certifications?: Json | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      query_performance: {
        Row: {
          cache_hit: boolean;
          executed_at: string | null;
          execution_time_ms: number;
          id: string;
          index_used: boolean;
          query_hash: string;
          query_plan: Json | null;
          rows_examined: number;
          rows_returned: number;
          table_name: string;
          user_id: string | null;
        };
        Insert: {
          cache_hit?: boolean;
          executed_at?: string | null;
          execution_time_ms: number;
          id?: string;
          index_used?: boolean;
          query_hash: string;
          query_plan?: Json | null;
          rows_examined?: number;
          rows_returned?: number;
          table_name: string;
          user_id?: string | null;
        };
        Update: {
          cache_hit?: boolean;
          executed_at?: string | null;
          execution_time_ms?: number;
          id?: string;
          index_used?: boolean;
          query_hash?: string;
          query_plan?: Json | null;
          rows_examined?: number;
          rows_returned?: number;
          table_name?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      service_rates: {
        Row: {
          base_rate: number;
          created_at: string | null;
          effective_date: string;
          id: string;
          location: string;
          service_type: string;
          unit_type: string;
        };
        Insert: {
          base_rate: number;
          created_at?: string | null;
          effective_date?: string;
          id?: string;
          location: string;
          service_type: string;
          unit_type: string;
        };
        Update: {
          base_rate?: number;
          created_at?: string | null;
          effective_date?: string;
          id?: string;
          location?: string;
          service_type?: string;
          unit_type?: string;
        };
        Relationships: [];
      };
      session_drafts: {
        Row: {
          created_at: string;
          current_step: string;
          data: Json;
          estimate_id: string;
          expires_at: string;
          id: string;
          metadata: Json;
          progress: Json;
          recovery: Json;
          session_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_step: string;
          data: Json;
          estimate_id: string;
          expires_at: string;
          id: string;
          metadata: Json;
          progress: Json;
          recovery: Json;
          session_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_step?: string;
          data?: Json;
          estimate_id?: string;
          expires_at?: string;
          id?: string;
          metadata?: Json;
          progress?: Json;
          recovery?: Json;
          session_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      system_resources: {
        Row: {
          active_connections: number;
          avg_response_time: number;
          cpu_usage: number;
          disk_usage: number;
          error_count: number;
          id: string;
          memory_total: number;
          memory_usage: number;
          request_count: number;
          timestamp: string | null;
        };
        Insert: {
          active_connections?: number;
          avg_response_time?: number;
          cpu_usage: number;
          disk_usage: number;
          error_count?: number;
          id?: string;
          memory_total: number;
          memory_usage: number;
          request_count?: number;
          timestamp?: string | null;
        };
        Update: {
          active_connections?: number;
          avg_response_time?: number;
          cpu_usage?: number;
          disk_usage?: number;
          error_count?: number;
          id?: string;
          memory_total?: number;
          memory_usage?: number;
          request_count?: number;
          timestamp?: string | null;
        };
        Relationships: [];
      };
      webhook_logs: {
        Row: {
          id: string;
          payload: Json;
          processed_at: string | null;
          provider: string;
          response: Json | null;
          signature: string | null;
          status_code: number | null;
        };
        Insert: {
          id?: string;
          payload: Json;
          processed_at?: string | null;
          provider: string;
          response?: Json | null;
          signature?: string | null;
          status_code?: number | null;
        };
        Update: {
          id?: string;
          payload?: Json;
          processed_at?: string | null;
          provider?: string;
          response?: Json | null;
          signature?: string | null;
          status_code?: number | null;
        };
        Relationships: [];
      };
      workflow_analytics: {
        Row: {
          completion_rate: number | null;
          created_at: string | null;
          duration_seconds: number | null;
          error_count: number | null;
          id: string;
          metadata: Json | null;
          step_name: string;
          user_id: string | null;
          workflow_type: string;
        };
        Insert: {
          completion_rate?: number | null;
          created_at?: string | null;
          duration_seconds?: number | null;
          error_count?: number | null;
          id?: string;
          metadata?: Json | null;
          step_name: string;
          user_id?: string | null;
          workflow_type: string;
        };
        Update: {
          completion_rate?: number | null;
          created_at?: string | null;
          duration_seconds?: number | null;
          error_count?: number | null;
          id?: string;
          metadata?: Json | null;
          step_name?: string;
          user_id?: string | null;
          workflow_type?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      integration_health_view: {
        Row: {
          created_at: string | null;
          enabled: boolean | null;
          failed_events: number | null;
          failed_syncs: number | null;
          health_status: string | null;
          id: string | null;
          last_sync: string | null;
          name: string | null;
          pending_events: number | null;
          provider: string | null;
          total_events: number | null;
          total_syncs: number | null;
          updated_at: string | null;
        };
        Relationships: [];
      };
      performance_dashboard_stats: {
        Row: {
          avg_duration: number | null;
          error_count: number | null;
          error_rate: number | null;
          hour: string | null;
          max_duration: number | null;
          min_duration: number | null;
          operation_count: number | null;
          operation_type: string | null;
        };
        Relationships: [];
      };
      quote_summary: {
        Row: {
          building_address: string | null;
          building_height_stories: number | null;
          building_name: string | null;
          created_at: string | null;
          customer_email: string | null;
          customer_name: string | null;
          id: string | null;
          quote_number: string | null;
          status: string | null;
          total: number | null;
          updated_at: string | null;
        };
        Insert: {
          building_address?: string | null;
          building_height_stories?: number | null;
          building_name?: string | null;
          created_at?: string | null;
          customer_email?: string | null;
          customer_name?: string | null;
          id?: string | null;
          quote_number?: string | null;
          status?: string | null;
          total?: number | null;
          updated_at?: string | null;
        };
        Update: {
          building_address?: string | null;
          building_height_stories?: number | null;
          building_name?: string | null;
          created_at?: string | null;
          customer_email?: string | null;
          customer_name?: string | null;
          id?: string | null;
          quote_number?: string | null;
          status?: string | null;
          total?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      service_type_stats: {
        Row: {
          average_price: number | null;
          last_used: string | null;
          service_type: string | null;
          total_estimates: number | null;
          total_revenue: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      anonymize_user_audit_data: {
        Args: { target_user_id: string };
        Returns: number;
      };
      calculate_quote_total: {
        Args: { quote_id_param: string };
        Returns: number;
      };
      cleanup_old_integration_events: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      cleanup_old_webhook_logs: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      cleanup_orphaned_files: {
        Args: { retention_days?: number };
        Returns: number;
      };
      cleanup_performance_data: {
        Args: { retention_days?: number };
        Returns: number;
      };
      detect_performance_anomalies: {
        Args: { check_period_minutes?: number; threshold_multiplier?: number };
        Returns: {
          operation_type: string;
          operation_name: string;
          current_avg_duration: number;
          historical_avg_duration: number;
          anomaly_ratio: number;
          severity: string;
        }[];
      };
      detect_suspicious_activity: {
        Args: { target_user_id?: string; hours_back?: number };
        Returns: {
          user_id: string;
          suspicious_patterns: Json;
          risk_score: number;
          recommended_actions: string[];
        }[];
      };
      generate_quote_number: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_cache_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          cache_type: string;
          total_keys: number;
          avg_hit_rate: number;
          total_requests: number;
          total_hits: number;
          total_misses: number;
        }[];
      };
      get_compliance_statistics: {
        Args: { start_date: string; end_date: string };
        Returns: {
          total_events: number;
          events_by_type: Json;
          events_by_severity: Json;
          high_risk_events: number;
          compliance_violations: number;
          data_access_events: number;
          data_modification_events: number;
          security_events: number;
        }[];
      };
      get_integration_stats: {
        Args: { user_id: string };
        Returns: {
          provider: string;
          total_integrations: number;
          enabled_integrations: number;
          healthy_integrations: number;
          last_updated: string;
        }[];
      };
      get_or_create_estimate_for_temp_id: {
        Args: { temp_estimate_id: string; user_uuid: string };
        Returns: string;
      };
      get_performance_stats: {
        Args: { start_time?: string; end_time?: string };
        Returns: {
          total_operations: number;
          avg_duration: number;
          min_duration: number;
          max_duration: number;
          error_rate: number;
          operations_by_type: Json;
        }[];
      };
      get_signed_url: {
        Args: { bucket_name: string; file_path: string; expires_in?: number };
        Returns: string;
      };
      get_slow_queries: {
        Args: { threshold_ms?: number; limit_count?: number };
        Returns: {
          table_name: string;
          query_hash: string;
          avg_execution_time: number;
          execution_count: number;
          last_executed: string;
        }[];
      };
      get_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      handle_temp_estimate_auto_save: {
        Args: {
          temp_estimate_id: string;
          user_uuid: string;
          flow_data_param: Json;
          current_step_param?: number;
          step_param?: string;
        };
        Returns: string;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      log_audit_event: {
        Args: {
          p_event_type: string;
          p_resource_type: string;
          p_resource_id?: string;
          p_details?: Json;
        };
        Returns: string;
      };
      purge_expired_audit_events: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      refresh_performance_dashboard_stats: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      retry_failed_integration_events: {
        Args: Record<PropertyKey, never>;
        Returns: {
          event_id: string;
          integration_id: string;
          event_type: string;
        }[];
      };
      setup_audit_triggers: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      test_production_readiness: {
        Args: Record<PropertyKey, never>;
        Returns: {
          table_name: string;
          status: string;
          rls_enabled: boolean;
          policies_count: number;
        }[];
      };
      update_integration_last_sync: {
        Args: { integration_id: string };
        Returns: undefined;
      };
      validate_file_upload: {
        Args: {
          bucket_name: string;
          file_name: string;
          file_size: number;
          mime_type: string;
        };
        Returns: boolean;
      };
      verify_linting_fixes: {
        Args: Record<PropertyKey, never>;
        Returns: {
          check_name: string;
          status: string;
          details: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      ai_analysis_cache: {
        Row: {
          accessed_at: string | null;
          analysis_type: string;
          cache_key: string;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          input_hash: string;
          metadata: Json | null;
          result: Json;
          user_id: string;
        };
        Insert: {
          accessed_at?: string | null;
          analysis_type: string;
          cache_key: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          input_hash: string;
          metadata?: Json | null;
          result: Json;
          user_id: string;
        };
        Update: {
          accessed_at?: string | null;
          analysis_type?: string;
          cache_key?: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          input_hash?: string;
          metadata?: Json | null;
          result?: Json;
          user_id?: string;
        };
        Relationships: [];
      };
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
      ai_conversations: {
        Row: {
          created_at: string | null;
          id: string;
          last_message_at: string | null;
          metadata: Json | null;
          title: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          metadata?: Json | null;
          title?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          metadata?: Json | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string | null;
          id: string;
          metadata: Json | null;
          model: string | null;
          role: string;
          tokens_used: number | null;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          model?: string | null;
          role: string;
          tokens_used?: number | null;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          model?: string | null;
          role?: string;
          tokens_used?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_conversation";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
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
      api_usage_logs: {
        Row: {
          created_at: string | null;
          endpoint: string;
          id: string;
          ip_address: unknown | null;
          method: string;
          rate_limited: boolean | null;
          request_size_bytes: number | null;
          response_size_bytes: number | null;
          response_time_ms: number | null;
          status_code: number | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          endpoint: string;
          id?: string;
          ip_address?: unknown | null;
          method: string;
          rate_limited?: boolean | null;
          request_size_bytes?: number | null;
          response_size_bytes?: number | null;
          response_time_ms?: number | null;
          status_code?: number | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          endpoint?: string;
          id?: string;
          ip_address?: unknown | null;
          method?: string;
          rate_limited?: boolean | null;
          request_size_bytes?: number | null;
          response_size_bytes?: number | null;
          response_time_ms?: number | null;
          status_code?: number | null;
          user_id?: string | null;
        };
        Relationships: [];
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
      equipment_library: {
        Row: {
          category: string;
          created_at: string | null;
          daily_rate: number | null;
          description: string | null;
          hourly_rate: number | null;
          id: string;
          is_active: boolean | null;
          name: string;
          specifications: Json | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          daily_rate?: number | null;
          description?: string | null;
          hourly_rate?: number | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          specifications?: Json | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          daily_rate?: number | null;
          description?: string | null;
          hourly_rate?: number | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          specifications?: Json | null;
          updated_at?: string | null;
          user_id?: string;
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
      facade_analyses: {
        Row: {
          ai_model_version: string | null;
          building_address: string | null;
          building_height_feet: number | null;
          building_height_stories: number | null;
          building_type: string | null;
          confidence_level: number | null;
          covered_walkway_sqft: number | null;
          created_at: string | null;
          created_by: string | null;
          estimate_id: string | null;
          facade_complexity: string | null;
          glass_to_facade_ratio: number | null;
          has_covered_areas: boolean | null;
          id: string;
          image_sources: Json | null;
          is_historic_building: boolean | null;
          loading_dock_sqft: number | null;
          manual_adjustments: Json | null;
          materials: Json | null;
          net_facade_sqft: number | null;
          parking_spaces: number | null;
          parking_sqft: number | null;
          requires_field_verification: boolean | null;
          sidewalk_sqft: number | null;
          total_facade_sqft: number | null;
          total_glass_sqft: number | null;
          updated_at: string | null;
          validation_notes: string | null;
        };
        Insert: {
          ai_model_version?: string | null;
          building_address?: string | null;
          building_height_feet?: number | null;
          building_height_stories?: number | null;
          building_type?: string | null;
          confidence_level?: number | null;
          covered_walkway_sqft?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          estimate_id?: string | null;
          facade_complexity?: string | null;
          glass_to_facade_ratio?: number | null;
          has_covered_areas?: boolean | null;
          id?: string;
          image_sources?: Json | null;
          is_historic_building?: boolean | null;
          loading_dock_sqft?: number | null;
          manual_adjustments?: Json | null;
          materials?: Json | null;
          net_facade_sqft?: number | null;
          parking_spaces?: number | null;
          parking_sqft?: number | null;
          requires_field_verification?: boolean | null;
          sidewalk_sqft?: number | null;
          total_facade_sqft?: number | null;
          total_glass_sqft?: number | null;
          updated_at?: string | null;
          validation_notes?: string | null;
        };
        Update: {
          ai_model_version?: string | null;
          building_address?: string | null;
          building_height_feet?: number | null;
          building_height_stories?: number | null;
          building_type?: string | null;
          confidence_level?: number | null;
          covered_walkway_sqft?: number | null;
          created_at?: string | null;
          created_by?: string | null;
          estimate_id?: string | null;
          facade_complexity?: string | null;
          glass_to_facade_ratio?: number | null;
          has_covered_areas?: boolean | null;
          id?: string;
          image_sources?: Json | null;
          is_historic_building?: boolean | null;
          loading_dock_sqft?: number | null;
          manual_adjustments?: Json | null;
          materials?: Json | null;
          net_facade_sqft?: number | null;
          parking_spaces?: number | null;
          parking_sqft?: number | null;
          requires_field_verification?: boolean | null;
          sidewalk_sqft?: number | null;
          total_facade_sqft?: number | null;
          total_glass_sqft?: number | null;
          updated_at?: string | null;
          validation_notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "facade_analyses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facade_analyses_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facade_analyses_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
      };
      facade_analysis_images: {
        Row: {
          ai_analysis_results: Json | null;
          confidence_scores: Json | null;
          created_at: string | null;
          detected_elements: Json | null;
          facade_analysis_id: string | null;
          id: string;
          image_type: string | null;
          image_url: string;
          metadata: Json | null;
          uploaded_by: string | null;
          view_angle: string | null;
        };
        Insert: {
          ai_analysis_results?: Json | null;
          confidence_scores?: Json | null;
          created_at?: string | null;
          detected_elements?: Json | null;
          facade_analysis_id?: string | null;
          id?: string;
          image_type?: string | null;
          image_url: string;
          metadata?: Json | null;
          uploaded_by?: string | null;
          view_angle?: string | null;
        };
        Update: {
          ai_analysis_results?: Json | null;
          confidence_scores?: Json | null;
          created_at?: string | null;
          detected_elements?: Json | null;
          facade_analysis_id?: string | null;
          id?: string;
          image_type?: string | null;
          image_url?: string;
          metadata?: Json | null;
          uploaded_by?: string | null;
          view_angle?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "facade_analysis_images_facade_analysis_id_fkey";
            columns: ["facade_analysis_id"];
            isOneToOne: false;
            referencedRelation: "facade_analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "facade_analysis_images_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      failed_login_attempts: {
        Row: {
          attempt_count: number | null;
          created_at: string | null;
          email: string;
          error_type: string | null;
          id: string;
          ip_address: unknown | null;
          locked_until: string | null;
          updated_at: string | null;
          user_agent: string | null;
        };
        Insert: {
          attempt_count?: number | null;
          created_at?: string | null;
          email: string;
          error_type?: string | null;
          id?: string;
          ip_address?: unknown | null;
          locked_until?: string | null;
          updated_at?: string | null;
          user_agent?: string | null;
        };
        Update: {
          attempt_count?: number | null;
          created_at?: string | null;
          email?: string;
          error_type?: string | null;
          id?: string;
          ip_address?: unknown | null;
          locked_until?: string | null;
          updated_at?: string | null;
          user_agent?: string | null;
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
      materials_library: {
        Row: {
          category: string;
          cost_per_unit: number;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          specifications: Json | null;
          supplier: string | null;
          unit: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          category: string;
          cost_per_unit: number;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          specifications?: Json | null;
          supplier?: string | null;
          unit: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          category?: string;
          cost_per_unit?: number;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          specifications?: Json | null;
          supplier?: string | null;
          unit?: string;
          updated_at?: string | null;
          user_id?: string;
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
      photos: {
        Row: {
          created_at: string | null;
          estimate_id: string | null;
          file_name: string;
          file_size: number;
          id: string;
          metadata: Json | null;
          mime_type: string;
          public_url: string;
          storage_path: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          estimate_id?: string | null;
          file_name: string;
          file_size: number;
          id?: string;
          metadata?: Json | null;
          mime_type: string;
          public_url: string;
          storage_path: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          estimate_id?: string | null;
          file_name?: string;
          file_size?: number;
          id?: string;
          metadata?: Json | null;
          mime_type?: string;
          public_url?: string;
          storage_path?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
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
      security_alerts: {
        Row: {
          alert_type: string;
          created_at: string | null;
          description: string | null;
          id: string;
          ip_address: unknown | null;
          metadata: Json | null;
          resolved: boolean | null;
          resolved_at: string | null;
          resolved_by: string | null;
          severity: string;
          title: string;
          user_id: string | null;
        };
        Insert: {
          alert_type: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          resolved?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity: string;
          title: string;
          user_id?: string | null;
        };
        Update: {
          alert_type?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          resolved?: boolean | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          severity?: string;
          title?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      security_events: {
        Row: {
          created_at: string | null;
          endpoint: string | null;
          error_message: string | null;
          event_type: string;
          id: string;
          ip_address: unknown | null;
          metadata: Json | null;
          method: string | null;
          severity: string;
          status_code: number | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          endpoint?: string | null;
          error_message?: string | null;
          event_type: string;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          method?: string | null;
          severity: string;
          status_code?: number | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          endpoint?: string | null;
          error_message?: string | null;
          event_type?: string;
          id?: string;
          ip_address?: unknown | null;
          metadata?: Json | null;
          method?: string | null;
          severity?: string;
          status_code?: number | null;
          user_agent?: string | null;
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
          auto_cleanup: boolean | null;
          created_at: string;
          current_step: string;
          data: Json;
          estimate_id: string;
          expires_at: string;
          id: string;
          metadata: Json;
          progress: Json;
          recovery: Json;
          retention_days: number | null;
          session_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          auto_cleanup?: boolean | null;
          created_at?: string;
          current_step: string;
          data: Json;
          estimate_id: string;
          expires_at: string;
          id: string;
          metadata: Json;
          progress: Json;
          recovery: Json;
          retention_days?: number | null;
          session_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          auto_cleanup?: boolean | null;
          created_at?: string;
          current_step?: string;
          data?: Json;
          estimate_id?: string;
          expires_at?: string;
          id?: string;
          metadata?: Json;
          progress?: Json;
          recovery?: Json;
          retention_days?: number | null;
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
      vendor_prices: {
        Row: {
          created_at: string | null;
          effective_date: string | null;
          id: string;
          item_category: string | null;
          item_name: string;
          price_per_unit: number;
          unit: string;
          vendor_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          effective_date?: string | null;
          id?: string;
          item_category?: string | null;
          item_name: string;
          price_per_unit: number;
          unit: string;
          vendor_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          effective_date?: string | null;
          id?: string;
          item_category?: string | null;
          item_name?: string;
          price_per_unit?: number;
          unit?: string;
          vendor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_prices_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          category: string | null;
          contact_info: Json | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          category?: string | null;
          contact_info?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          category?: string | null;
          contact_info?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          updated_at?: string | null;
          user_id?: string;
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
      workflow_step_data: {
        Row: {
          created_at: string | null;
          field_name: string;
          field_value: Json | null;
          id: string;
          updated_at: string | null;
          workflow_step_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          field_name: string;
          field_value?: Json | null;
          id?: string;
          updated_at?: string | null;
          workflow_step_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          field_name?: string;
          field_value?: Json | null;
          id?: string;
          updated_at?: string | null;
          workflow_step_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_step_data_workflow_step_id_fkey";
            columns: ["workflow_step_id"];
            isOneToOne: false;
            referencedRelation: "workflow_steps";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_steps: {
        Row: {
          created_at: string | null;
          data: Json | null;
          estimate_id: string | null;
          id: string;
          status: string | null;
          step_number: number;
          step_type: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          data?: Json | null;
          estimate_id?: string | null;
          id?: string;
          status?: string | null;
          step_number: number;
          step_type: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          data?: Json | null;
          estimate_id?: string | null;
          id?: string;
          status?: string | null;
          step_number?: number;
          step_type?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_steps_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "estimates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_steps_estimate_id_fkey";
            columns: ["estimate_id"];
            isOneToOne: false;
            referencedRelation: "quote_summary";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      api_usage_summary: {
        Row: {
          avg_response_time: number | null;
          endpoint: string | null;
          error_count: number | null;
          max_response_time: number | null;
          method: string | null;
          rate_limited_count: number | null;
          request_count: number | null;
        };
        Relationships: [];
      };
      failed_login_summary: {
        Row: {
          currently_locked: number | null;
          total_attempts: number | null;
          unique_emails: number | null;
          unique_ips: number | null;
        };
        Relationships: [];
      };
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
      optimization_metrics: {
        Row: {
          idx_scan: number | null;
          idx_tup_fetch: number | null;
          idx_tup_read: number | null;
          indexname: unknown | null;
          metric_type: string | null;
          schemaname: unknown | null;
          tablename: unknown | null;
          usage_status: string | null;
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
      security_overview: {
        Row: {
          affected_users_24h: number | null;
          critical_24h: number | null;
          events_24h: number | null;
          high_24h: number | null;
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
      table_size_metrics: {
        Row: {
          index_ratio_pct: number | null;
          indexes_size: string | null;
          schemaname: unknown | null;
          table_size: string | null;
          tablename: unknown | null;
          total_size: string | null;
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
      cleanup_old_session_drafts: {
        Args: Record<PropertyKey, never>;
        Returns: number;
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
      log_security_event: {
        Args: {
          p_event_type: string;
          p_severity: string;
          p_user_id?: string;
          p_ip_address?: unknown;
          p_user_agent?: string;
          p_endpoint?: string;
          p_method?: string;
          p_status_code?: number;
          p_error_message?: string;
          p_metadata?: Json;
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
      track_failed_login: {
        Args: {
          p_email: string;
          p_ip_address?: unknown;
          p_user_agent?: string;
          p_error_type?: string;
        };
        Returns: undefined;
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

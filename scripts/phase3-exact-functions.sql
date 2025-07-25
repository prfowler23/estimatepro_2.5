-- Phase 3 - Function Search Path Fixes (EXACT SIGNATURES)
-- Run these commands in the Supabase SQL Editor
-- ========================================

-- Fix is_admin function
ALTER FUNCTION public.is_admin() SET search_path = public;

-- Fix log_audit_event function
ALTER FUNCTION public.log_audit_event(
    p_event_type text,
    p_resource_type text,
    p_resource_id text,
    p_details jsonb
) SET search_path = public;

-- Fix get_user_role function
ALTER FUNCTION public.get_user_role() SET search_path = public;

-- Fix test_production_readiness function
ALTER FUNCTION public.test_production_readiness() SET search_path = public;

-- Fix trigger_set_timestamp function
ALTER FUNCTION public.trigger_set_timestamp() SET search_path = public;

-- Fix update_integration_last_sync function (corrected signature)
ALTER FUNCTION public.update_integration_last_sync(integration_id uuid) SET search_path = public;

-- Fix cleanup_old_webhook_logs function
ALTER FUNCTION public.cleanup_old_webhook_logs() SET search_path = public;

-- Fix cleanup_old_integration_events function
ALTER FUNCTION public.cleanup_old_integration_events() SET search_path = public;

-- Fix retry_failed_integration_events function
ALTER FUNCTION public.retry_failed_integration_events() SET search_path = public;

-- Fix get_integration_stats function (corrected signature)
ALTER FUNCTION public.get_integration_stats(user_id uuid) SET search_path = public;

-- Fix update_estimation_flows_timestamp function
ALTER FUNCTION public.update_estimation_flows_timestamp() SET search_path = public;

-- Fix get_cache_stats function
ALTER FUNCTION public.get_cache_stats() SET search_path = public;

-- Fix trigger_refresh_performance_stats function
ALTER FUNCTION public.trigger_refresh_performance_stats() SET search_path = public;

-- Fix get_performance_stats function (corrected signature)
ALTER FUNCTION public.get_performance_stats(
    start_time timestamp with time zone,
    end_time timestamp with time zone
) SET search_path = public;

-- Fix refresh_performance_dashboard_stats function
ALTER FUNCTION public.refresh_performance_dashboard_stats() SET search_path = public;

-- Fix get_slow_queries function (corrected signature)
ALTER FUNCTION public.get_slow_queries(
    threshold_ms integer,
    limit_count integer
) SET search_path = public;

-- Fix cleanup_performance_data function (corrected signature)
ALTER FUNCTION public.cleanup_performance_data(retention_days integer) SET search_path = public;

-- Fix detect_performance_anomalies function (corrected signature)
ALTER FUNCTION public.detect_performance_anomalies(
    check_period_minutes integer,
    threshold_multiplier numeric
) SET search_path = public;

-- Fix get_or_create_estimate_for_temp_id function (corrected signature)
ALTER FUNCTION public.get_or_create_estimate_for_temp_id(
    temp_estimate_id text,
    user_uuid uuid
) SET search_path = public;

-- Fix handle_temp_estimate_auto_save function (corrected signature)
ALTER FUNCTION public.handle_temp_estimate_auto_save(
    temp_estimate_id text,
    user_uuid uuid,
    flow_data_param jsonb,
    current_step_param integer,
    step_param character varying
) SET search_path = public;

-- Fix audit_trigger_function function
ALTER FUNCTION public.audit_trigger_function() SET search_path = public;

-- Fix purge_expired_audit_events function
ALTER FUNCTION public.purge_expired_audit_events() SET search_path = public;

-- Fix anonymize_user_audit_data function (corrected signature)
ALTER FUNCTION public.anonymize_user_audit_data(target_user_id uuid) SET search_path = public;

-- Fix get_compliance_statistics function (corrected signature)
ALTER FUNCTION public.get_compliance_statistics(
    start_date timestamp with time zone,
    end_date timestamp with time zone
) SET search_path = public;

-- Fix detect_suspicious_activity function (corrected signature)
ALTER FUNCTION public.detect_suspicious_activity(
    target_user_id uuid,
    hours_back integer
) SET search_path = public;

-- Fix setup_audit_triggers function
ALTER FUNCTION public.setup_audit_triggers() SET search_path = public;

-- Fix verify_linting_fixes function
ALTER FUNCTION public.verify_linting_fixes() SET search_path = public;

-- Fix get_signed_url function (corrected signature)
ALTER FUNCTION public.get_signed_url(
    bucket_name text,
    file_path text,
    expires_in integer
) SET search_path = public;

-- Fix validate_file_upload function (corrected signature)
ALTER FUNCTION public.validate_file_upload(
    bucket_name text,
    file_name text,
    file_size bigint,
    mime_type text
) SET search_path = public;

-- Fix cleanup_orphaned_files function (corrected signature)
ALTER FUNCTION public.cleanup_orphaned_files(retention_days integer) SET search_path = public;

-- Fix update_updated_at_column function
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Fix generate_quote_number function
ALTER FUNCTION public.generate_quote_number() SET search_path = public;

-- Fix set_quote_number function
ALTER FUNCTION public.set_quote_number() SET search_path = public;

-- Fix calculate_quote_total function (corrected signature)
ALTER FUNCTION public.calculate_quote_total(quote_id_param uuid) SET search_path = public;

-- Fix update_quote_total function
ALTER FUNCTION public.update_quote_total() SET search_path = public;

-- ========================================
-- All 31 functions with exact signatures
-- ========================================
-- Fix Function Search Path Issues (Security Warning)
-- Functions without explicit search_path can be vulnerable to search path manipulation
-- Setting search_path to 'public' ensures functions use the expected schema

-- Fix is_admin function
ALTER FUNCTION public.is_admin() SET search_path = public;

-- Fix log_audit_event function
ALTER FUNCTION public.log_audit_event(
    p_event_type audit_event_type,
    p_resource_type text,
    p_resource_id uuid,
    p_details jsonb,
    p_ip_address inet
) SET search_path = public;

-- Fix get_user_role function
ALTER FUNCTION public.get_user_role() SET search_path = public;

-- Fix test_production_readiness function
ALTER FUNCTION public.test_production_readiness() SET search_path = public;

-- Fix trigger_set_timestamp function
ALTER FUNCTION public.trigger_set_timestamp() SET search_path = public;

-- Fix update_integration_last_sync function
ALTER FUNCTION public.update_integration_last_sync() SET search_path = public;

-- Fix cleanup_old_webhook_logs function
ALTER FUNCTION public.cleanup_old_webhook_logs() SET search_path = public;

-- Fix cleanup_old_integration_events function
ALTER FUNCTION public.cleanup_old_integration_events() SET search_path = public;

-- Fix retry_failed_integration_events function
ALTER FUNCTION public.retry_failed_integration_events() SET search_path = public;

-- Fix get_integration_stats function
ALTER FUNCTION public.get_integration_stats(p_integration_id uuid) SET search_path = public;

-- Fix update_estimation_flows_timestamp function
ALTER FUNCTION public.update_estimation_flows_timestamp() SET search_path = public;

-- Fix get_cache_stats function
ALTER FUNCTION public.get_cache_stats() SET search_path = public;

-- Fix trigger_refresh_performance_stats function
ALTER FUNCTION public.trigger_refresh_performance_stats() SET search_path = public;

-- Fix get_performance_stats function
ALTER FUNCTION public.get_performance_stats() SET search_path = public;

-- Fix refresh_performance_dashboard_stats function
ALTER FUNCTION public.refresh_performance_dashboard_stats() SET search_path = public;

-- Fix get_slow_queries function
ALTER FUNCTION public.get_slow_queries(p_limit integer) SET search_path = public;

-- Fix cleanup_performance_data function
ALTER FUNCTION public.cleanup_performance_data() SET search_path = public;

-- Fix detect_performance_anomalies function
ALTER FUNCTION public.detect_performance_anomalies() SET search_path = public;

-- Fix get_or_create_estimate_for_temp_id function
ALTER FUNCTION public.get_or_create_estimate_for_temp_id(p_temp_estimate_id text) SET search_path = public;

-- Fix handle_temp_estimate_auto_save function
ALTER FUNCTION public.handle_temp_estimate_auto_save(p_estimate jsonb) SET search_path = public;

-- Fix audit_trigger_function function
ALTER FUNCTION public.audit_trigger_function() SET search_path = public;

-- Fix purge_expired_audit_events function
ALTER FUNCTION public.purge_expired_audit_events() SET search_path = public;

-- Fix anonymize_user_audit_data function
ALTER FUNCTION public.anonymize_user_audit_data(target_user_id uuid) SET search_path = public;

-- Fix get_compliance_statistics function
ALTER FUNCTION public.get_compliance_statistics() SET search_path = public;

-- Fix detect_suspicious_activity function
ALTER FUNCTION public.detect_suspicious_activity() SET search_path = public;

-- Fix setup_audit_triggers function
ALTER FUNCTION public.setup_audit_triggers(target_table text) SET search_path = public;

-- Fix verify_linting_fixes function
ALTER FUNCTION public.verify_linting_fixes() SET search_path = public;

-- Fix get_signed_url function
ALTER FUNCTION public.get_signed_url(bucket_name text, file_path text, expires_in integer) SET search_path = public;

-- Fix validate_file_upload function
ALTER FUNCTION public.validate_file_upload(file_size bigint, mime_type text) SET search_path = public;

-- Fix cleanup_orphaned_files function
ALTER FUNCTION public.cleanup_orphaned_files() SET search_path = public;

-- Fix update_updated_at_column function
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Fix generate_quote_number function
ALTER FUNCTION public.generate_quote_number() SET search_path = public;

-- Fix set_quote_number function
ALTER FUNCTION public.set_quote_number() SET search_path = public;

-- Fix calculate_quote_total function
ALTER FUNCTION public.calculate_quote_total(quote_id uuid) SET search_path = public;

-- Fix update_quote_total function
ALTER FUNCTION public.update_quote_total() SET search_path = public;
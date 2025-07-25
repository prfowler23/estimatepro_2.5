-- Check which functions actually exist in the database
-- Run this in Supabase SQL Editor to see what functions are available

SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_admin',
    'log_audit_event', 
    'get_user_role',
    'test_production_readiness',
    'trigger_set_timestamp',
    'update_integration_last_sync',
    'cleanup_old_webhook_logs',
    'cleanup_old_integration_events',
    'retry_failed_integration_events',
    'get_integration_stats',
    'update_estimation_flows_timestamp',
    'get_cache_stats',
    'trigger_refresh_performance_stats',
    'get_performance_stats',
    'refresh_performance_dashboard_stats',
    'get_slow_queries',
    'cleanup_performance_data',
    'detect_performance_anomalies',
    'get_or_create_estimate_for_temp_id',
    'handle_temp_estimate_auto_save',
    'audit_trigger_function',
    'purge_expired_audit_events',
    'anonymize_user_audit_data',
    'get_compliance_statistics',
    'detect_suspicious_activity',
    'setup_audit_triggers',
    'verify_linting_fixes',
    'get_signed_url',
    'validate_file_upload',
    'cleanup_orphaned_files',
    'update_updated_at_column',
    'generate_quote_number',
    'set_quote_number',
    'calculate_quote_total',
    'update_quote_total'
  )
ORDER BY p.proname;
-- Backup Script for Views and Functions
-- Run this before applying security migrations

-- Backup view definitions
\echo 'Backing up view definitions...'
CREATE TABLE IF NOT EXISTS backup_views_20250124 AS
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN ('quote_summary', 'service_type_stats', 'integration_health_view');

-- Backup function definitions
\echo 'Backing up function definitions...'
CREATE TABLE IF NOT EXISTS backup_functions_20250124 AS
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

\echo 'Backup complete. Tables created: backup_views_20250124, backup_functions_20250124'
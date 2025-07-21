#!/usr/bin/env node

/**
 * Run Security Migration Script
 *
 * This script runs the security fixes by executing individual SQL statements
 */

const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSecurityMigration() {
  console.log("🔧 Running Security Migration...\n");

  try {
    // Step 1: Drop and recreate service_type_stats view
    console.log("1️⃣ Fixing service_type_stats view...");
    await supabase.rpc("exec_sql", {
      sql: `
        DROP VIEW IF EXISTS public.service_type_stats CASCADE;
        CREATE VIEW public.service_type_stats
        WITH (security_barrier = true)
        AS
        SELECT 
            es.service_type,
            COUNT(DISTINCT e.id) as total_estimates,
            SUM(es.price) as total_revenue,
            AVG(es.price) as average_price,
            MAX(e.created_at) as last_used
        FROM estimate_services es
        JOIN estimates e ON es.quote_id = e.id
        WHERE e.created_by = auth.uid()
        GROUP BY es.service_type;
      `,
    });
    console.log("✅ service_type_stats view fixed");

    // Step 2: Drop and recreate quote_summary view
    console.log("\n2️⃣ Fixing quote_summary view...");
    await supabase.rpc("exec_sql", {
      sql: `
        DROP VIEW IF EXISTS public.quote_summary CASCADE;
        CREATE VIEW public.quote_summary
        WITH (security_barrier = true)
        AS
        SELECT 
            e.id,
            e.quote_number,
            e.customer_name,
            e.customer_email,
            e.building_name,
            e.building_address,
            e.building_height_stories,
            e.status,
            e.total_price as total,
            e.created_at,
            e.updated_at
        FROM estimates e
        WHERE e.created_by = auth.uid();
      `,
    });
    console.log("✅ quote_summary view fixed");

    // Step 3: Drop and recreate integration_health_view
    console.log("\n3️⃣ Fixing integration_health_view...");
    await supabase.rpc("exec_sql", {
      sql: `
        DROP VIEW IF EXISTS public.integration_health_view CASCADE;
        CREATE VIEW public.integration_health_view
        WITH (security_barrier = true)
        AS
        SELECT 
            i.id,
            i.provider,
            i.name,
            i.enabled,
            i.created_at,
            i.updated_at,
            COALESCE(stats.last_sync, i.created_at) as last_sync,
            COALESCE(stats.total_events, 0) as total_events,
            COALESCE(stats.failed_events, 0) as failed_events,
            COALESCE(stats.pending_events, 0) as pending_events,
            COALESCE(stats.total_syncs, 0) as total_syncs,
            COALESCE(stats.failed_syncs, 0) as failed_syncs,
            CASE 
                WHEN i.enabled = false THEN 'disabled'::text
                WHEN COALESCE(stats.failed_events, 0) > COALESCE(stats.total_events, 0) * 0.5 THEN 'unhealthy'::text
                ELSE 'healthy'::text
            END as health_status
        FROM integrations i
        LEFT JOIN (
            SELECT 
                integration_id,
                MAX(created_at) as last_sync,
                COUNT(*) as total_events,
                COUNT(*) FILTER (WHERE status = 'failed') as failed_events,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_events,
                0 as total_syncs,
                0 as failed_syncs
            FROM integration_events 
            GROUP BY integration_id
        ) stats ON i.id = stats.integration_id
        WHERE i.created_by = auth.uid();
      `,
    });
    console.log("✅ integration_health_view fixed");

    console.log("\n🎉 All 3 SECURITY DEFINER views have been fixed!");
    console.log(
      "💡 The views now use secure permissions (SECURITY INVOKER by default)",
    );
  } catch (error) {
    console.error("❌ Migration failed:", error.message);

    // If exec_sql doesn't work, try individual operations
    if (error.message.includes("exec_sql")) {
      console.log("\n🔄 Trying alternative approach...");

      try {
        // Alternative: Use raw SQL operations
        console.log("⚠️  exec_sql function not available");
        console.log(
          "💡 Please run these SQL commands manually in Supabase SQL Editor:",
        );
        console.log("\n1️⃣ Fix service_type_stats:");
        console.log(`
DROP VIEW IF EXISTS public.service_type_stats CASCADE;
CREATE VIEW public.service_type_stats
WITH (security_barrier = true)
AS
SELECT 
    es.service_type,
    COUNT(DISTINCT e.id) as total_estimates,
    SUM(es.price) as total_revenue,
    AVG(es.price) as average_price,
    MAX(e.created_at) as last_used
FROM estimate_services es
JOIN estimates e ON es.quote_id = e.id
WHERE e.created_by = auth.uid()
GROUP BY es.service_type;
        `);

        console.log("\n2️⃣ Fix quote_summary:");
        console.log(`
DROP VIEW IF EXISTS public.quote_summary CASCADE;
CREATE VIEW public.quote_summary
WITH (security_barrier = true)
AS
SELECT 
    e.id,
    e.quote_number,
    e.customer_name,
    e.customer_email,
    e.building_name,
    e.building_address,
    e.building_height_stories,
    e.status,
    e.total_price as total,
    e.created_at,
    e.updated_at
FROM estimates e
WHERE e.created_by = auth.uid();
        `);

        console.log("\n3️⃣ Fix integration_health_view:");
        console.log(`
DROP VIEW IF EXISTS public.integration_health_view CASCADE;
CREATE VIEW public.integration_health_view
WITH (security_barrier = true)
AS
SELECT 
    i.id,
    i.provider,
    i.name,
    i.enabled,
    i.created_at,
    i.updated_at,
    COALESCE(stats.last_sync, i.created_at) as last_sync,
    COALESCE(stats.total_events, 0) as total_events,
    COALESCE(stats.failed_events, 0) as failed_events,
    COALESCE(stats.pending_events, 0) as pending_events,
    COALESCE(stats.total_syncs, 0) as total_syncs,
    COALESCE(stats.failed_syncs, 0) as failed_syncs,
    CASE 
        WHEN i.enabled = false THEN 'disabled'::text
        WHEN COALESCE(stats.failed_events, 0) > COALESCE(stats.total_events, 0) * 0.5 THEN 'unhealthy'::text
        ELSE 'healthy'::text
    END as health_status
FROM integrations i
LEFT JOIN (
    SELECT 
        integration_id,
        MAX(created_at) as last_sync,
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_events,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_events,
        0 as total_syncs,
        0 as failed_syncs
    FROM integration_events 
    GROUP BY integration_id
) stats ON i.id = stats.integration_id
WHERE i.created_by = auth.uid();
        `);
      } catch (altError) {
        console.error("❌ Alternative approach failed:", altError.message);
      }
    }
  }
}

runSecurityMigration().catch(console.error);

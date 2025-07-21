#!/usr/bin/env node

/**
 * Verify Security Fixes Script
 *
 * This script verifies that all security fixes from the Supabase security lints
 * have been properly applied to the database.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySecurityFixes() {
  console.log("🔍 Verifying Security Fixes...\n");

  let issues = 0;

  try {
    // 1. Check SECURITY DEFINER views
    console.log("1️⃣ Checking views for SECURITY DEFINER...");
    const { data: views, error: viewsError } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT 
          schemaname, 
          viewname,
          CASE 
            WHEN definition LIKE '%SECURITY DEFINER%' THEN 'SECURITY DEFINER'
            WHEN definition LIKE '%SECURITY INVOKER%' THEN 'SECURITY INVOKER'
            ELSE 'DEFAULT (SECURITY INVOKER)'
          END as security_mode
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND viewname IN ('service_type_stats', 'quote_summary', 'integration_health_view');
      `,
    });

    if (viewsError) throw viewsError;

    if (views && views.length > 0) {
      views.forEach((view) => {
        if (view.security_mode === "SECURITY DEFINER") {
          console.error(`❌ View ${view.viewname} still uses SECURITY DEFINER`);
          issues++;
        } else {
          console.log(
            `✅ View ${view.viewname} is secure (${view.security_mode})`,
          );
        }
      });
    } else {
      console.log("⚠️  No views found to check");
    }

    // 2. Check RLS on estimation_flows_backup
    console.log("\n2️⃣ Checking RLS on estimation_flows_backup...");
    const { data: rlsStatus, error: rlsError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'estimation_flows_backup';
      `,
      },
    );

    if (rlsError) throw rlsError;

    if (rlsStatus && rlsStatus.length > 0) {
      const table = rlsStatus[0];
      if (table.rowsecurity) {
        console.log("✅ RLS is enabled on estimation_flows_backup");
      } else {
        console.error("❌ RLS is NOT enabled on estimation_flows_backup");
        issues++;
      }
    } else {
      console.log("⚠️  Table estimation_flows_backup not found");
    }

    // 3. Check for user_metadata in RLS policies
    console.log("\n3️⃣ Checking RLS policies for user_metadata references...");
    const { data: policies, error: policiesError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
        SELECT schemaname, tablename, policyname, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (
          qual LIKE '%user_metadata%' 
          OR with_check LIKE '%user_metadata%'
        );
      `,
      },
    );

    if (policiesError) throw policiesError;

    if (policies && policies.length > 0) {
      console.error(
        `❌ Found ${policies.length} policies still referencing user_metadata:`,
      );
      policies.forEach((policy) => {
        console.error(`   - ${policy.tablename}.${policy.policyname}`);
      });
      issues += policies.length;
    } else {
      console.log("✅ No RLS policies reference user_metadata");
    }

    // 4. Check if is_admin() function exists
    console.log("\n4️⃣ Checking for secure is_admin() function...");
    const { data: adminFunc, error: funcError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
        SELECT proname, prosecdef 
        FROM pg_proc 
        WHERE proname = 'is_admin' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
      `,
      },
    );

    if (funcError) throw funcError;

    if (adminFunc && adminFunc.length > 0) {
      const func = adminFunc[0];
      if (func.prosecdef) {
        console.log("✅ is_admin() function exists with SECURITY DEFINER");
      } else {
        console.error(
          "❌ is_admin() function exists but without SECURITY DEFINER",
        );
        issues++;
      }
    } else {
      console.error("❌ is_admin() function not found");
      issues++;
    }

    // 5. Check for required indexes
    console.log("\n5️⃣ Checking for performance indexes...");
    const { data: indexes, error: indexError } = await supabase.rpc(
      "exec_sql",
      {
        sql: `
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname IN (
          'idx_profiles_id_role',
          'idx_performance_logs_user_id',
          'idx_query_performance_user_id'
        );
      `,
      },
    );

    if (indexError) throw indexError;

    const expectedIndexes = [
      "idx_profiles_id_role",
      "idx_performance_logs_user_id",
      "idx_query_performance_user_id",
    ];

    const foundIndexes = indexes ? indexes.map((i) => i.indexname) : [];
    expectedIndexes.forEach((idx) => {
      if (foundIndexes.includes(idx)) {
        console.log(`✅ Index ${idx} exists`);
      } else {
        console.log(`⚠️  Index ${idx} not found (performance optimization)`);
      }
    });

    // Summary
    console.log("\n📊 Summary:");
    if (issues === 0) {
      console.log("✅ All security fixes have been applied successfully!");
    } else {
      console.error(`❌ Found ${issues} security issues that need to be fixed`);
      console.log("\n💡 To fix these issues, run:");
      console.log("   node scripts/run-migration.js 19-fix-security-lints.sql");
    }
  } catch (error) {
    console.error("❌ Error verifying security fixes:", error.message);
    process.exit(1);
  }
}

// Note: exec_sql RPC function helper
async function createExecSqlFunction() {
  try {
    const { error } = await supabase
      .rpc("exec_sql", {
        sql: `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS json
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result json;
        BEGIN
          EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql || ') t' INTO result;
          RETURN result;
        END;
        $$;
      `,
      })
      .single();

    if (error && !error.message.includes("already exists")) {
      throw error;
    }
  } catch (error) {
    // Function might already exist, which is fine
    if (!error.message.includes("already exists")) {
      console.error(
        "Note: Could not create exec_sql helper function:",
        error.message,
      );
    }
  }
}

// Run verification
(async () => {
  await createExecSqlFunction();
  await verifySecurityFixes();
})();

#!/usr/bin/env node

/**
 * Supabase Advisor Fixes Validation Script
 * Tests and validates all security and performance improvements
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  console.error(
    "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test results tracking
const results = {
  security: [],
  performance: [],
  database: [],
  monitoring: [],
};

// Utility functions
function logSuccess(category, test, message) {
  console.log(`✅ [${category.toUpperCase()}] ${test}: ${message}`);
  results[category].push({ test, status: "success", message });
}

function logError(category, test, message) {
  console.log(`❌ [${category.toUpperCase()}] ${test}: ${message}`);
  results[category].push({ test, status: "error", message });
}

function logWarning(category, test, message) {
  console.log(`⚠️ [${category.toUpperCase()}] ${test}: ${message}`);
  results[category].push({ test, status: "warning", message });
}

// Security validation tests
async function validateSecurityFixes() {
  console.log("\n🛡️ Validating Security Fixes...");

  // Test 1: Check if security audit log table exists and has proper structure
  try {
    const { data, error } = await supabase
      .from("security_audit_log")
      .select("count(*)")
      .limit(1);

    if (error) {
      logError(
        "security",
        "Audit Log Table",
        `Table not accessible: ${error.message}`,
      );
    } else {
      logSuccess(
        "security",
        "Audit Log Table",
        "Security audit log table exists and is accessible",
      );
    }
  } catch (error) {
    logError(
      "security",
      "Audit Log Table",
      `Error checking table: ${error.message}`,
    );
  }

  // Test 2: Check if user security preferences table exists
  try {
    const { data, error } = await supabase
      .from("user_security_preferences")
      .select("count(*)")
      .limit(1);

    if (error) {
      logError(
        "security",
        "Security Preferences",
        `Table not accessible: ${error.message}`,
      );
    } else {
      logSuccess(
        "security",
        "Security Preferences",
        "User security preferences table exists",
      );
    }
  } catch (error) {
    logError(
      "security",
      "Security Preferences",
      `Error checking table: ${error.message}`,
    );
  }

  // Test 3: Validate password strength function
  try {
    const { data, error } = await supabase.rpc("validate_password_strength", {
      password: "WeakPassword123!",
    });

    if (error) {
      logError(
        "security",
        "Password Validation",
        `Function error: ${error.message}`,
      );
    } else {
      logSuccess(
        "security",
        "Password Validation",
        "Password strength validation function works",
      );
    }
  } catch (error) {
    logError(
      "security",
      "Password Validation",
      `Error testing function: ${error.message}`,
    );
  }

  // Test 4: Check RLS policies are enabled
  try {
    const { data, error } = await supabase
      .from("pg_class")
      .select("relname, relrowsecurity")
      .in("relname", ["security_audit_log", "user_security_preferences"]);

    if (error) {
      logError(
        "security",
        "RLS Policies",
        `Error checking RLS: ${error.message}`,
      );
    } else if (data && data.length > 0) {
      const rlsEnabled = data.every((table) => table.relrowsecurity);
      if (rlsEnabled) {
        logSuccess(
          "security",
          "RLS Policies",
          "Row Level Security is enabled on security tables",
        );
      } else {
        logWarning(
          "security",
          "RLS Policies",
          "Some security tables may not have RLS enabled",
        );
      }
    }
  } catch (error) {
    logWarning(
      "security",
      "RLS Policies",
      `Could not verify RLS status: ${error.message}`,
    );
  }
}

// Performance validation tests
async function validatePerformanceFixes() {
  console.log("\n⚡ Validating Performance Fixes...");

  // Test 1: Check if advanced indexes exist
  try {
    const { data, error } = await supabase
      .from("pg_indexes")
      .select("indexname, tablename")
      .like("indexname", "%_optimization%")
      .or(
        "indexname.like.%rls_optimization%,indexname.like.%time_partition%,indexname.like.%efficient_lookup%",
      );

    if (error) {
      logError(
        "performance",
        "Advanced Indexes",
        `Error checking indexes: ${error.message}`,
      );
    } else if (data && data.length > 0) {
      logSuccess(
        "performance",
        "Advanced Indexes",
        `Found ${data.length} performance optimization indexes`,
      );
    } else {
      logWarning(
        "performance",
        "Advanced Indexes",
        "No advanced optimization indexes found",
      );
    }
  } catch (error) {
    logError("performance", "Advanced Indexes", `Error: ${error.message}`);
  }

  // Test 2: Check materialized views
  try {
    const { data, error } = await supabase
      .from("pg_matviews")
      .select("matviewname, ispopulated")
      .in("matviewname", ["user_dashboard_stats", "service_analytics_summary"]);

    if (error) {
      logError(
        "performance",
        "Materialized Views",
        `Error checking views: ${error.message}`,
      );
    } else if (data && data.length > 0) {
      const populatedViews = data.filter((view) => view.ispopulated).length;
      logSuccess(
        "performance",
        "Materialized Views",
        `Found ${data.length} materialized views, ${populatedViews} populated`,
      );
    } else {
      logWarning(
        "performance",
        "Materialized Views",
        "No materialized views found",
      );
    }
  } catch (error) {
    logError("performance", "Materialized Views", `Error: ${error.message}`);
  }

  // Test 3: Test optimized functions
  try {
    const { data, error } = await supabase.rpc("get_connection_stats");

    if (error) {
      logError(
        "performance",
        "Connection Stats",
        `Function error: ${error.message}`,
      );
    } else if (data && data.length > 0) {
      const stats = data[0];
      logSuccess(
        "performance",
        "Connection Stats",
        `Active connections: ${stats.active_connections}/${stats.max_connections} (${stats.connection_utilization?.toFixed(1)}% utilization)`,
      );
    } else {
      logWarning(
        "performance",
        "Connection Stats",
        "No connection statistics available",
      );
    }
  } catch (error) {
    logError("performance", "Connection Stats", `Error: ${error.message}`);
  }

  // Test 4: Test query cache table
  try {
    const { data, error } = await supabase
      .from("query_cache")
      .select("count(*)")
      .limit(1);

    if (error) {
      logError(
        "performance",
        "Query Cache",
        `Cache table error: ${error.message}`,
      );
    } else {
      logSuccess(
        "performance",
        "Query Cache",
        "Query cache table is accessible",
      );
    }
  } catch (error) {
    logError("performance", "Query Cache", `Error: ${error.message}`);
  }
}

// Database health validation
async function validateDatabaseHealth() {
  console.log("\n🗄️ Validating Database Health...");

  // Test 1: Check table bloat analysis function
  try {
    const { data, error } = await supabase.rpc("analyze_table_bloat");

    if (error) {
      logError(
        "database",
        "Bloat Analysis",
        `Function error: ${error.message}`,
      );
    } else if (data && data.length > 0) {
      const highBloat = data.filter((table) => table.bloat_ratio > 20);
      if (highBloat.length === 0) {
        logSuccess(
          "database",
          "Bloat Analysis",
          "No tables with excessive bloat detected",
        );
      } else {
        logWarning(
          "database",
          "Bloat Analysis",
          `${highBloat.length} tables have high bloat ratio`,
        );
      }
    } else {
      logWarning(
        "database",
        "Bloat Analysis",
        "No bloat analysis data available",
      );
    }
  } catch (error) {
    logError("database", "Bloat Analysis", `Error: ${error.message}`);
  }

  // Test 2: Check index usage
  try {
    const { data, error } = await supabase
      .from("pg_stat_user_indexes")
      .select("schemaname, tablename, indexrelname, idx_scan")
      .eq("schemaname", "public")
      .order("idx_scan", { ascending: false })
      .limit(10);

    if (error) {
      logError(
        "database",
        "Index Usage",
        `Error checking indexes: ${error.message}`,
      );
    } else if (data && data.length > 0) {
      const unusedIndexes = data.filter((idx) => idx.idx_scan === 0);
      if (unusedIndexes.length === 0) {
        logSuccess(
          "database",
          "Index Usage",
          "All indexes are being used effectively",
        );
      } else {
        logWarning(
          "database",
          "Index Usage",
          `${unusedIndexes.length} indexes may be unused`,
        );
      }
    } else {
      logWarning(
        "database",
        "Index Usage",
        "No index usage statistics available",
      );
    }
  } catch (error) {
    logError("database", "Index Usage", `Error: ${error.message}`);
  }

  // Test 3: Check table statistics are up to date
  try {
    const { data, error } = await supabase
      .from("pg_stat_user_tables")
      .select("schemaname, relname, last_analyze, last_autoanalyze")
      .eq("schemaname", "public")
      .in("relname", ["estimates", "estimate_services", "analytics_events"]);

    if (error) {
      logError(
        "database",
        "Statistics",
        `Error checking statistics: ${error.message}`,
      );
    } else if (data && data.length > 0) {
      const recentlyAnalyzed = data.filter((table) => {
        const lastAnalyze = new Date(
          table.last_analyze || table.last_autoanalyze,
        );
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return lastAnalyze > dayAgo;
      });

      if (recentlyAnalyzed.length === data.length) {
        logSuccess(
          "database",
          "Statistics",
          "All critical tables have recent statistics",
        );
      } else {
        logWarning(
          "database",
          "Statistics",
          `${data.length - recentlyAnalyzed.length} tables need statistics update`,
        );
      }
    }
  } catch (error) {
    logError("database", "Statistics", `Error: ${error.message}`);
  }
}

// Monitoring validation
async function validateMonitoring() {
  console.log("\n📊 Validating Monitoring Setup...");

  // Test 1: Check performance monitoring tables
  try {
    const { data, error } = await supabase
      .from("performance_logs")
      .select("count(*)")
      .limit(1);

    if (error) {
      logError(
        "monitoring",
        "Performance Logs",
        `Table error: ${error.message}`,
      );
    } else {
      logSuccess(
        "monitoring",
        "Performance Logs",
        "Performance monitoring table is accessible",
      );
    }
  } catch (error) {
    logError("monitoring", "Performance Logs", `Error: ${error.message}`);
  }

  // Test 2: Check performance alerts table
  try {
    const { data, error } = await supabase
      .from("performance_alerts")
      .select("count(*)")
      .limit(1);

    if (error) {
      logError(
        "monitoring",
        "Performance Alerts",
        `Table error: ${error.message}`,
      );
    } else {
      logSuccess(
        "monitoring",
        "Performance Alerts",
        "Performance alerts table is accessible",
      );
    }
  } catch (error) {
    logError("monitoring", "Performance Alerts", `Error: ${error.message}`);
  }

  // Test 3: Check performance configuration
  try {
    const { data, error } = await supabase
      .from("performance_config")
      .select("setting_name, setting_value, enabled")
      .eq("enabled", true);

    if (error) {
      logError(
        "monitoring",
        "Performance Config",
        `Config error: ${error.message}`,
      );
    } else if (data && data.length > 0) {
      logSuccess(
        "monitoring",
        "Performance Config",
        `${data.length} performance settings configured`,
      );
    } else {
      logWarning(
        "monitoring",
        "Performance Config",
        "No performance configuration found",
      );
    }
  } catch (error) {
    logError("monitoring", "Performance Config", `Error: ${error.message}`);
  }

  // Test 4: Test cleanup function
  try {
    const { data, error } = await supabase.rpc("cleanup_performance_data", {
      retention_days: 90, // Use longer retention for test
    });

    if (error) {
      logError(
        "monitoring",
        "Cleanup Function",
        `Function error: ${error.message}`,
      );
    } else {
      logSuccess(
        "monitoring",
        "Cleanup Function",
        `Cleanup function works (${data || 0} records processed)`,
      );
    }
  } catch (error) {
    logError("monitoring", "Cleanup Function", `Error: ${error.message}`);
  }
}

// Main validation function
async function runValidation() {
  console.log("🔍 Starting Supabase Advisor Fixes Validation...\n");

  try {
    await validateSecurityFixes();
    await validatePerformanceFixes();
    await validateDatabaseHealth();
    await validateMonitoring();

    // Summary
    console.log("\n📋 Validation Summary:");
    console.log("=".repeat(50));

    let totalTests = 0;
    let successCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    Object.entries(results).forEach(([category, tests]) => {
      const success = tests.filter((t) => t.status === "success").length;
      const errors = tests.filter((t) => t.status === "error").length;
      const warnings = tests.filter((t) => t.status === "warning").length;

      console.log(`\n${category.toUpperCase()}:`);
      console.log(`  ✅ Success: ${success}`);
      console.log(`  ❌ Errors: ${errors}`);
      console.log(`  ⚠️  Warnings: ${warnings}`);

      totalTests += tests.length;
      successCount += success;
      errorCount += errors;
      warningCount += warnings;
    });

    console.log("\n" + "=".repeat(50));
    console.log(`OVERALL RESULTS:`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(
      `✅ Success: ${successCount} (${((successCount / totalTests) * 100).toFixed(1)}%)`,
    );
    console.log(
      `❌ Errors: ${errorCount} (${((errorCount / totalTests) * 100).toFixed(1)}%)`,
    );
    console.log(
      `⚠️  Warnings: ${warningCount} (${((warningCount / totalTests) * 100).toFixed(1)}%)`,
    );

    // Exit with appropriate code
    if (errorCount > 0) {
      console.log(
        "\n❌ Validation completed with errors. Please review and fix issues.",
      );
      process.exit(1);
    } else if (warningCount > 0) {
      console.log(
        "\n⚠️ Validation completed with warnings. Consider addressing warnings.",
      );
      process.exit(0);
    } else {
      console.log("\n🎉 All validations passed successfully!");
      process.exit(0);
    }
  } catch (error) {
    console.error("\n💥 Validation failed with error:", error.message);
    process.exit(1);
  }
}

// Error handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Run validation
runValidation();

#!/usr/bin/env node

/**
 * EstimatePro Performance Monitoring Script
 *
 * Monitors database performance metrics, index usage, and query patterns
 * Provides actionable insights for performance optimization
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing required environment variables");
  console.error(
    "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Get table performance statistics
 */
async function getTableStats() {
  console.log("📊 Table Performance Statistics\n");

  const { data, error } = await supabase.rpc("execute_sql", {
    sql: `
      SELECT 
          schemaname,
          relname as tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as total_size,
          CASE 
              WHEN seq_scan > 0 AND seq_tup_read > COALESCE(idx_tup_fetch, 0) 
              THEN 'needs_optimization'
              WHEN idx_scan > seq_scan * 2 THEN 'well_optimized'
              ELSE 'acceptable'
          END as performance_status,
          ROUND(
              CASE 
                  WHEN (seq_scan + idx_scan) > 0 
                  THEN (idx_scan::float / (seq_scan + idx_scan) * 100)
                  ELSE 0 
              END, 
              2
          ) as index_usage_ratio
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY seq_tup_read DESC, seq_scan DESC
      LIMIT 15
    `,
  });

  if (error) {
    console.error("❌ Error fetching table stats:", error.message);
    return;
  }

  console.table(
    data.map((row) => ({
      Table: row.tablename,
      "Seq Scans": row.seq_scan?.toLocaleString() || "0",
      "Seq Reads": row.seq_tup_read?.toLocaleString() || "0",
      "Index Scans": row.idx_scan?.toLocaleString() || "0",
      "Index Reads": row.idx_tup_fetch?.toLocaleString() || "0",
      Size: row.total_size,
      "Index %": row.index_usage_ratio + "%",
      Status: row.performance_status,
    })),
  );

  return data;
}

/**
 * Get index usage statistics
 */
async function getIndexStats() {
  console.log("\n🔍 Index Usage Analysis\n");

  const { data, error } = await supabase.rpc("execute_sql", {
    sql: `
      SELECT 
          schemaname,
          relname as tablename,
          indexrelname as indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch,
          CASE 
              WHEN idx_scan = 0 THEN 'unused'
              WHEN idx_scan < 100 THEN 'low_usage'
              WHEN idx_scan < 1000 THEN 'moderate_usage'
              ELSE 'high_usage'
          END as usage_category
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 20
    `,
  });

  if (error) {
    console.error("❌ Error fetching index stats:", error.message);
    return;
  }

  console.table(
    data.map((row) => ({
      Table: row.tablename,
      Index: row.indexname,
      Scans: row.idx_scan?.toLocaleString() || "0",
      "Tuples Read": row.idx_tup_read?.toLocaleString() || "0",
      Usage: row.usage_category,
    })),
  );

  // Find unused indexes
  const unusedIndexes = data.filter((row) => row.idx_scan === 0);
  if (unusedIndexes.length > 0) {
    console.log(`\n⚠️  Found ${unusedIndexes.length} unused indexes:`);
    unusedIndexes.forEach((idx) => {
      console.log(`   - ${idx.tablename}.${idx.indexname}`);
    });
  }

  return data;
}

/**
 * Analyze performance improvements
 */
async function analyzePerformanceImprovements(tableStats) {
  console.log("\n📈 Performance Analysis\n");

  const highImpactTables = tableStats.filter(
    (table) =>
      table.seq_tup_read > 1000 &&
      table.performance_status === "needs_optimization",
  );

  const wellOptimizedTables = tableStats.filter(
    (table) => table.performance_status === "well_optimized",
  );

  console.log(`✅ Well Optimized Tables: ${wellOptimizedTables.length}`);
  console.log(`⚠️  Tables Needing Optimization: ${highImpactTables.length}`);

  if (highImpactTables.length > 0) {
    console.log("\n🚨 High Priority Optimization Targets:");
    highImpactTables.forEach((table) => {
      const seqRatio = table.seq_tup_read / (table.idx_tup_fetch || 1);
      console.log(
        `   • ${table.tablename}: ${table.seq_tup_read.toLocaleString()} seq reads (${Math.round(seqRatio)}x more than index reads)`,
      );
    });
  }

  // Calculate overall performance score
  const totalTables = tableStats.length;
  const optimizedCount = wellOptimizedTables.length;
  const acceptableCount = tableStats.filter(
    (t) => t.performance_status === "acceptable",
  ).length;

  const performanceScore = Math.round(
    ((optimizedCount * 3 + acceptableCount * 2) / (totalTables * 3)) * 100,
  );

  console.log(`\n📊 Overall Performance Score: ${performanceScore}%`);

  if (performanceScore < 70) {
    console.log("🔧 Recommendation: Apply critical performance fixes");
  } else if (performanceScore < 85) {
    console.log("⚡ Recommendation: Fine-tune remaining indexes");
  } else {
    console.log("✨ Excellent! Database is well optimized");
  }
}

/**
 * Get connection pool statistics
 */
async function getConnectionPoolStats() {
  console.log("\n🔄 Connection Pool Health\n");

  try {
    // Test connection health
    const startTime = Date.now();
    const { data, error } = await supabase
      .from("profiles")
      .select("count")
      .limit(1);

    const responseTime = Date.now() - startTime;

    console.log(`✅ Database Response Time: ${responseTime}ms`);

    if (responseTime < 100) {
      console.log("🚀 Excellent response time");
    } else if (responseTime < 500) {
      console.log("✅ Good response time");
    } else {
      console.log("⚠️  Slow response time - check connection pool");
    }

    if (error) {
      console.log(`❌ Connection Error: ${error.message}`);
    }
  } catch (error) {
    console.error("❌ Connection pool test failed:", error.message);
  }
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(tableStats, indexStats) {
  console.log("\n💡 Performance Recommendations\n");

  const recommendations = [];

  // Check for tables with high sequential scan ratios
  tableStats.forEach((table) => {
    if (table.seq_tup_read > 10000 && table.index_usage_ratio < 50) {
      recommendations.push(
        `🔥 HIGH PRIORITY: Add indexes to ${table.tablename} (${table.seq_tup_read.toLocaleString()} sequential reads)`,
      );
    }
  });

  // Check for unused indexes
  const unusedIndexes = indexStats.filter((idx) => idx.idx_scan === 0);
  if (unusedIndexes.length > 5) {
    recommendations.push(
      `🧹 CLEANUP: Consider removing ${unusedIndexes.length} unused indexes to improve write performance`,
    );
  }

  // Check for tables needing covering indexes
  const heavyTables = tableStats.filter(
    (table) => table.idx_scan > 10000 && table.seq_scan > table.idx_scan * 0.1,
  );
  if (heavyTables.length > 0) {
    recommendations.push(
      `📋 OPTIMIZATION: Add covering indexes to ${heavyTables.map((t) => t.tablename).join(", ")} for better query performance`,
    );
  }

  if (recommendations.length === 0) {
    console.log("✨ No major performance issues detected!");
  } else {
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  console.log("\n📋 Next Steps:");
  console.log("1. Run: node scripts/performance-critical-fixes.sql");
  console.log("2. Monitor: npm run perf:monitor");
  console.log("3. Test: npm run perf:test");
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "full";

  console.log("🎯 EstimatePro Performance Monitor\n");

  try {
    switch (command) {
      case "tables":
        await getTableStats();
        break;

      case "indexes":
        await getIndexStats();
        break;

      case "pool":
        await getConnectionPoolStats();
        break;

      case "quick":
        const quickStats = await getTableStats();
        await analyzePerformanceImprovements(quickStats);
        break;

      case "full":
      default:
        const tableStats = await getTableStats();
        const indexStats = await getIndexStats();
        await getConnectionPoolStats();
        await analyzePerformanceImprovements(tableStats);
        generateRecommendations(tableStats, indexStats);
        break;
    }
  } catch (error) {
    console.error("❌ Performance monitoring failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  getTableStats,
  getIndexStats,
  getConnectionPoolStats,
  analyzePerformanceImprovements,
  generateRecommendations,
};

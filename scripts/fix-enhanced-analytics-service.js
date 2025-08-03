#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔧 Fixing enhanced-analytics-service.ts...\n");

const filePath = path.join(
  __dirname,
  "..",
  "lib",
  "analytics",
  "enhanced-analytics-service.ts",
);

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, "utf8");

  // Replace all occurrences of this.supabase with createClient()
  content = content.replace(/this\.supabase/g, "createClient()");

  // Find all async methods that now use createClient() and add const supabase = createClient() at the start
  const methodPatterns = [
    /async (getBusinessMetrics|getFinancialAnalysis|getPredictiveAnalytics|generateRecommendations|calculateRevenueGrowthRate|calculateDealSizeGrowthRate|calculateCustomerMetrics|calculateProfitMargin|calculateOperatingRatio|getEfficiencyMetrics|getGrowthMetrics|getCashFlowMetrics|getCustomerAcquisitionMetrics|getCustomerRetentionMetrics|getMarketingMetrics|getSalesPerformanceMetrics|getOperationalMetrics|getRiskMetrics|getBenchmarkingData|getIndustryComparisons|getPeerAnalysis|getCompetitivePosition|getMarketShareAnalysis|getCustomerSegmentAnalysis|getProductPerformanceAnalysis|getSeasonalityAnalysis|getForecasting|getPredictiveModeling|getRiskAssessment|getScenarioAnalysis|getSensitivityAnalysis|getValueAtRisk|getStressTestResults|getComplianceMetrics|getESGMetrics|calculateGrossMargin|calculateOperatingMargin|calculateEBITDA|calculateROI|calculateROE|calculateROA|calculateCurrentRatio|calculateQuickRatio|calculateDebtToEquityRatio|calculateInterestCoverageRatio|calculateInventoryTurnover|calculateReceivablesTurnover|calculatePayablesTurnover|calculateCashConversionCycle|calculateWorkingCapitalRatio|calculateAssetTurnover|calculateEquityMultiplier)\s*\([^)]*\):\s*Promise<[^>]+>\s*\{/g,
  ];

  methodPatterns.forEach((pattern) => {
    content = content.replace(pattern, (match) => {
      const methodStart = match.indexOf("{") + 1;
      const beforeBrace = match.substring(0, methodStart);
      const afterBrace = "";

      // Check if it already has const supabase
      if (!match.includes("const supabase")) {
        return (
          beforeBrace + "\n    const supabase = createClient();" + afterBrace
        );
      }
      return match;
    });
  });

  // Fix specific methods that might have multiple createClient() calls
  content = content.replace(/createClient\(\)\.from/g, "supabase.from");

  fs.writeFileSync(filePath, content);
  console.log("✅ Fixed enhanced-analytics-service.ts");
}

console.log("\n✨ Enhanced analytics service fix complete!");

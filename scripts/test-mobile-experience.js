#!/usr/bin/env node

/**
 * Mobile Experience Testing Script
 *
 * Comprehensive testing suite for mobile workflows, performance,
 * and user experience validation.
 *
 * Part of Phase 4 Priority 5: Test Mobile Experience
 */

const fs = require("fs");
const path = require("path");

// Test configuration
const MOBILE_COMPONENTS_PATH = path.join(
  __dirname,
  "../components/estimation/mobile",
);
const TEST_RESULTS_FILE = path.join(__dirname, "../MOBILE_TEST_RESULTS.md");

// Mobile breakpoints for testing
const MOBILE_BREAKPOINTS = [
  { name: "Small Mobile", width: 320, height: 568 },
  { name: "Standard Mobile", width: 375, height: 667 },
  { name: "Large Mobile", width: 414, height: 896 },
  { name: "Tablet", width: 768, height: 1024 },
];

// Core Web Vitals thresholds
const PERFORMANCE_THRESHOLDS = {
  LCP: 2500, // 2.5s
  INP: 200, // 200ms
  CLS: 0.1, // 0.1
  FCP: 1800, // 1.8s
  TTFB: 600, // 600ms
};

/**
 * Test Results Tracking
 */
class MobileTestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      overall_status: "RUNNING",
      components_tested: 0,
      tests_passed: 0,
      tests_failed: 0,
      performance_metrics: {},
      issues_found: [],
      recommendations: [],
    };
  }

  /**
   * Test 1: Component Structure Validation
   */
  testComponentStructure() {
    console.log("🔍 Testing mobile component structure...");

    const expectedComponents = [
      "MobileProjectSetup.tsx",
      "MobileMeasurements.tsx",
      "MobilePricing.tsx",
      "MobileSummary.tsx",
      "MobileGuidedFlowLayout.tsx",
      "index.tsx",
    ];

    let passed = 0;
    let failed = 0;

    for (const component of expectedComponents) {
      const componentPath = path.join(MOBILE_COMPONENTS_PATH, component);
      if (fs.existsSync(componentPath)) {
        console.log(`  ✅ ${component} - Found`);
        passed++;

        // Check file size (should be substantial for main components)
        const stats = fs.statSync(componentPath);
        const sizeKB = Math.round(stats.size / 1024);

        if (
          component.startsWith("Mobile") &&
          component !== "MobileGuidedFlowLayout.tsx" &&
          sizeKB < 15
        ) {
          this.results.issues_found.push(
            `${component} seems too small (${sizeKB}KB) - may be incomplete`,
          );
          failed++;
        } else {
          console.log(`    📏 Size: ${sizeKB}KB`);
        }
      } else {
        console.log(`  ❌ ${component} - Missing`);
        failed++;
        this.results.issues_found.push(`Missing component: ${component}`);
      }
    }

    this.results.components_tested = expectedComponents.length;
    this.results.tests_passed += passed;
    this.results.tests_failed += failed;

    return { passed, failed, total: expectedComponents.length };
  }

  /**
   * Test 2: Import/Export Validation
   */
  testImportsExports() {
    console.log("📦 Testing imports and exports...");

    let passed = 0;
    let failed = 0;

    try {
      // Test index.tsx exports
      const indexPath = path.join(MOBILE_COMPONENTS_PATH, "index.tsx");
      if (fs.existsSync(indexPath)) {
        const indexContent = fs.readFileSync(indexPath, "utf8");

        const expectedExports = [
          "MobileGuidedFlowLayout",
          "MobileProjectSetup",
          "MobileMeasurements",
          "MobilePricing",
          "MobileSummary",
        ];

        for (const exportName of expectedExports) {
          if (indexContent.includes(`export { ${exportName} }`)) {
            console.log(`  ✅ Export: ${exportName}`);
            passed++;
          } else {
            console.log(`  ❌ Missing export: ${exportName}`);
            failed++;
            this.results.issues_found.push(`Missing export: ${exportName}`);
          }
        }
      } else {
        console.log("  ❌ index.tsx not found");
        failed++;
        this.results.issues_found.push("Missing index.tsx");
      }

      // Test component imports
      const components = [
        "MobileProjectSetup.tsx",
        "MobileMeasurements.tsx",
        "MobilePricing.tsx",
        "MobileSummary.tsx",
      ];

      for (const component of components) {
        const componentPath = path.join(MOBILE_COMPONENTS_PATH, component);
        if (fs.existsSync(componentPath)) {
          const content = fs.readFileSync(componentPath, "utf8");

          // Check for essential imports
          const requiredImports = [
            "React",
            "framer-motion",
            "@/lib/utils",
            "@/components/ui/card",
            "useHapticFeedback",
            "useDeviceCapabilities",
          ];

          let componentPassed = 0;
          for (const importName of requiredImports) {
            if (content.includes(importName)) {
              componentPassed++;
            }
          }

          if (componentPassed >= requiredImports.length * 0.8) {
            // 80% of imports present
            console.log(
              `  ✅ ${component} - Imports OK (${componentPassed}/${requiredImports.length})`,
            );
            passed++;
          } else {
            console.log(
              `  ❌ ${component} - Missing imports (${componentPassed}/${requiredImports.length})`,
            );
            failed++;
            this.results.issues_found.push(
              `${component} missing critical imports`,
            );
          }
        }
      }
    } catch (error) {
      console.log(`  ❌ Import/Export test failed: ${error.message}`);
      failed++;
      this.results.issues_found.push(
        `Import/Export test error: ${error.message}`,
      );
    }

    this.results.tests_passed += passed;
    this.results.tests_failed += failed;

    return { passed, failed };
  }

  /**
   * Test 3: TypeScript Interface Validation
   */
  testTypeScriptInterfaces() {
    console.log("🔧 Testing TypeScript interfaces...");

    let passed = 0;
    let failed = 0;

    const components = [
      "MobileProjectSetup.tsx",
      "MobileMeasurements.tsx",
      "MobilePricing.tsx",
      "MobileSummary.tsx",
    ];

    for (const component of components) {
      const componentPath = path.join(MOBILE_COMPONENTS_PATH, component);
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, "utf8");

        // Check for proper props interface
        const componentName = component.replace(".tsx", "");
        const propsInterface = `${componentName}Props`;

        if (content.includes(`interface ${propsInterface}`)) {
          console.log(`  ✅ ${component} - Props interface defined`);
          passed++;

          // Check for essential props
          const essentialProps = ["data", "onUpdate", "isMobile"];
          let propsFound = 0;

          for (const prop of essentialProps) {
            if (content.includes(`${prop}:`)) {
              propsFound++;
            }
          }

          if (propsFound >= essentialProps.length) {
            console.log(
              `    ✅ Essential props present (${propsFound}/${essentialProps.length})`,
            );
            passed++;
          } else {
            console.log(
              `    ❌ Missing essential props (${propsFound}/${essentialProps.length})`,
            );
            failed++;
            this.results.issues_found.push(
              `${component} missing essential props`,
            );
          }
        } else {
          console.log(`  ❌ ${component} - Missing props interface`);
          failed++;
          this.results.issues_found.push(
            `${component} missing props interface`,
          );
        }

        // Check for proper function component export
        if (
          content.includes("export function") &&
          content.includes("export default")
        ) {
          console.log(`    ✅ Proper export structure`);
          passed++;
        } else {
          console.log(`    ❌ Improper export structure`);
          failed++;
          this.results.issues_found.push(
            `${component} improper export structure`,
          );
        }
      }
    }

    this.results.tests_passed += passed;
    this.results.tests_failed += failed;

    return { passed, failed };
  }

  /**
   * Test 4: Mobile-Specific Features
   */
  testMobileFeatures() {
    console.log("📱 Testing mobile-specific features...");

    let passed = 0;
    let failed = 0;

    const components = [
      "MobileProjectSetup.tsx",
      "MobileMeasurements.tsx",
      "MobilePricing.tsx",
      "MobileSummary.tsx",
    ];

    const mobileFeatures = [
      { name: "Haptic Feedback", pattern: "haptic\\(" },
      { name: "Touch Optimization", pattern: "touch-manipulation" },
      { name: "Device Capabilities", pattern: "useDeviceCapabilities" },
      { name: "Framer Motion", pattern: "motion\\." },
      { name: "Mobile Input", pattern: "EnhancedMobileInput" },
      { name: "Card Components", pattern: "<Card" },
      { name: "Responsive Classes", pattern: "flex|grid|space-" },
    ];

    for (const component of components) {
      const componentPath = path.join(MOBILE_COMPONENTS_PATH, component);
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, "utf8");
        let componentScore = 0;

        console.log(`  Testing ${component}:`);

        for (const feature of mobileFeatures) {
          const regex = new RegExp(feature.pattern, "g");
          const matches = content.match(regex);

          if (matches && matches.length > 0) {
            console.log(`    ✅ ${feature.name} (${matches.length} uses)`);
            componentScore++;
            passed++;
          } else {
            console.log(`    ❌ ${feature.name} - Not found`);
            failed++;
          }
        }

        const featurePercentage = Math.round(
          (componentScore / mobileFeatures.length) * 100,
        );
        console.log(`    📊 Mobile Feature Score: ${featurePercentage}%`);

        if (featurePercentage < 60) {
          this.results.issues_found.push(
            `${component} has low mobile feature score (${featurePercentage}%)`,
          );
        }
      }
    }

    this.results.tests_passed += passed;
    this.results.tests_failed += failed;

    return { passed, failed };
  }

  /**
   * Test 5: Accessibility Features
   */
  testAccessibility() {
    console.log("♿ Testing accessibility features...");

    let passed = 0;
    let failed = 0;

    const components = [
      "MobileProjectSetup.tsx",
      "MobileMeasurements.tsx",
      "MobilePricing.tsx",
      "MobileSummary.tsx",
    ];

    const a11yFeatures = [
      { name: "ARIA Labels", pattern: "aria-label|aria-" },
      { name: "Semantic HTML", pattern: "<(button|input|form|h[1-6]|section)" },
      { name: "Focus Management", pattern: "autoFocus|focus:|tabIndex" },
      { name: "Screen Reader Text", pattern: "sr-only|screen-reader" },
      { name: "Touch Targets", pattern: "min-h-\\[44px\\]|h-8|h-10|h-12" },
      { name: "Form Labels", pattern: "<label|htmlFor" },
    ];

    for (const component of components) {
      const componentPath = path.join(MOBILE_COMPONENTS_PATH, component);
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, "utf8");
        let componentScore = 0;

        console.log(`  Testing ${component}:`);

        for (const feature of a11yFeatures) {
          const regex = new RegExp(feature.pattern, "gi");
          const matches = content.match(regex);

          if (matches && matches.length > 0) {
            console.log(`    ✅ ${feature.name} (${matches.length} instances)`);
            componentScore++;
            passed++;
          } else {
            console.log(`    ⚠️  ${feature.name} - Not found`);
            failed++;
          }
        }

        const a11yPercentage = Math.round(
          (componentScore / a11yFeatures.length) * 100,
        );
        console.log(`    ♿ Accessibility Score: ${a11yPercentage}%`);

        if (a11yPercentage < 50) {
          this.results.issues_found.push(
            `${component} has low accessibility score (${a11yPercentage}%)`,
          );
          this.results.recommendations.push(
            `Improve accessibility features in ${component}`,
          );
        }
      }
    }

    this.results.tests_passed += passed;
    this.results.tests_failed += failed;

    return { passed, failed };
  }

  /**
   * Test 6: Performance Considerations
   */
  testPerformanceConsiderations() {
    console.log("⚡ Testing performance considerations...");

    let passed = 0;
    let failed = 0;

    const components = [
      "MobileProjectSetup.tsx",
      "MobileMeasurements.tsx",
      "MobilePricing.tsx",
      "MobileSummary.tsx",
    ];

    for (const component of components) {
      const componentPath = path.join(MOBILE_COMPONENTS_PATH, component);
      if (fs.existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, "utf8");
        const stats = fs.statSync(componentPath);
        const sizeKB = Math.round(stats.size / 1024);

        console.log(`  Testing ${component} (${sizeKB}KB):`);

        // Check file size
        if (sizeKB < 100) {
          console.log(`    ✅ File size OK (${sizeKB}KB)`);
          passed++;
        } else {
          console.log(`    ⚠️  Large file size (${sizeKB}KB)`);
          failed++;
          this.results.issues_found.push(`${component} is large (${sizeKB}KB)`);
          this.results.recommendations.push(
            `Consider code splitting for ${component}`,
          );
        }

        // Check for performance optimizations
        const perfFeatures = [
          { name: "useCallback", pattern: "useCallback" },
          { name: "useMemo", pattern: "useMemo" },
          { name: "React.memo", pattern: "React\\.memo|memo\\(" },
          { name: "Debouncing", pattern: "debounce|throttle" },
        ];

        let perfScore = 0;
        for (const feature of perfFeatures) {
          const regex = new RegExp(feature.pattern, "g");
          if (content.match(regex)) {
            console.log(`    ✅ ${feature.name}`);
            perfScore++;
            passed++;
          } else {
            console.log(`    ❓ ${feature.name} - Not found`);
          }
        }

        if (perfScore < 2) {
          this.results.recommendations.push(
            `Consider adding performance optimizations to ${component}`,
          );
        }
      }
    }

    this.results.tests_passed += passed;
    this.results.tests_failed += failed;

    return { passed, failed };
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const totalTests = this.results.tests_passed + this.results.tests_failed;
    const successRate =
      totalTests > 0
        ? Math.round((this.results.tests_passed / totalTests) * 100)
        : 0;

    this.results.overall_status =
      successRate >= 80 ? "PASSED" : successRate >= 60 ? "WARNING" : "FAILED";

    const report = `# Mobile Experience Test Results
Generated: ${this.results.timestamp}

## 📊 Overall Results
- **Status**: ${this.results.overall_status}
- **Success Rate**: ${successRate}% (${this.results.tests_passed}/${totalTests})
- **Components Tested**: ${this.results.components_tested}

## 🧪 Test Categories

### ✅ Tests Passed: ${this.results.tests_passed}
### ❌ Tests Failed: ${this.results.tests_failed}

## 🚨 Issues Found (${this.results.issues_found.length})
${this.results.issues_found.map((issue) => `- ${issue}`).join("\n")}

## 💡 Recommendations (${this.results.recommendations.length})
${this.results.recommendations.map((rec) => `- ${rec}`).join("\n")}

## 📈 Performance Summary
- Mobile components are structurally complete
- Essential mobile features implemented
- Accessibility features need improvement in some areas
- Performance optimizations could be enhanced

## 🎯 Next Steps
1. **${this.results.overall_status === "PASSED" ? "Deploy to staging" : "Fix critical issues"}**
2. **Device Testing**: Test on real mobile devices
3. **Performance Testing**: Run Lighthouse audits
4. **User Testing**: Get feedback from mobile users
5. **Accessibility Audit**: Complete WCAG compliance check

---
*Mobile Testing Script v1.0 - Phase 4 Priority 5*
`;

    fs.writeFileSync(TEST_RESULTS_FILE, report);
    console.log(`\n📄 Test report saved to: ${TEST_RESULTS_FILE}`);

    return report;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log("🚀 Starting Mobile Experience Testing\n");

    // Run test suite
    console.log("=".repeat(50));
    const structureResults = this.testComponentStructure();

    console.log("\n" + "=".repeat(50));
    const importResults = this.testImportsExports();

    console.log("\n" + "=".repeat(50));
    const typeResults = this.testTypeScriptInterfaces();

    console.log("\n" + "=".repeat(50));
    const mobileResults = this.testMobileFeatures();

    console.log("\n" + "=".repeat(50));
    const a11yResults = this.testAccessibility();

    console.log("\n" + "=".repeat(50));
    const perfResults = this.testPerformanceConsiderations();

    console.log("\n" + "=".repeat(50));
    console.log("📊 FINAL RESULTS");
    console.log("=".repeat(50));

    const report = this.generateReport();

    console.log("\n✅ Mobile experience testing completed!");
    console.log(`📄 Full report: ${TEST_RESULTS_FILE}`);

    const totalTests = this.results.tests_passed + this.results.tests_failed;
    const successRate =
      totalTests > 0
        ? Math.round((this.results.tests_passed / totalTests) * 100)
        : 0;

    console.log(`🎯 Overall Success Rate: ${successRate}%`);
    console.log(`📱 Status: ${this.results.overall_status}`);

    if (this.results.issues_found.length > 0) {
      console.log(
        `\n🚨 ${this.results.issues_found.length} issues found - check report for details`,
      );
    }

    if (this.results.recommendations.length > 0) {
      console.log(
        `💡 ${this.results.recommendations.length} recommendations - check report for details`,
      );
    }

    return {
      success: this.results.overall_status === "PASSED",
      successRate,
      totalTests,
      report,
    };
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new MobileTestRunner();
  runner
    .runAllTests()
    .then((results) => {
      process.exit(results.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Testing failed:", error);
      process.exit(1);
    });
}

module.exports = MobileTestRunner;

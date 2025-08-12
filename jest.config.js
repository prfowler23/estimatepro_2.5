const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testEnvironment: "jest-environment-jsdom",
  transformIgnorePatterns: [
    "node_modules/(?!(isows|@supabase|jose|p-queue|eventemitter3|@faker-js)/)",
  ],

  // Enhanced Coverage Configuration
  collectCoverageFrom: [
    "components/**/*.{js,jsx,ts,tsx}",
    "lib/**/*.{js,jsx,ts,tsx}",
    "hooks/**/*.{js,jsx,ts,tsx}",
    "app/**/*.{js,jsx,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/__tests__/**",
    "!**/coverage/**",
    "!app/layout.tsx",
    "!app/globals.css",
    "!**/*.config.{js,ts}",
    "!**/build/**",
    "!**/dist/**",
  ],

  coverageThreshold: {
    global: {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70,
    },
    // Critical unified services with progressive thresholds
    "lib/services/ai-service.ts": {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85,
    },
    "lib/services/estimate-service-unified.ts": {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    "lib/services/workflow-service-unified.ts": {
      branches: 65,
      functions: 70,
      lines: 75,
      statements: 75,
    },
    "lib/services/resource-service-unified.ts": {
      branches: 65,
      functions: 70,
      lines: 75,
      statements: 75,
    },
    "lib/services/analytics-service-unified.ts": {
      branches: 60,
      functions: 65,
      lines: 70,
      statements: 70,
    },
  },

  // Enhanced Test Matching
  testMatch: [
    "<rootDir>/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}",
    "<rootDir>/**/*.{test,spec}.{js,jsx,ts,tsx}",
  ],

  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/coverage/",
    "<rootDir>/__tests__/test-utils.tsx",
    "<rootDir>/__tests__/utils/",
    "<rootDir>/__tests__/__mocks__/",
    "<rootDir>/__tests__/.*\\.md$",
    "<rootDir>/lib/supabase/",
    "<rootDir>/lib/config/",
  ],

  // Test Categories Support
  maxWorkers: "50%",
  testTimeout: 15000,

  // Unified Services Specific Configuration
  testEnvironmentOptions: {
    url: "http://localhost:3000",
  },

  // Enhanced Reporting
  reporters: [
    "default",
    [
      "jest-html-reporters",
      {
        publicPath: "./coverage/html",
        filename: "test-report.html",
        expand: true,
        hideIcon: false,
        pageTitle: "EstimatePro Test Report",
        logoImgPath: undefined,
        inlineSource: false,
      },
    ],
  ],

  // Code Coverage Reports
  coverageReporters: ["text", "lcov", "html", "json-summary"],
  coverageDirectory: "coverage",

  // Performance & Error Handling
  bail: false,
  verbose: false,
  detectOpenHandles: true,
  forceExit: true,

  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],

  // Custom Test Environment Settings
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },

  // Mock handling
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,

  // Enhanced error handling for unified services
  errorOnDeprecated: false,
};

module.exports = createJestConfig(customJestConfig);

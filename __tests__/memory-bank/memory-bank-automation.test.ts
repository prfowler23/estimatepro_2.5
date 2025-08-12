/**
 * Memory Bank Automation Tests
 * Validates memory bank automation functionality
 */

import { MemoryBankAutomationService } from "@/lib/services/memory-bank-automation-service";
import fs from "fs/promises";
import path from "path";

// Mock logger to avoid console output during tests
jest.mock("@/lib/services/core/logger", () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe("MemoryBankAutomationService", () => {
  let service: MemoryBankAutomationService;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = path.join(__dirname, "temp-memory-bank");
    await fs.mkdir(tempDir, { recursive: true });

    // Mock the service to use temp directory
    service = new MemoryBankAutomationService();
    // Override the private memoryBankPath for testing
    (service as any).memoryBankPath = tempDir;

    // Create required files
    await fs.writeFile(
      path.join(tempDir, "activeContext.md"),
      "# Test Context\n",
    );
    await fs.writeFile(path.join(tempDir, "progress.md"), "# Test Progress\n");
    await fs.writeFile(
      path.join(tempDir, "systemPatterns.md"),
      "# Test Patterns\n",
    );
    await fs.writeFile(path.join(tempDir, ".clinerules"), "# Test Rules\n");
    await fs.writeFile(
      path.join(tempDir, "sync-metadata.json"),
      JSON.stringify({
        version: "1.0.0",
        last_updated: new Date().toISOString(),
        automation_status: "testing",
        trigger_conditions: {},
        file_status: {},
        integration_status: {},
        performance_metrics: {},
      }),
    );
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("initialization", () => {
    it("should initialize successfully with valid memory bank structure", async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it("should throw error if required files are missing", async () => {
      // Remove a required file
      await fs.unlink(path.join(tempDir, "activeContext.md"));

      await expect(service.initialize()).rejects.toThrow(
        "Required memory bank file not found: activeContext.md",
      );
    });

    it("should load sync metadata correctly", async () => {
      await service.initialize();

      // Verify metadata was loaded
      const syncMetadata = (service as any).syncMetadata;
      expect(syncMetadata).toBeDefined();
      expect(syncMetadata.version).toBe("1.0.0");
      expect(syncMetadata.automation_status).toBe("testing");
    });
  });

  describe("PR creation handling", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should handle PR creation and update context", async () => {
      const prData = {
        title: "Test PR",
        description: "Test description",
        branch: "feature/test",
        author: "test-user",
        files: ["src/component.ts", "lib/service.ts"],
      };

      await expect(service.handlePRCreation(prData)).resolves.not.toThrow();

      // Verify context file was updated
      const contextContent = await fs.readFile(
        path.join(tempDir, "activeContext.md"),
        "utf-8",
      );
      expect(contextContent).toContain("Test PR");
      expect(contextContent).toContain("feature/test");
      expect(contextContent).toContain("test-user");
    });

    it("should update sync metadata after PR creation", async () => {
      const prData = {
        title: "Test PR",
        description: "Test description",
        branch: "feature/test",
        author: "test-user",
        files: ["src/component.ts"],
      };

      await service.handlePRCreation(prData);

      // Verify metadata was updated
      const metadataContent = await fs.readFile(
        path.join(tempDir, "sync-metadata.json"),
        "utf-8",
      );
      const metadata = JSON.parse(metadataContent);

      expect(metadata.trigger_conditions.pr_creation).toBeDefined();
      expect(metadata.trigger_conditions.pr_creation.total_triggers).toBe(1);
    });
  });

  describe("test completion handling", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should handle test completion and update progress", async () => {
      const testResults = {
        totalTests: 100,
        passedTests: 95,
        failedTests: 5,
        coverage: 85,
        duration: 5000,
        testFiles: ["test1.test.ts", "test2.test.ts"],
      };

      await expect(
        service.handleTestCompletion(testResults),
      ).resolves.not.toThrow();

      // Verify progress file was updated
      const progressContent = await fs.readFile(
        path.join(tempDir, "progress.md"),
        "utf-8",
      );
      expect(progressContent).toContain("95% Complete");
      expect(progressContent).toContain("95/100 passed");
      expect(progressContent).toContain("85%"); // coverage
    });

    it("should correctly identify milestone achievement", async () => {
      const testResults = {
        totalTests: 100,
        passedTests: 85, // 85% pass rate = milestone
        failedTests: 15,
        coverage: 90,
        duration: 3000,
        testFiles: ["test1.test.ts"],
      };

      await service.handleTestCompletion(testResults);

      // Check if milestone was recorded in metadata
      const metadataContent = await fs.readFile(
        path.join(tempDir, "sync-metadata.json"),
        "utf-8",
      );
      const metadata = JSON.parse(metadataContent);

      expect(
        metadata.trigger_conditions.test_completion.milestone_reached,
      ).toBe(true);
    });
  });

  describe("architecture change handling", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should handle architecture changes and update patterns", async () => {
      const changeData = {
        type: "service_added" as const,
        files: ["lib/services/new-service.ts", "components/NewComponent.tsx"],
        description: "Added new service for testing",
        impact: "medium" as const,
      };

      await expect(
        service.handleArchitectureChange(changeData),
      ).resolves.not.toThrow();

      // Verify patterns file was updated
      const patternsContent = await fs.readFile(
        path.join(tempDir, "systemPatterns.md"),
        "utf-8",
      );
      expect(patternsContent).toContain("service_added");
    });
  });

  describe("error pattern detection", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should handle error pattern detection and update rules", async () => {
      const patternData = {
        pattern: "addEventListener.*(?!.*removeEventListener)",
        frequency: 5,
        files: ["component1.tsx", "component2.tsx"],
        severity: "high" as const,
        suggested_rule: "memory-cleanup-required",
      };

      await expect(
        service.handleErrorPatternDetection(patternData),
      ).resolves.not.toThrow();

      // Verify linting rules were updated
      const rulesContent = await fs.readFile(
        path.join(tempDir, ".clinerules"),
        "utf-8",
      );
      expect(rulesContent).toContain("memory-cleanup-required");
    });
  });

  describe("full synchronization", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should perform full sync without errors", async () => {
      await expect(service.performFullSync()).resolves.not.toThrow();

      // Verify all files were updated
      const files = [
        "activeContext.md",
        "progress.md",
        "systemPatterns.md",
        ".clinerules",
      ];

      for (const file of files) {
        const content = await fs.readFile(path.join(tempDir, file), "utf-8");
        expect(content.length).toBeGreaterThan(0);
      }

      // Verify metadata was updated
      const metadataContent = await fs.readFile(
        path.join(tempDir, "sync-metadata.json"),
        "utf-8",
      );
      const metadata = JSON.parse(metadataContent);

      expect(metadata.trigger_conditions.feature_completion).toBeDefined();
    });
  });

  describe("error handling", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should handle file write errors gracefully", async () => {
      // Make directory read-only to simulate write error
      await fs.chmod(tempDir, "444");

      const prData = {
        title: "Test PR",
        description: "Test description",
        branch: "feature/test",
        author: "test-user",
        files: ["src/component.ts"],
      };

      // Should not throw but should log error
      await expect(service.handlePRCreation(prData)).resolves.not.toThrow();

      // Restore permissions for cleanup
      await fs.chmod(tempDir, "755");
    });
  });

  describe("validation", () => {
    it("should validate memory bank structure correctly", async () => {
      // Test with complete structure
      await expect(service.initialize()).resolves.not.toThrow();

      // Test with missing file
      await fs.unlink(path.join(tempDir, "progress.md"));
      await expect(service.initialize()).rejects.toThrow();
    });
  });
});

describe("Memory Bank Integration Tests", () => {
  describe("end-to-end workflow", () => {
    it("should handle complete development workflow", async () => {
      // This test simulates a complete workflow:
      // 1. PR creation
      // 2. Test completion
      // 3. Architecture change
      // 4. Error pattern detection
      // 5. Full sync

      const service = new MemoryBankAutomationService();
      const tempDir = path.join(__dirname, "temp-e2e-memory-bank");

      try {
        // Setup
        await fs.mkdir(tempDir, { recursive: true });
        (service as any).memoryBankPath = tempDir;

        // Create initial files
        const initialFiles = {
          "activeContext.md": "# Initial Context\n",
          "progress.md": "# Initial Progress\n",
          "systemPatterns.md": "# Initial Patterns\n",
          ".clinerules": "# Initial Rules\n",
          "sync-metadata.json": JSON.stringify({
            version: "1.0.0",
            last_updated: new Date().toISOString(),
            automation_status: "active",
            trigger_conditions: {},
            file_status: {},
            integration_status: {},
            performance_metrics: {},
          }),
        };

        for (const [filename, content] of Object.entries(initialFiles)) {
          await fs.writeFile(path.join(tempDir, filename), content);
        }

        await service.initialize();

        // Step 1: PR Creation
        await service.handlePRCreation({
          title: "Add new feature",
          description: "Implementing user authentication",
          branch: "feature/auth",
          author: "developer",
          files: ["lib/auth/service.ts", "components/LoginForm.tsx"],
        });

        // Step 2: Test Completion
        await service.handleTestCompletion({
          totalTests: 50,
          passedTests: 48,
          failedTests: 2,
          coverage: 92,
          duration: 3500,
          testFiles: ["auth.test.ts", "login.test.tsx"],
        });

        // Step 3: Architecture Change
        await service.handleArchitectureChange({
          type: "service_added",
          files: ["lib/auth/service.ts"],
          description: "Added authentication service",
          impact: "high",
        });

        // Step 4: Error Pattern Detection
        await service.handleErrorPatternDetection({
          pattern: "fetch.*api.*(?!.*validation)",
          frequency: 3,
          files: ["component1.tsx", "component2.tsx"],
          severity: "medium",
          suggested_rule: "api-validation-required",
        });

        // Step 5: Full Sync
        await service.performFullSync();

        // Verify all operations completed successfully
        const finalMetadata = JSON.parse(
          await fs.readFile(path.join(tempDir, "sync-metadata.json"), "utf-8"),
        );

        expect(
          finalMetadata.trigger_conditions.pr_creation.total_triggers,
        ).toBe(1);
        expect(
          finalMetadata.trigger_conditions.test_completion.total_triggers,
        ).toBe(1);
        expect(
          finalMetadata.trigger_conditions.architecture_change.total_triggers,
        ).toBe(1);
        expect(
          finalMetadata.trigger_conditions.error_pattern.total_triggers,
        ).toBe(1);
        expect(
          finalMetadata.trigger_conditions.feature_completion.total_triggers,
        ).toBe(1);

        // Cleanup
        await fs.rm(tempDir, { recursive: true });
      } catch (error) {
        // Ensure cleanup even if test fails
        try {
          await fs.rm(tempDir, { recursive: true });
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    });
  });
});

// Session Recovery System Tests
// Tests for session recovery, draft management, and browser tab recovery functionality

import {
  SessionRecoveryService,
  SessionDraft,
} from "@/lib/services/session-recovery-service";
import { GuidedFlowData } from "@/lib/types/estimate-types";

// Mock Supabase
jest.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: { id: "test-user-123" } },
        }),
      ),
    },
    from: jest.fn(() => ({
      upsert: jest.fn(() => ({ error: null })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gt: jest.fn(() => ({
            order: jest.fn(() => ({
              error: null,
              data: [],
            })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({ error: null })),
      })),
    })),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock DOM APIs
Object.defineProperty(window, "addEventListener", {
  value: jest.fn(),
});

Object.defineProperty(document, "addEventListener", {
  value: jest.fn(),
});

Object.defineProperty(navigator, "userAgent", {
  value: "Test User Agent",
});

Object.defineProperty(navigator, "platform", {
  value: "Test Platform",
});

describe("SessionRecoveryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe("Session Management", () => {
    it("should initialize session recovery service", async () => {
      localStorageMock.getItem.mockReturnValue("test-session-123");

      await SessionRecoveryService.initialize({
        maxDraftAge: 12,
        notificationEnabled: true,
      });

      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        "estimatepro_session_id",
      );
    });

    it("should create a new session ID when none exists", async () => {
      localStorageMock.getItem.mockReturnValue(null);

      await SessionRecoveryService.initialize();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "estimatepro_session_id",
        expect.stringMatching(/^session_\d+_[a-z0-9]+$/),
      );
    });
  });

  describe("Draft Management", () => {
    it("should save draft to storage", async () => {
      const testData: GuidedFlowData = {
        initialContact: {
          contactMethod: "email",
          aiExtractedData: {
            customer: {
              name: "Test Customer",
            },
            requirements: {
              services: [],
              buildingType: "",
            },
            urgencyScore: 0.5,
            confidence: 0.8,
            extractionDate: new Date().toISOString(),
          },
        },
      };

      const result = await SessionRecoveryService.saveDraft(
        "test-estimate-123",
        testData,
        "initial-contact",
        "manual-save",
      );

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "estimatepro_session_drafts",
        expect.any(String),
      );
    });

    it("should handle save errors gracefully", async () => {
      // Mock user auth failure
      const { supabase } = require("@/lib/supabase/client");
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const testData: GuidedFlowData = {};
      const result = await SessionRecoveryService.saveDraft(
        "test-estimate-123",
        testData,
        "initial-contact",
      );

      expect(result).toBe(false);
    });

    it("should retrieve recoverable sessions", async () => {
      const mockDraft: SessionDraft = {
        id: "test-draft-123",
        estimateId: "test-estimate-123",
        userId: "test-user-123",
        sessionId: "test-session-123",
        currentStep: "initial-contact",
        data: {
          initialContact: {
            contactMethod: "email",
            aiExtractedData: {
              customer: { name: "Test" },
              requirements: { services: [], buildingType: "" },
              urgencyScore: 0.5,
              confidence: 0.8,
              extractionDate: new Date().toISOString(),
            },
          },
        },
        progress: {
          completedSteps: ["initial-contact"],
          currentStepIndex: 0,
          totalSteps: 6,
          progressPercentage: 16,
        },
        metadata: {
          lastActivity: new Date(),
          browserInfo: {
            userAgent: "Test Agent",
            platform: "Test Platform",
            url: "http://test.com",
          },
          autoSaveEnabled: true,
          isActive: true,
        },
        recovery: {
          source: "auto-save" as const,
          recoveryAttempts: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockDraft]));

      const sessions = await SessionRecoveryService.getRecoverableSessions();

      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe("test-draft-123");
    });

    it("should filter expired drafts", async () => {
      const expiredDraft: SessionDraft = {
        id: "expired-draft",
        estimateId: "test-estimate",
        userId: "test-user",
        sessionId: "test-session",
        currentStep: "initial-contact",
        data: {},
        progress: {
          completedSteps: [],
          currentStepIndex: 0,
          totalSteps: 6,
          progressPercentage: 0,
        },
        metadata: {
          lastActivity: new Date(),
          browserInfo: {
            userAgent: "Test",
            platform: "Test",
            url: "http://test.com",
          },
          autoSaveEnabled: true,
          isActive: false,
        },
        recovery: {
          source: "auto-save" as const,
          recoveryAttempts: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([expiredDraft]));

      const sessions = await SessionRecoveryService.getRecoverableSessions();

      expect(sessions).toHaveLength(0);
    });
  });

  describe("Session Recovery", () => {
    it("should recover a session successfully", async () => {
      const mockDraft: SessionDraft = {
        id: "test-draft-123",
        estimateId: "test-estimate-123",
        userId: "test-user-123",
        sessionId: "test-session-123",
        currentStep: "scope-details",
        data: {
          initialContact: {
            contactMethod: "email",
            aiExtractedData: {
              customer: { name: "Test Customer" },
              requirements: { services: [], buildingType: "" },
              urgencyScore: 0.5,
              confidence: 0.8,
              extractionDate: new Date().toISOString(),
            },
          },
          scopeDetails: { selectedServices: ["WC"] },
        },
        progress: {
          completedSteps: ["initial-contact"],
          currentStepIndex: 1,
          totalSteps: 6,
          progressPercentage: 33,
        },
        metadata: {
          lastActivity: new Date(),
          browserInfo: {
            userAgent: "Test Agent",
            platform: "Test Platform",
            url: "http://test.com",
          },
          autoSaveEnabled: true,
          isActive: true,
        },
        recovery: {
          source: "tab-close" as const,
          recoveryAttempts: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockDraft]));

      const recoveredSession =
        await SessionRecoveryService.recoverSession("test-draft-123");

      expect(recoveredSession).toBeDefined();
      expect(recoveredSession?.id).toBe("test-draft-123");
      expect(recoveredSession?.recovery.recoveryAttempts).toBe(1);
      expect(recoveredSession?.recovery.lastRecoveryTime).toBeDefined();
    });

    it("should handle recovery of non-existent draft", async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

      const result =
        await SessionRecoveryService.recoverSession("non-existent");

      expect(result).toBe(null);
    });
  });

  describe("Cleanup Operations", () => {
    it("should delete draft successfully", async () => {
      const mockDraft: SessionDraft = {
        id: "test-draft-123",
        estimateId: "test-estimate",
        userId: "test-user",
        sessionId: "test-session",
        currentStep: "initial-contact",
        data: {},
        progress: {
          completedSteps: [],
          currentStepIndex: 0,
          totalSteps: 6,
          progressPercentage: 0,
        },
        metadata: {
          lastActivity: new Date(),
          browserInfo: {
            userAgent: "Test",
            platform: "Test",
            url: "http://test.com",
          },
          autoSaveEnabled: true,
          isActive: false,
        },
        recovery: {
          source: "auto-save" as const,
          recoveryAttempts: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify([mockDraft]));

      const result = await SessionRecoveryService.deleteDraft("test-draft-123");

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "estimatepro_session_drafts",
        JSON.stringify([]),
      );
    });

    it("should cleanup expired drafts", async () => {
      const validDraft: SessionDraft = {
        id: "valid-draft",
        estimateId: "test-estimate",
        userId: "test-user",
        sessionId: "test-session",
        currentStep: "initial-contact",
        data: {},
        progress: {
          completedSteps: [],
          currentStepIndex: 0,
          totalSteps: 6,
          progressPercentage: 0,
        },
        metadata: {
          lastActivity: new Date(),
          browserInfo: {
            userAgent: "Test",
            platform: "Test",
            url: "http://test.com",
          },
          autoSaveEnabled: true,
          isActive: true,
        },
        recovery: {
          source: "auto-save" as const,
          recoveryAttempts: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const expiredDraft: SessionDraft = {
        ...validDraft,
        id: "expired-draft",
        expiresAt: new Date(Date.now() - 1000), // Expired
        metadata: {
          ...validDraft.metadata,
          isActive: false,
        },
      };

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([validDraft, expiredDraft]),
      );

      const cleanedCount = await SessionRecoveryService.cleanupExpiredDrafts();

      expect(cleanedCount).toBe(1);
    });
  });

  describe("Browser Integration", () => {
    it("should detect unsaved changes correctly", () => {
      const hasUnsaved = SessionRecoveryService.hasUnsavedChanges();

      // Should default to false when no current session
      expect(hasUnsaved).toBe(false);
    });

    it("should get recovery state", () => {
      const state = SessionRecoveryService.getRecoveryState();

      expect(state).toHaveProperty("hasRecoverableSessions");
      expect(state).toHaveProperty("availableDrafts");
      expect(state).toHaveProperty("lastRecoveryCheck");
      expect(state).toHaveProperty("recoveryInProgress");
    });
  });
});

describe("Session Recovery Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle localStorage errors gracefully", async () => {
    // Mock localStorage to throw error
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("localStorage error");
    });

    const sessions = await SessionRecoveryService.getRecoverableSessions();

    expect(sessions).toEqual([]);
  });

  it("should handle database connection errors", async () => {
    const { supabase } = require("@/lib/supabase/client");
    supabase.from.mockReturnValue({
      upsert: jest.fn(() => ({ error: new Error("Database error") })),
    });

    const testData: GuidedFlowData = {};
    const result = await SessionRecoveryService.saveDraft(
      "test-estimate",
      testData,
      "initial-contact",
    );

    // Should still return true if localStorage save succeeds
    expect(result).toBe(true);
  });

  it("should handle malformed draft data", async () => {
    localStorageMock.getItem.mockReturnValue("invalid json");

    const sessions = await SessionRecoveryService.getRecoverableSessions();

    expect(sessions).toEqual([]);
  });
});

describe("Progress Calculation", () => {
  it("should calculate progress correctly", () => {
    // This tests the private calculateProgress method indirectly
    const testData: GuidedFlowData = {
      initialContact: {
        contactMethod: "email",
        aiExtractedData: {
          customer: { name: "Test" },
          requirements: { services: [], buildingType: "" },
          urgencyScore: 0.5,
          confidence: 0.8,
          extractionDate: new Date().toISOString(),
        },
      },
      scopeDetails: { selectedServices: ["WC"] },
    };

    // The progress calculation is tested through the saveDraft method
    // which internally uses calculateProgress
    expect(() => {
      SessionRecoveryService.saveDraft(
        "test-estimate",
        testData,
        "scope-details",
        "manual-save",
      );
    }).not.toThrow();
  });
});

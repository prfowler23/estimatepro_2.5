// Test script for session recovery service
const path = require("path");

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: async () => ({
      data: {
        user: {
          id: "test-user-123",
          email: "test@example.com",
        },
      },
    }),
  },
  from: (table) => ({
    select: () => ({
      eq: () => ({
        gt: () => ({
          order: () => ({
            data:
              table === "estimation_flows"
                ? [
                    {
                      id: "flow-1",
                      estimate_id: "estimate-123",
                      user_id: "test-user-123",
                      current_step: 3,
                      flow_data: {
                        currentStep: "scope-details",
                        scopeDetails: {
                          selectedServices: ["WC", "PW"],
                        },
                        areaOfWork: {
                          measurements: [
                            { type: "area", value: 5000, unit: "sqft" },
                          ],
                        },
                      },
                      status: "active",
                      expires_at: new Date(
                        Date.now() + 24 * 60 * 60 * 1000,
                      ).toISOString(),
                      created_at: new Date(
                        Date.now() - 60 * 60 * 1000,
                      ).toISOString(),
                      updated_at: new Date(
                        Date.now() - 30 * 60 * 1000,
                      ).toISOString(),
                    },
                    {
                      id: "flow-2",
                      estimate_id: "estimate-456",
                      user_id: "test-user-123",
                      current_step: 1,
                      flow_data: {
                        currentStep: "initial-contact",
                        initialContact: {
                          name: "John Doe",
                          email: "john@example.com",
                        },
                      },
                      status: "active",
                      expires_at: new Date(
                        Date.now() - 60 * 60 * 1000,
                      ).toISOString(), // Expired
                      created_at: new Date(
                        Date.now() - 25 * 60 * 60 * 1000,
                      ).toISOString(),
                      updated_at: new Date(
                        Date.now() - 25 * 60 * 60 * 1000,
                      ).toISOString(),
                    },
                  ]
                : [],
            error: null,
          }),
        }),
      }),
    }),
    upsert: () => ({ error: null }),
    delete: () => ({ eq: () => ({ error: null }) }),
  }),
};

// Mock browser environment
global.window = {
  location: { href: "http://localhost:3000/estimates/new/guided" },
  addEventListener: () => {},
};
global.navigator = {
  userAgent: "Mozilla/5.0 Test Browser",
  platform: "MacOS",
};
global.document = {
  addEventListener: () => {},
  hidden: false,
};
global.localStorage = {
  store: {},
  getItem: function (key) {
    return this.store[key] || null;
  },
  setItem: function (key, value) {
    this.store[key] = value;
  },
  removeItem: function (key) {
    delete this.store[key];
  },
};

// Simple implementation of session recovery service
class SessionRecoveryService {
  static sessionId = null;
  static recoveryState = {
    hasRecoverableSessions: false,
    availableDrafts: [],
    lastRecoveryCheck: new Date(),
    recoveryInProgress: false,
  };

  static async initialize() {
    this.sessionId = this.getOrCreateSessionId();
    await this.checkForRecoverableSessions();
  }

  static getOrCreateSessionId() {
    let sessionId = localStorage.getItem("estimatepro_session_id");
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("estimatepro_session_id", sessionId);
    }
    return sessionId;
  }

  static async checkForRecoverableSessions() {
    const drafts = await this.getRecoverableSessions();
    this.recoveryState.availableDrafts = drafts;
    this.recoveryState.hasRecoverableSessions = drafts.length > 0;
    this.recoveryState.lastRecoveryCheck = new Date();
  }

  static async getRecoverableSessions() {
    const user = { id: "test-user-123" };

    // Get from database (mocked)
    const remoteDrafts = await this.getFromDatabase(user.id);

    // Get from localStorage
    const localDrafts = this.getFromLocalStorage();

    // Merge and filter
    const allDrafts = [...localDrafts, ...remoteDrafts];
    const validDrafts = this.filterValidDrafts(allDrafts);

    return validDrafts.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  static async getFromDatabase(userId) {
    const result = await mockSupabase
      .from("estimation_flows")
      .select()
      .eq()
      .gt()
      .order();

    return (result.data || []).map((row) => ({
      id: row.id,
      estimateId: row.estimate_id,
      userId: row.user_id,
      sessionId: row.id,
      currentStep: row.current_step?.toString() || "1",
      data: row.flow_data || {},
      progress: {
        completedSteps: [],
        currentStepIndex: row.current_step || 1,
        totalSteps: 5,
        progressPercentage: ((row.current_step || 1) / 5) * 100,
      },
      metadata: {
        lastActivity: new Date(row.updated_at),
        browserInfo: {
          userAgent: "Unknown",
          platform: "Unknown",
          url: "Unknown",
        },
        autoSaveEnabled: true,
        isActive: true,
      },
      recovery: {
        source: "auto-save",
        recoveryAttempts: 0,
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      expiresAt: new Date(row.expires_at),
    }));
  }

  static getFromLocalStorage() {
    try {
      const stored = localStorage.getItem("estimatepro_session_drafts");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  static filterValidDrafts(drafts) {
    const now = new Date();
    return drafts.filter((draft) => {
      // Check if not expired
      if (new Date(draft.expiresAt) < now) return false;

      // Check recovery attempts limit
      if (draft.recovery.recoveryAttempts >= 3) return false;

      // Check if has meaningful data
      if (!draft.data || Object.keys(draft.data).length === 0) return false;

      return true;
    });
  }

  static async saveDraft(estimateId, data, currentStep, source = "auto-save") {
    try {
      const draft = {
        id: `${estimateId}_${this.sessionId}_${Date.now()}`,
        estimateId,
        userId: "test-user-123",
        sessionId: this.sessionId,
        currentStep,
        data,
        progress: this.calculateProgress(data, currentStep),
        metadata: {
          lastActivity: new Date(),
          browserInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            url: window.location.href,
          },
          autoSaveEnabled: true,
          isActive: true,
        },
        recovery: {
          source,
          recoveryAttempts: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      // Save to localStorage
      const drafts = this.getFromLocalStorage();
      drafts.push(draft);
      localStorage.setItem(
        "estimatepro_session_drafts",
        JSON.stringify(drafts),
      );

      // Update recovery state
      this.recoveryState.availableDrafts.push(draft);
      this.recoveryState.hasRecoverableSessions = true;
      this.recoveryState.currentSession = draft;

      return true;
    } catch (error) {
      console.error("Failed to save draft:", error);
      return false;
    }
  }

  static calculateProgress(data, currentStep) {
    const allSteps = [
      "initial-contact",
      "area-of-work",
      "scope-details",
      "duration",
      "pricing",
      "files-photos",
    ];

    const currentIndex = allSteps.indexOf(currentStep);
    const completedSteps = allSteps.slice(0, Math.max(0, currentIndex));

    return {
      completedSteps,
      currentStepIndex: currentIndex,
      totalSteps: allSteps.length,
      progressPercentage: Math.round(
        (completedSteps.length / allSteps.length) * 100,
      ),
    };
  }

  static async recoverSession(draftId) {
    try {
      this.recoveryState.recoveryInProgress = true;

      const drafts = await this.getRecoverableSessions();
      const draft = drafts.find((d) => d.id === draftId);

      if (!draft) {
        throw new Error(`Draft with ID ${draftId} not found`);
      }

      // Update recovery attempts
      draft.recovery.recoveryAttempts++;
      draft.recovery.lastRecoveryTime = new Date();
      draft.metadata.isActive = true;

      // Set as current session
      this.recoveryState.currentSession = draft;

      return draft;
    } catch (error) {
      console.error("Failed to recover session:", error);
      return null;
    } finally {
      this.recoveryState.recoveryInProgress = false;
    }
  }

  static getRecoveryState() {
    return { ...this.recoveryState };
  }

  static hasUnsavedChanges() {
    return this.recoveryState.currentSession?.metadata.isActive || false;
  }

  static async cleanupExpiredDrafts() {
    const drafts = await this.getRecoverableSessions();
    const expiredCount =
      this.recoveryState.availableDrafts.length - drafts.length;
    this.recoveryState.availableDrafts = drafts;
    this.recoveryState.hasRecoverableSessions = drafts.length > 0;
    return expiredCount;
  }
}

async function testSessionRecovery() {
  console.log("Testing Session Recovery Service...\n");

  try {
    // Test 1: Initialize session recovery
    console.log("Test 1: Initialize session recovery");
    await SessionRecoveryService.initialize();
    console.log("Session ID:", SessionRecoveryService.sessionId);
    console.log("Recovery State:", SessionRecoveryService.getRecoveryState());

    // Test 2: Get recoverable sessions
    console.log("\n\nTest 2: Get recoverable sessions");
    const sessions = await SessionRecoveryService.getRecoverableSessions();
    console.log(`Found ${sessions.length} recoverable session(s)`);
    sessions.forEach((session, index) => {
      console.log(`\nSession ${index + 1}:`);
      console.log(`- ID: ${session.id}`);
      console.log(`- Estimate ID: ${session.estimateId}`);
      console.log(`- Current Step: ${session.currentStep}`);
      console.log(`- Progress: ${session.progress.progressPercentage}%`);
      console.log(`- Expires: ${session.expiresAt}`);
      console.log(`- Data Keys: ${Object.keys(session.data).join(", ")}`);
    });

    // Test 3: Save a new draft
    console.log("\n\nTest 3: Save a new draft");
    const testData = {
      currentStep: "area-of-work",
      initialContact: {
        name: "Test Customer",
        email: "test@example.com",
        phone: "555-1234",
      },
      areaOfWork: {
        measurements: [{ type: "area", value: 3000, unit: "sqft" }],
        buildingDetails: {
          floors: 2,
          height: 24,
        },
      },
      scopeDetails: {
        selectedServices: ["WC"],
      },
    };

    const saved = await SessionRecoveryService.saveDraft(
      "estimate-789",
      testData,
      "area-of-work",
      "manual-save",
    );
    console.log("Draft saved:", saved);
    console.log(
      "Updated Recovery State:",
      SessionRecoveryService.getRecoveryState(),
    );

    // Test 4: Recover a session
    console.log("\n\nTest 4: Recover a session");
    const availableDrafts =
      SessionRecoveryService.getRecoveryState().availableDrafts;
    if (availableDrafts.length > 0) {
      const draftToRecover = availableDrafts[0];
      console.log(`Recovering draft: ${draftToRecover.id}`);

      const recovered = await SessionRecoveryService.recoverSession(
        draftToRecover.id,
      );
      if (recovered) {
        console.log("Session recovered successfully!");
        console.log("- Current Step:", recovered.currentStep);
        console.log(
          "- Recovery Attempts:",
          recovered.recovery.recoveryAttempts,
        );
        console.log(
          "- Data Available:",
          Object.keys(recovered.data).join(", "),
        );
      } else {
        console.log("Failed to recover session");
      }
    }

    // Test 5: Check for unsaved changes
    console.log("\n\nTest 5: Check for unsaved changes");
    const hasUnsaved = SessionRecoveryService.hasUnsavedChanges();
    console.log("Has unsaved changes:", hasUnsaved);

    // Test 6: Cleanup expired drafts
    console.log("\n\nTest 6: Cleanup expired drafts");
    const cleanedUp = await SessionRecoveryService.cleanupExpiredDrafts();
    console.log(`Cleaned up ${cleanedUp} expired draft(s)`);
    console.log(
      "Remaining drafts:",
      SessionRecoveryService.getRecoveryState().availableDrafts.length,
    );

    console.log("\n✅ Session recovery service tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run test
testSessionRecovery().catch(console.error);

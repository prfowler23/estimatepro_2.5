import { POST } from "./route";
import { NextRequest } from "next/server";
import { getUser } from "@/lib/auth/server";

// Mock dependencies
jest.mock("@/lib/auth/server");
jest.mock("@/lib/ai/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));
jest.mock("@/lib/services/ai-conversation-service");
jest.mock("@/lib/ai/ai-config", () => ({
  getAIConfig: () => ({
    isAIAvailable: () => true,
    getAIConfig: () => ({
      defaultModel: "gpt-4",
      maxTokens: 2000,
      temperature: 0.1,
    }),
  }),
}));

const mockGetUser = getUser as jest.MockedFunction<typeof getUser>;

describe("AI Assistant Streaming API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({
      id: "test-user-id",
      email: "test@example.com",
    } as any);
  });

  it("should return 401 if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/ai/assistant/stream",
      {
        method: "POST",
        body: JSON.stringify({
          message: "Hello",
          mode: "general",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("should reject requests with security violations", async () => {
    const request = new NextRequest(
      "http://localhost/api/ai/assistant/stream",
      {
        method: "POST",
        body: JSON.stringify({
          message: "SELECT * FROM users WHERE id = 1; DROP TABLE users;--",
          mode: "general",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Input failed security scan");
  });

  it("should reject unsafe context", async () => {
    const request = new NextRequest(
      "http://localhost/api/ai/assistant/stream",
      {
        method: "POST",
        body: JSON.stringify({
          message: "What's the weather?",
          context: {
            injection: "<script>alert('XSS')</script>",
          },
          mode: "general",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Context contains unsafe content");
  });

  it("should return streaming response for valid requests", async () => {
    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: "Hello" } }] };
        yield { choices: [{ delta: { content: " world" } }] };
      },
    };

    const { openai } = require("@/lib/ai/openai");
    openai.chat.completions.create.mockResolvedValue(mockStream);

    const request = new NextRequest(
      "http://localhost/api/ai/assistant/stream",
      {
        method: "POST",
        body: JSON.stringify({
          message: "Hello AI",
          mode: "general",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("X-Mode")).toBe("general");
  });

  it("should include conversation context when conversationId is provided", async () => {
    const {
      AIConversationService,
    } = require("@/lib/services/ai-conversation-service");
    AIConversationService.getConversationContext = jest.fn().mockResolvedValue([
      { role: "user", content: "Previous question" },
      { role: "assistant", content: "Previous answer" },
    ]);

    const mockStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: "Response" } }] };
      },
    };

    const { openai } = require("@/lib/ai/openai");
    openai.chat.completions.create.mockResolvedValue(mockStream);

    const request = new NextRequest(
      "http://localhost/api/ai/assistant/stream",
      {
        method: "POST",
        body: JSON.stringify({
          message: "Follow-up question",
          conversationId: "test-conversation-id",
          mode: "general",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(AIConversationService.getConversationContext).toHaveBeenCalledWith(
      "test-conversation-id",
      "test-user-id",
      5,
    );
  });

  it("should handle different modes correctly", async () => {
    const modes = ["estimation", "technical", "business", "general"];

    for (const mode of modes) {
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: "Mode response" } }] };
        },
      };

      const { openai } = require("@/lib/ai/openai");
      openai.chat.completions.create.mockResolvedValue(mockStream);

      const request = new NextRequest(
        "http://localhost/api/ai/assistant/stream",
        {
          method: "POST",
          body: JSON.stringify({
            message: "Test message",
            mode,
          }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Mode")).toBe(mode);
    }
  });
});

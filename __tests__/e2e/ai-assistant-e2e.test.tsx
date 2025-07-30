import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AIAssistantWithTools } from "@/components/ai/AIAssistantWithTools";
import { AIAssistantEnhanced } from "@/components/ai/ai-assistant-enhanced";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

// Setup mock server
const server = setupServer();

// Mock server handlers for E2E tests
const handlers = [
  http.post("/api/ai/assistant/stream", () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Simulate streaming response
        controller.enqueue(encoder.encode("0:Hello! "));
        controller.enqueue(encoder.encode("0:I can help you with "));
        controller.enqueue(
          encoder.encode("0:building service calculations.\n"),
        );
        controller.enqueue(encoder.encode('1:{"done":true}'));
        controller.close();
      },
    });

    return new HttpResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
      },
    });
  }),

  http.post("/api/ai/conversations", () => {
    return HttpResponse.json({
      id: "test-conversation-id",
      userId: "test-user",
      title: "Test Conversation",
      messages: [],
      createdAt: new Date().toISOString(),
    });
  }),
];

describe("AI Assistant E2E Tests", () => {
  beforeAll(() => server.listen());
  afterAll(() => server.close());
  beforeEach(() => {
    server.resetHandlers();
    server.use(...handlers);
  });

  describe("Basic Chat Functionality", () => {
    it("should send a message and receive a response", async () => {
      render(<AIAssistantEnhanced />);

      const input = screen.getByPlaceholderText(/ask me anything/i);
      const sendButton = screen.getByRole("button", { name: /send/i });

      // Type a message
      await userEvent.type(input, "Hello AI assistant");

      // Send the message
      await userEvent.click(sendButton);

      // Check that the user message appears
      await waitFor(() => {
        expect(screen.getByText("Hello AI assistant")).toBeInTheDocument();
      });

      // Check that AI response appears
      await waitFor(() => {
        expect(screen.getByText(/Hello! I can help you/)).toBeInTheDocument();
      });
    });

    it("should handle keyboard shortcuts", async () => {
      render(<AIAssistantEnhanced />);

      const input = screen.getByPlaceholderText(/ask me anything/i);

      // Type and press Enter
      await userEvent.type(input, "Test message{enter}");

      await waitFor(() => {
        expect(screen.getByText("Test message")).toBeInTheDocument();
      });
    });

    it("should show typing indicator while AI is responding", async () => {
      render(<AIAssistantEnhanced />);

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await userEvent.type(input, "Test{enter}");

      // Typing indicator should appear
      await waitFor(() => {
        expect(screen.getByTestId("typing-indicator")).toBeInTheDocument();
      });

      // Typing indicator should disappear after response
      await waitFor(
        () => {
          expect(
            screen.queryByTestId("typing-indicator"),
          ).not.toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Tool Integration", () => {
    beforeEach(() => {
      server.use(
        http.post("/api/ai/assistant/stream", () => {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              // Simulate tool call response
              controller.enqueue(
                encoder.encode(
                  '0:{"tool_calls":[{"id":"1","function":{"name":"calculateService","arguments":"{\\"serviceType\\":\\"window-cleaning\\",\\"parameters\\":{\\"glassArea\\":5000,\\"stories\\":10}}"}}]}\n',
                ),
              );
              controller.enqueue(
                encoder.encode(
                  "0:Based on the calculation, window cleaning for a 10-story building with 5000 sq ft of glass would cost $2,500.\n",
                ),
              );
              controller.enqueue(encoder.encode('1:{"done":true}'));
              controller.close();
            },
          });

          return new HttpResponse(stream, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
            },
          });
        }),
      );
    });

    it("should execute calculator tool", async () => {
      render(<AIAssistantWithTools />);

      const input = screen.getByPlaceholderText(/ask me anything/i);

      await userEvent.type(
        input,
        "Calculate window cleaning for 10-story building with 5000 sq ft glass{enter}",
      );

      // Check for tool execution
      await waitFor(() => {
        expect(screen.getByText(/would cost \$2,500/)).toBeInTheDocument();
      });

      // Check tool activity tab
      const toolsTab = screen.getByRole("tab", { name: /tools activity/i });
      await userEvent.click(toolsTab);

      await waitFor(() => {
        expect(screen.getByText("calculateService")).toBeInTheDocument();
      });
    });

    it("should handle photo analysis tool", async () => {
      server.use(
        http.post("/api/ai/assistant/stream", () => {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  '0:{"tool_calls":[{"id":"2","function":{"name":"analyzePhoto","arguments":"{\\"imageUrl\\":\\"https://example.com/building.jpg\\",\\"analysisType\\":\\"facade\\"}"}}]}\n',
                ),
              );
              controller.enqueue(
                encoder.encode(
                  "0:I analyzed the building facade. It appears to be a 15-story glass building with approximately 8,000 sq ft of window area.\n",
                ),
              );
              controller.enqueue(encoder.encode('1:{"done":true}'));
              controller.close();
            },
          });

          return new HttpResponse(stream, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
            },
          });
        }),
      );

      render(<AIAssistantWithTools />);

      const input = screen.getByPlaceholderText(/ask me anything/i);

      await userEvent.type(
        input,
        "Analyze this building photo: https://example.com/building.jpg{enter}",
      );

      await waitFor(() => {
        expect(screen.getByText(/15-story glass building/)).toBeInTheDocument();
        expect(screen.getByText(/8,000 sq ft/)).toBeInTheDocument();
      });
    });
  });

  describe("Conversation Management", () => {
    it("should save conversation history", async () => {
      server.use(
        http.put("/api/ai/conversations/:id", () => {
          return HttpResponse.json({ success: true });
        }),
      );

      render(<AIAssistantEnhanced />);

      const input = screen.getByPlaceholderText(/ask me anything/i);

      // Send multiple messages
      await userEvent.type(input, "First message{enter}");

      await waitFor(() => {
        expect(screen.getByText("First message")).toBeInTheDocument();
      });

      await userEvent.type(input, "Second message{enter}");

      await waitFor(() => {
        expect(screen.getByText("Second message")).toBeInTheDocument();
      });

      // Both messages should be in the conversation
      expect(screen.getByText("First message")).toBeInTheDocument();
      expect(screen.getByText("Second message")).toBeInTheDocument();
    });

    it("should handle conversation mode switching", async () => {
      render(<AIAssistantEnhanced />);

      // Check for mode selector
      const modeSelector = screen.getByRole("combobox", { name: /mode/i });

      // Switch to estimation mode
      await userEvent.selectOptions(modeSelector, "estimation");

      const input = screen.getByPlaceholderText(/ask.*estimation/i);
      expect(input).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      server.use(
        http.post("/api/ai/assistant/stream", () => {
          return HttpResponse.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }),
      );

      render(<AIAssistantEnhanced />);

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await userEvent.type(input, "Test message{enter}");

      await waitFor(() => {
        expect(screen.getByText(/error.*try again/i)).toBeInTheDocument();
      });
    });

    it("should handle rate limiting", async () => {
      server.use(
        http.post("/api/ai/assistant/stream", () => {
          return HttpResponse.json(
            { error: "Rate limit exceeded" },
            { status: 429 },
          );
        }),
      );

      render(<AIAssistantEnhanced />);

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await userEvent.type(input, "Test{enter}");

      await waitFor(() => {
        expect(screen.getByText(/rate limit/i)).toBeInTheDocument();
      });
    });
  });

  describe("Performance", () => {
    it("should handle rapid message sending", async () => {
      render(<AIAssistantEnhanced />);

      const input = screen.getByPlaceholderText(/ask me anything/i);

      // Send multiple messages quickly
      for (let i = 0; i < 5; i++) {
        await userEvent.type(input, `Message ${i}{enter}`);
      }

      // All messages should appear
      await waitFor(() => {
        expect(screen.getByText("Message 4")).toBeInTheDocument();
      });
    });

    it("should cancel streaming when stop button is clicked", async () => {
      server.use(
        http.post("/api/ai/assistant/stream", () => {
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              // Slow streaming to allow stop
              setTimeout(() => {
                controller.enqueue(encoder.encode("0:This is a very "));
              }, 100);
              setTimeout(() => {
                controller.enqueue(encoder.encode("0:long response that "));
              }, 200);
              setTimeout(() => {
                controller.enqueue(encoder.encode("0:should be stopped.\n"));
                controller.enqueue(encoder.encode('1:{"done":true}'));
                controller.close();
              }, 300);
            },
          });

          return new HttpResponse(stream, {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream",
            },
          });
        }),
      );

      render(<AIAssistantEnhanced />);

      const input = screen.getByPlaceholderText(/ask me anything/i);
      await userEvent.type(input, "Long response test{enter}");

      // Wait for streaming to start
      await waitFor(() => {
        expect(screen.getByText(/This is a very/)).toBeInTheDocument();
      });

      // Click stop button
      const stopButton = screen.getByRole("button", { name: /stop/i });
      await userEvent.click(stopButton);

      // Response should stop
      await waitFor(() => {
        expect(screen.queryByText(/should be stopped/)).not.toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard navigable", async () => {
      render(<AIAssistantEnhanced />);

      // Tab to input
      await userEvent.tab();
      const input = screen.getByPlaceholderText(/ask me anything/i);
      expect(input).toHaveFocus();

      // Type and send with keyboard
      await userEvent.type(input, "Keyboard test");
      await userEvent.keyboard("{enter}");

      await waitFor(() => {
        expect(screen.getByText("Keyboard test")).toBeInTheDocument();
      });
    });

    it("should have proper ARIA labels", () => {
      render(<AIAssistantEnhanced />);

      expect(
        screen.getByRole("textbox", { name: /message input/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /send message/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: /chat messages/i }),
      ).toBeInTheDocument();
    });
  });
});

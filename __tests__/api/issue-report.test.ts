import { POST } from "@/app/api/support/issue-report/route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/utils/server-cache", () => ({
  rateLimiters: { issueReport: { isAllowed: jest.fn(() => true) } },
  invalidateServerCache: { issueReport: jest.fn() },
  issueReportCache: {},
  getServerCacheKey: {},
  serverCached: () => (fn: any) => fn,
}));

describe("/api/support/issue-report", () => {
  const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPPORT_TEAM_EMAIL = "support@example.com";
    process.env.SUPPORT_SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "no-reply@example.com";

    mockedCreateClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user123" } },
          error: null,
        }),
      },
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: "issue123" },
          error: null,
        }),
      }),
    } as any);

    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
  });

  afterEach(() => {
    delete process.env.SUPPORT_TEAM_EMAIL;
    delete process.env.SUPPORT_SLACK_WEBHOOK_URL;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    global.fetch = originalFetch;
  });

  it("sends notifications when an issue is reported", async () => {
    const payload = {
      type: "bug",
      title: "Example Bug",
      description: "Something broke",
      priority: "high",
    };

    const request = new NextRequest(
      "http://localhost/api/support/issue-report",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/test",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

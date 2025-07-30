import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth/server";
import { AIConversationService } from "@/lib/services/ai-conversation-service";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || undefined;
    const orderBy = (searchParams.get("orderBy") as any) || "last_message_at";
    const order = (searchParams.get("order") as any) || "desc";

    const response = await AIConversationService.listConversations(user.id, {
      page,
      limit,
      search,
      orderBy,
      order,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const conversation = await AIConversationService.createConversation(
      user.id,
      body,
    );

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}

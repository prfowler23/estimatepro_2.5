import { createClient } from "@/lib/supabase/universal-client";
import {
  AIConversation,
  AIMessage,
  AIConversationWithMessages,
  AIConversationSummary,
  CreateConversationInput,
  CreateMessageInput,
  UpdateConversationInput,
  ConversationListParams,
  ConversationListResponse,
  createConversationSchema,
  createMessageSchema,
  updateConversationSchema,
} from "@/lib/types/ai-conversation-types";
import { ValidationError } from "@/lib/ai/ai-error-handler";
import {
  AIErrorFactory,
  extractErrorContext,
} from "@/lib/ai/ai-specific-errors";
import { withTransaction } from "@/lib/utils/database-transactions";
import { handleNullSafely } from "@/lib/utils/null-safety";

export class AIConversationService {
  /**
   * Create a new conversation
   */
  static async createConversation(
    userId: string,
    input?: CreateConversationInput,
  ): Promise<AIConversation> {
    const validated = input ? createConversationSchema.parse(input) : {};
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: userId,
        title: validated.title || null,
        metadata: validated.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", extractErrorContext(error));
      throw AIErrorFactory.conversation(
        "Failed to create conversation",
        "create",
        undefined,
        { userId, input: validated, error: error.message },
      );
    }

    return data;
  }

  /**
   * Get a conversation by ID
   */
  static async getConversation(
    conversationId: string,
    userId: string,
  ): Promise<AIConversation | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_conversations")
      .select()
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      console.error("Error fetching conversation:", extractErrorContext(error));
      throw AIErrorFactory.conversation(
        "Failed to fetch conversation",
        "get",
        conversationId,
        { userId, conversationId, error: error.message },
      );
    }

    return data;
  }

  /**
   * Get a conversation with all messages
   */
  static async getConversationWithMessages(
    conversationId: string,
    userId: string,
  ): Promise<AIConversationWithMessages | null> {
    const supabase = createClient();

    // First get the conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      return null;
    }

    // Then get all messages
    const { data: messages, error } = await supabase
      .from("ai_messages")
      .select()
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      throw new Error("Failed to fetch messages");
    }

    return {
      ...conversation,
      messages: messages || [],
    };
  }

  /**
   * List conversations for a user with pagination
   */
  static async listConversations(
    userId: string,
    params: ConversationListParams = {},
  ): Promise<ConversationListResponse> {
    const {
      page = 1,
      limit = 20,
      search,
      orderBy = "last_message_at",
      order = "desc",
    } = params;

    const supabase = createClient();
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("ai_conversations")
      .select("*, ai_messages(content)", { count: "exact" })
      .eq("user_id", userId);

    // Add search if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%`);
    }

    // Add ordering and pagination
    query = query
      .order(orderBy, { ascending: order === "asc" })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("Error listing conversations:", error);
      throw new Error("Failed to list conversations");
    }

    // Transform data to include summary info
    const conversations: AIConversationSummary[] = (data || []).map((conv) => {
      const messages = conv.ai_messages as any[];
      const lastMessage = messages?.[messages.length - 1];

      return {
        id: conv.id,
        user_id: conv.user_id,
        title: conv.title,
        last_message_at: conv.last_message_at,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        metadata: conv.metadata,
        message_count: messages?.length || 0,
        last_message_preview: lastMessage?.content
          ? lastMessage.content.substring(0, 100) +
            (lastMessage.content.length > 100 ? "..." : "")
          : null,
      };
    });

    return {
      conversations,
      total: count || 0,
      page,
      limit,
      hasMore: offset + conversations.length < (count || 0),
    };
  }

  /**
   * Update a conversation
   */
  static async updateConversation(
    conversationId: string,
    userId: string,
    input: UpdateConversationInput,
  ): Promise<AIConversation> {
    const validated = updateConversationSchema.parse(input);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_conversations")
      .update({
        title: validated.title,
        metadata: validated.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating conversation:", error);
      throw new Error("Failed to update conversation");
    }

    return data;
  }

  /**
   * Delete a conversation (cascades to messages)
   */
  static async deleteConversation(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting conversation:", error);
      throw new Error("Failed to delete conversation");
    }
  }

  /**
   * Add a message to a conversation
   */
  static async addMessage(
    input: CreateMessageInput,
    userId: string,
  ): Promise<AIMessage> {
    const validated = createMessageSchema.parse(input);

    // Verify user owns the conversation
    const conversation = await this.getConversation(
      validated.conversation_id,
      userId,
    );
    if (!conversation) {
      throw new ValidationError("Conversation not found", []);
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: validated.conversation_id,
        role: validated.role,
        content: validated.content,
        tokens_used: validated.tokens_used || null,
        model: validated.model || null,
        metadata: validated.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding message:", error);
      throw new Error("Failed to add message");
    }

    return data;
  }

  /**
   * Create or get existing conversation for continuous chat
   */
  static async getOrCreateConversation(
    userId: string,
    conversationId?: string,
  ): Promise<AIConversation> {
    if (conversationId) {
      const existing = await this.getConversation(conversationId, userId);
      if (existing) {
        return existing;
      }
    }

    // Create new conversation
    return this.createConversation(userId);
  }

  /**
   * Save a complete AI interaction (user message + assistant response)
   */
  static async saveInteraction(
    userId: string,
    userMessage: string,
    assistantResponse: string,
    conversationId?: string,
    metadata?: {
      mode?: string;
      tokensUsed?: number;
      model?: string;
    },
  ): Promise<{
    conversation: AIConversation;
    userMessage: AIMessage;
    assistantMessage: AIMessage;
  }> {
    return withTransaction(async () => {
      const supabase = createClient();
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(
        userId,
        conversationId,
      );

      // Add user message
      const userMsg = await this.addMessage(
        {
          conversation_id: conversation.id,
          role: "user",
          content: userMessage,
          metadata: { mode: metadata?.mode },
        },
        userId,
      );

      // Add assistant response
      const assistantMsg = await this.addMessage(
        {
          conversation_id: conversation.id,
          role: "assistant",
          content: assistantResponse,
          tokens_used: metadata?.tokensUsed,
          model: metadata?.model,
          metadata: { mode: metadata?.mode },
        },
        userId,
      );

      return {
        conversation,
        userMessage: userMsg,
        assistantMessage: assistantMsg,
      };
    });
  }

  /**
   * Get conversation context for AI (recent messages)
   */
  static async getConversationContext(
    conversationId: string,
    userId: string,
    limit: number = 10,
  ): Promise<AIMessage[]> {
    const supabase = createClient();

    // Verify user owns the conversation
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) {
      return [];
    }

    const { data, error } = await supabase
      .from("ai_messages")
      .select()
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching context:", error);
      return [];
    }

    // Return in chronological order
    return (data || []).reverse();
  }

  /**
   * Search conversations by content
   */
  static async searchConversations(
    userId: string,
    searchTerm: string,
    limit: number = 10,
  ): Promise<AIConversationSummary[]> {
    const supabase = createClient();

    // Search in both conversation titles and message content
    const { data, error } = await supabase
      .from("ai_conversations")
      .select(
        `
        *,
        ai_messages!inner(content)
      `,
      )
      .eq("user_id", userId)
      .or(
        `title.ilike.%${searchTerm}%,ai_messages.content.ilike.%${searchTerm}%`,
      )
      .order("last_message_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error searching conversations:", error);
      throw new Error("Failed to search conversations");
    }

    // Remove duplicates and transform
    const uniqueConversations = new Map<string, any>();
    (data || []).forEach((conv) => {
      if (!uniqueConversations.has(conv.id)) {
        uniqueConversations.set(conv.id, conv);
      }
    });

    return Array.from(uniqueConversations.values()).map((conv) => ({
      id: conv.id,
      user_id: conv.user_id,
      title: conv.title,
      last_message_at: conv.last_message_at,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      metadata: conv.metadata,
      message_count: conv.ai_messages?.length || 0,
      last_message_preview: null,
    }));
  }
}

import { z } from "zod";

/**
 * Metadata for conversation messages
 */
export interface ConversationMessageMetadata {
  processing_time_ms?: number;
  token_breakdown?: {
    input_tokens: number;
    output_tokens: number;
  };
  temperature?: number;
  error_details?: {
    type: string;
    message: string;
    retry_count: number;
  };
  [key: string]: unknown;
}

/**
 * Metadata for AI conversations
 */
export interface ConversationMetadata {
  tags?: string[];
  priority?: "low" | "normal" | "high";
  context_id?: string;
  user_preferences?: {
    model_preference?: string;
    temperature?: number;
  };
  [key: string]: unknown;
}

// Database table types
export interface AIConversation {
  id: string;
  user_id: string;
  title: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  metadata: ConversationMetadata;
}

/**
 * Database model for AI conversation messages
 * Used specifically for stored conversation data
 */
export interface AIConversationMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "function";
  content: string;
  tokens_used: number | null;
  model: string | null;
  metadata: ConversationMessageMetadata;
  created_at: string;
}

// Zod schemas for validation
export const conversationMessageMetadataSchema = z
  .object({
    processing_time_ms: z.number().optional(),
    token_breakdown: z
      .object({
        input_tokens: z.number(),
        output_tokens: z.number(),
      })
      .optional(),
    temperature: z.number().min(0).max(2).optional(),
    error_details: z
      .object({
        type: z.string(),
        message: z.string(),
        retry_count: z.number().min(0),
      })
      .optional(),
  })
  .catchall(z.unknown());

export const conversationMetadataSchema = z
  .object({
    tags: z.array(z.string()).optional(),
    priority: z.enum(["low", "normal", "high"]).optional(),
    context_id: z.string().optional(),
    user_preferences: z
      .object({
        model_preference: z.string().optional(),
        temperature: z.number().min(0).max(2).optional(),
      })
      .optional(),
  })
  .catchall(z.unknown());

// API request/response types
export const createConversationSchema = z.object({
  title: z.string().optional(),
  metadata: conversationMetadataSchema.optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const createMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system", "function"]),
  content: z.string().min(1),
  tokens_used: z.number().optional(),
  model: z.string().optional(),
  metadata: conversationMessageMetadataSchema.optional(),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export const updateConversationSchema = z.object({
  title: z.string().optional(),
  metadata: conversationMetadataSchema.optional(),
});

export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

// Extended types with relations
export interface AIConversationWithMessages extends AIConversation {
  messages: AIConversationMessage[];
}

export interface AIConversationSummary extends AIConversation {
  message_count: number;
  last_message_preview: string | null;
}

// Pagination types
export interface ConversationListParams {
  page?: number;
  limit?: number;
  search?: string;
  orderBy?: "created_at" | "last_message_at";
  order?: "asc" | "desc";
}

export interface ConversationListResponse {
  conversations: AIConversationSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Real-time subscription types
export interface ConversationUpdate {
  type: "created" | "updated" | "deleted";
  conversation: AIConversation;
}

export interface MessageUpdate {
  type: "created" | "updated" | "deleted";
  message: AIConversationMessage;
  conversation_id: string;
}

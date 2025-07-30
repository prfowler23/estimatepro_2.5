import { z } from "zod";

// Database table types
export interface AIConversation {
  id: string;
  user_id: string;
  title: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "function";
  content: string;
  tokens_used: number | null;
  model: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// API request/response types
export const createConversationSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const createMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system", "function"]),
  content: z.string().min(1),
  tokens_used: z.number().optional(),
  model: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;

export const updateConversationSchema = z.object({
  title: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

// Extended types with relations
export interface AIConversationWithMessages extends AIConversation {
  messages: AIMessage[];
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
  message: AIMessage;
  conversation_id: string;
}

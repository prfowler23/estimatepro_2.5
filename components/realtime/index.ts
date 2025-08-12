/**
 * Real-Time Components Export Index
 * Centralized exports for all real-time UI components
 */

export { ConnectionStatus } from "./ConnectionStatus";
export { CollaboratorIndicator } from "./CollaboratorIndicator";

// Re-export types
export type { ConnectionHealth } from "@/lib/websocket/connection-manager";
export type { Collaborator } from "@/hooks/useCollaboration";

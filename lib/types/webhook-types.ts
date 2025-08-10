export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  description?: string;
  timeout_seconds: number;
  retry_attempts: number;
  retry_delay_seconds: number;
  created_at: string;
  last_triggered?: string;
  success_count: number;
  failure_count: number;
  secret?: string; // For HMAC signature verification
  headers?: Record<string, string>; // Custom headers
  metadata?: Record<string, any>; // Additional metadata
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: any;
  status: "pending" | "delivered" | "failed" | "retrying";
  attempts: number;
  response_status?: number;
  response_body?: string;
  error_message?: string;
  created_at: string;
  delivered_at?: string;
  next_retry_at?: string;
  signature?: string; // HMAC signature sent with the webhook
}

export interface WebhookStats {
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  pending_deliveries: number;
  success_rate: number;
  average_response_time: number;
  last_24h_deliveries: number;
  last_7d_deliveries: number;
}

export interface WebhookEvent {
  type: string;
  label: string;
  description: string;
  category:
    | "estimate"
    | "customer"
    | "integration"
    | "user"
    | "payment"
    | "project"
    | "notification"
    | "system";
  sample_payload?: any;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  metadata?: {
    user_id?: string;
    organization_id?: string;
    ip_address?: string;
    user_agent?: string;
  };
}

export interface WebhookSecurityConfig {
  enable_signatures: boolean;
  signature_header: string;
  signature_algorithm: "sha256" | "sha512";
  ip_whitelist?: string[];
  rate_limit?: {
    max_requests_per_minute: number;
    max_requests_per_hour: number;
  };
}

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  // Estimate Events
  {
    type: "estimate.created",
    label: "Estimate Created",
    description: "Triggered when a new estimate is created",
    category: "estimate",
  },
  {
    type: "estimate.updated",
    label: "Estimate Updated",
    description: "Triggered when an estimate is updated",
    category: "estimate",
  },
  {
    type: "estimate.approved",
    label: "Estimate Approved",
    description: "Triggered when an estimate is approved",
    category: "estimate",
  },
  {
    type: "estimate.rejected",
    label: "Estimate Rejected",
    description: "Triggered when an estimate is rejected",
    category: "estimate",
  },
  {
    type: "estimate.sent",
    label: "Estimate Sent",
    description: "Triggered when an estimate is sent to customer",
    category: "estimate",
  },

  // Customer Events
  {
    type: "customer.created",
    label: "Customer Created",
    description: "Triggered when a new customer is added",
    category: "customer",
  },
  {
    type: "customer.updated",
    label: "Customer Updated",
    description: "Triggered when customer information is updated",
    category: "customer",
  },

  // Integration Events
  {
    type: "integration.sync.completed",
    label: "Sync Completed",
    description: "Triggered when integration sync completes",
    category: "integration",
  },
  {
    type: "integration.sync.failed",
    label: "Sync Failed",
    description: "Triggered when integration sync fails",
    category: "integration",
  },

  // User Events
  {
    type: "user.created",
    label: "User Created",
    description: "Triggered when a new user is created",
    category: "user",
  },
  {
    type: "user.updated",
    label: "User Updated",
    description: "Triggered when user information is updated",
    category: "user",
  },

  // Payment Events
  {
    type: "payment.received",
    label: "Payment Received",
    description: "Triggered when a payment is received",
    category: "payment",
  },
  {
    type: "payment.failed",
    label: "Payment Failed",
    description: "Triggered when a payment fails",
    category: "payment",
  },

  // Project Events
  {
    type: "project.started",
    label: "Project Started",
    description: "Triggered when a project is started",
    category: "project",
  },
  {
    type: "project.completed",
    label: "Project Completed",
    description: "Triggered when a project is completed",
    category: "project",
  },

  // Notification Events
  {
    type: "notification.sent",
    label: "Notification Sent",
    description: "Triggered when a notification is sent",
    category: "notification",
  },
  {
    type: "alert.triggered",
    label: "Alert Triggered",
    description: "Triggered when an alert is triggered",
    category: "notification",
  },

  // System Events
  {
    type: "backup.completed",
    label: "Backup Completed",
    description: "Triggered when a backup is completed",
    category: "system",
  },
  {
    type: "system.maintenance",
    label: "System Maintenance",
    description: "Triggered during system maintenance",
    category: "system",
  },
];

export const DEFAULT_WEBHOOK_CONFIG: Partial<WebhookConfig> = {
  timeout_seconds: 10,
  retry_attempts: 3,
  retry_delay_seconds: 5,
  active: true,
  events: [],
  success_count: 0,
  failure_count: 0,
};

// Alert Manager
// Comprehensive alerting system with multiple notification channels

import { EventEmitter } from "events";

// Alert interface
export interface Alert {
  id?: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  details?: any;
  timestamp: number;
  resolved?: boolean;
  resolvedAt?: number;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  escalationLevel?: number;
  notificationsSent?: string[];
}

// Alert rule interface
export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldown: number; // minutes
  escalation?: EscalationRule[];
}

// Alert condition interface
export interface AlertCondition {
  metric: string;
  operator: "gt" | "lt" | "eq" | "gte" | "lte" | "contains";
  value: number | string;
  duration?: number; // minutes
}

// Alert action interface
export interface AlertAction {
  type: "email" | "sms" | "slack" | "webhook" | "push";
  target: string;
  template?: string;
  enabled: boolean;
}

// Escalation rule interface
export interface EscalationRule {
  level: number;
  delay: number; // minutes
  actions: AlertAction[];
}

// Notification channel interface
export interface NotificationChannel {
  type: string;
  name: string;
  config: any;
  enabled: boolean;
  rateLimit?: {
    maxMessages: number;
    windowMinutes: number;
  };
}

// Alert configuration
export interface AlertConfig {
  enabled: boolean;
  defaultCooldown: number;
  maxAlertsPerHour: number;
  retentionDays: number;
  escalationEnabled: boolean;
  channels: NotificationChannel[];
  rules: AlertRule[];
}

// Default configuration
const defaultConfig: AlertConfig = {
  enabled: true,
  defaultCooldown: 15, // 15 minutes
  maxAlertsPerHour: 100,
  retentionDays: 30,
  escalationEnabled: true,
  channels: [
    {
      type: "email",
      name: "Admin Email",
      config: {
        from: process.env.EMAIL_FROM || "alerts@estimatepro.com",
        to: process.env.ADMIN_EMAIL || "admin@estimatepro.com",
      },
      enabled: true,
      rateLimit: {
        maxMessages: 20,
        windowMinutes: 60,
      },
    },
    {
      type: "webhook",
      name: "Slack Webhook",
      config: {
        url: process.env.SLACK_WEBHOOK_URL,
      },
      enabled: !!process.env.SLACK_WEBHOOK_URL,
    },
  ],
  rules: [
    {
      id: "high-cpu-usage",
      name: "High CPU Usage",
      enabled: true,
      conditions: [
        {
          metric: "cpu.usage",
          operator: "gt",
          value: 80,
          duration: 5,
        },
      ],
      actions: [
        {
          type: "email",
          target: "admin@estimatepro.com",
          enabled: true,
        },
      ],
      cooldown: 15,
    },
    {
      id: "high-memory-usage",
      name: "High Memory Usage",
      enabled: true,
      conditions: [
        {
          metric: "memory.percentage",
          operator: "gt",
          value: 85,
          duration: 5,
        },
      ],
      actions: [
        {
          type: "email",
          target: "admin@estimatepro.com",
          enabled: true,
        },
      ],
      cooldown: 15,
    },
    {
      id: "api-errors",
      name: "High API Error Rate",
      enabled: true,
      conditions: [
        {
          metric: "application.errorRate",
          operator: "gt",
          value: 5,
          duration: 2,
        },
      ],
      actions: [
        {
          type: "email",
          target: "admin@estimatepro.com",
          enabled: true,
        },
        {
          type: "slack",
          target: "#alerts",
          enabled: true,
        },
      ],
      cooldown: 10,
      escalation: [
        {
          level: 1,
          delay: 30,
          actions: [
            {
              type: "sms",
              target: process.env.ADMIN_PHONE || "",
              enabled: !!process.env.ADMIN_PHONE,
            },
          ],
        },
      ],
    },
  ],
};

export class AlertManager extends EventEmitter {
  private config: AlertConfig;
  private alerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private cooldownTracker: Map<string, number> = new Map();
  private rateLimitTracker: Map<string, number[]> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<AlertConfig> = {}) {
    super();
    this.config = { ...defaultConfig, ...config };
    this.startCleanupTimer();
  }

  // Send alert
  public async sendAlert(alert: Omit<Alert, "id">): Promise<string> {
    if (!this.config.enabled) return "";

    const alertId = this.generateAlertId();
    const fullAlert: Alert = {
      ...alert,
      id: alertId,
      escalationLevel: 0,
      notificationsSent: [],
    };

    // Check if alert is in cooldown
    if (this.isInCooldown(alert.type)) {
      console.log(`Alert ${alert.type} is in cooldown, skipping`);
      return alertId;
    }

    // Check rate limits
    if (this.isRateLimited()) {
      console.log("Alert rate limit exceeded, skipping");
      return alertId;
    }

    // Store alert
    this.alerts.set(alertId, fullAlert);
    this.alertHistory.push(fullAlert);

    // Find matching rules
    const matchingRules = this.findMatchingRules(fullAlert);

    // Process each matching rule
    for (const rule of matchingRules) {
      await this.processAlertRule(fullAlert, rule);
    }

    // Set cooldown
    this.setCooldown(alert.type);

    // Emit event
    this.emit("alert", fullAlert);

    return alertId;
  }

  // Process alert rule
  private async processAlertRule(alert: Alert, rule: AlertRule): Promise<void> {
    if (!rule.enabled) return;

    // Execute actions
    for (const action of rule.actions) {
      if (action.enabled) {
        await this.executeAction(alert, action);
      }
    }

    // Setup escalation if configured
    if (rule.escalation && rule.escalation.length > 0) {
      this.setupEscalation(alert, rule);
    }
  }

  // Execute alert action
  private async executeAction(
    alert: Alert,
    action: AlertAction,
  ): Promise<void> {
    try {
      switch (action.type) {
        case "email":
          await this.sendEmailNotification(alert, action);
          break;
        case "sms":
          await this.sendSMSNotification(alert, action);
          break;
        case "slack":
          await this.sendSlackNotification(alert, action);
          break;
        case "webhook":
          await this.sendWebhookNotification(alert, action);
          break;
        case "push":
          await this.sendPushNotification(alert, action);
          break;
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }

      // Track notification sent
      if (alert.notificationsSent) {
        alert.notificationsSent.push(`${action.type}:${action.target}`);
      }
    } catch (error) {
      console.error(`Failed to execute action ${action.type}:`, error);
    }
  }

  // Send email notification
  private async sendEmailNotification(
    alert: Alert,
    action: AlertAction,
  ): Promise<void> {
    const emailChannel = this.config.channels.find((c) => c.type === "email");
    if (!emailChannel || !emailChannel.enabled) return;

    // Check rate limit
    if (this.isChannelRateLimited(emailChannel)) {
      console.log("Email channel rate limited");
      return;
    }

    const emailData = {
      to: action.target,
      from: emailChannel.config.from,
      subject: `EstimatePro Alert: ${alert.type}`,
      html: this.generateEmailTemplate(alert, action.template),
    };

    console.log("Sending email notification:", emailData);

    // In production, this would use a real email service
    // For now, we'll just log the email
    this.trackChannelUsage(emailChannel);
  }

  // Send SMS notification
  private async sendSMSNotification(
    alert: Alert,
    action: AlertAction,
  ): Promise<void> {
    const smsChannel = this.config.channels.find((c) => c.type === "sms");
    if (!smsChannel || !smsChannel.enabled) return;

    const message = `EstimatePro Alert: ${alert.message}`;
    console.log(`Sending SMS to ${action.target}: ${message}`);

    // In production, this would use a real SMS service
  }

  // Send Slack notification
  private async sendSlackNotification(
    alert: Alert,
    action: AlertAction,
  ): Promise<void> {
    const slackChannel = this.config.channels.find((c) => c.type === "slack");
    if (!slackChannel || !slackChannel.enabled || !slackChannel.config.url)
      return;

    const payload = {
      text: `🚨 EstimatePro Alert`,
      attachments: [
        {
          color:
            alert.severity === "critical"
              ? "danger"
              : alert.severity === "warning"
                ? "warning"
                : "good",
          fields: [
            {
              title: "Type",
              value: alert.type,
              short: true,
            },
            {
              title: "Severity",
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: "Message",
              value: alert.message,
              short: false,
            },
            {
              title: "Time",
              value: new Date(alert.timestamp).toISOString(),
              short: true,
            },
          ],
        },
      ],
    };

    console.log("Sending Slack notification:", payload);

    // In production, this would make an HTTP request to the Slack webhook
  }

  // Send webhook notification
  private async sendWebhookNotification(
    alert: Alert,
    action: AlertAction,
  ): Promise<void> {
    const webhookChannel = this.config.channels.find(
      (c) => c.type === "webhook",
    );
    if (!webhookChannel || !webhookChannel.enabled) return;

    const payload = {
      alert,
      timestamp: Date.now(),
      source: "EstimatePro",
    };

    console.log(`Sending webhook notification to ${action.target}:`, payload);

    // In production, this would make an HTTP request to the webhook URL
  }

  // Send push notification
  private async sendPushNotification(
    alert: Alert,
    action: AlertAction,
  ): Promise<void> {
    const pushChannel = this.config.channels.find((c) => c.type === "push");
    if (!pushChannel || !pushChannel.enabled) return;

    const notification = {
      title: "EstimatePro Alert",
      body: alert.message,
      icon: "/icon-192x192.png",
      badge: "/icon-72x72.png",
      data: {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
      },
    };

    console.log("Sending push notification:", notification);

    // In production, this would use the Push API
  }

  // Generate email template
  private generateEmailTemplate(alert: Alert, template?: string): string {
    if (template) {
      return template
        .replace("{{message}}", alert.message)
        .replace("{{type}}", alert.type)
        .replace("{{severity}}", alert.severity)
        .replace("{{timestamp}}", new Date(alert.timestamp).toISOString());
    }

    return `
      <html>
        <body>
          <h2>EstimatePro Alert</h2>
          <p><strong>Type:</strong> ${alert.type}</p>
          <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Time:</strong> ${new Date(alert.timestamp).toISOString()}</p>
          ${alert.details ? `<p><strong>Details:</strong> ${JSON.stringify(alert.details, null, 2)}</p>` : ""}
        </body>
      </html>
    `;
  }

  // Find matching rules
  private findMatchingRules(alert: Alert): AlertRule[] {
    return this.config.rules.filter((rule) => {
      if (!rule.enabled) return false;

      // For now, we'll match based on alert type
      return rule.conditions.some((condition) => {
        return (
          condition.metric === alert.type ||
          alert.type.includes(condition.metric)
        );
      });
    });
  }

  // Setup escalation
  private setupEscalation(alert: Alert, rule: AlertRule): void {
    if (!rule.escalation || !this.config.escalationEnabled) return;

    for (const escalation of rule.escalation) {
      const timer = setTimeout(
        async () => {
          if (
            this.alerts.has(alert.id!) &&
            !this.alerts.get(alert.id!)?.resolved
          ) {
            console.log(
              `Escalating alert ${alert.id} to level ${escalation.level}`,
            );

            // Update alert escalation level
            const currentAlert = this.alerts.get(alert.id!);
            if (currentAlert) {
              currentAlert.escalationLevel = escalation.level;

              // Execute escalation actions
              for (const action of escalation.actions) {
                if (action.enabled) {
                  await this.executeAction(currentAlert, action);
                }
              }
            }
          }
        },
        escalation.delay * 60 * 1000,
      );

      this.escalationTimers.set(`${alert.id}_${escalation.level}`, timer);
    }
  }

  // Check if alert is in cooldown
  private isInCooldown(alertType: string): boolean {
    const lastSent = this.cooldownTracker.get(alertType);
    if (!lastSent) return false;

    const cooldownMs = this.config.defaultCooldown * 60 * 1000;
    return Date.now() - lastSent < cooldownMs;
  }

  // Set cooldown
  private setCooldown(alertType: string): void {
    this.cooldownTracker.set(alertType, Date.now());
  }

  // Check if rate limited
  private isRateLimited(): boolean {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;

    const recentAlerts = this.alertHistory.filter(
      (alert) => alert.timestamp > hourAgo,
    );
    return recentAlerts.length >= this.config.maxAlertsPerHour;
  }

  // Check if channel is rate limited
  private isChannelRateLimited(channel: NotificationChannel): boolean {
    if (!channel.rateLimit) return false;

    const now = Date.now();
    const windowMs = channel.rateLimit.windowMinutes * 60 * 1000;
    const windowStart = now - windowMs;

    const usage = this.rateLimitTracker.get(channel.name) || [];
    const recentUsage = usage.filter((timestamp) => timestamp > windowStart);

    return recentUsage.length >= channel.rateLimit.maxMessages;
  }

  // Track channel usage
  private trackChannelUsage(channel: NotificationChannel): void {
    const usage = this.rateLimitTracker.get(channel.name) || [];
    usage.push(Date.now());
    this.rateLimitTracker.set(channel.name, usage);
  }

  // Resolve alert
  public resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    if (resolvedBy) {
      alert.acknowledgedBy = resolvedBy;
    }

    // Clear escalation timers
    this.clearEscalationTimers(alertId);

    this.emit("alertResolved", alert);
    return true;
  }

  // Acknowledge alert
  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = Date.now();

    // Clear escalation timers
    this.clearEscalationTimers(alertId);

    this.emit("alertAcknowledged", alert);
    return true;
  }

  // Clear escalation timers
  private clearEscalationTimers(alertId: string): void {
    const timersToDelete = [];
    for (const [key, timer] of this.escalationTimers.entries()) {
      if (key.startsWith(alertId + "_")) {
        clearTimeout(timer);
        timersToDelete.push(key);
      }
    }

    timersToDelete.forEach((key) => this.escalationTimers.delete(key));
  }

  // Generate alert ID
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Start cleanup timer
  private startCleanupTimer(): void {
    setInterval(
      () => {
        this.cleanupOldAlerts();
        this.cleanupRateLimitTracking();
      },
      60 * 60 * 1000,
    ); // Run every hour
  }

  // Cleanup old alerts
  private cleanupOldAlerts(): void {
    const cutoffTime =
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;

    // Clean up active alerts
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoffTime) {
        this.alerts.delete(id);
      }
    }

    // Clean up alert history
    this.alertHistory = this.alertHistory.filter(
      (alert) => alert.timestamp > cutoffTime,
    );
  }

  // Cleanup rate limit tracking
  private cleanupRateLimitTracking(): void {
    const now = Date.now();
    const maxWindow = 24 * 60 * 60 * 1000; // 24 hours

    for (const [channel, usage] of this.rateLimitTracker.entries()) {
      const recentUsage = usage.filter(
        (timestamp) => now - timestamp < maxWindow,
      );
      this.rateLimitTracker.set(channel, recentUsage);
    }
  }

  // Get active alerts
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((alert) => !alert.resolved);
  }

  // Get alert history
  public getAlertHistory(hours: number = 24): Alert[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return this.alertHistory.filter((alert) => alert.timestamp > cutoffTime);
  }

  // Get alert by ID
  public getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  // Update configuration
  public updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Get configuration
  public getConfig(): AlertConfig {
    return { ...this.config };
  }

  // Add alert rule
  public addAlertRule(rule: AlertRule): void {
    const existingIndex = this.config.rules.findIndex((r) => r.id === rule.id);
    if (existingIndex >= 0) {
      this.config.rules[existingIndex] = rule;
    } else {
      this.config.rules.push(rule);
    }
  }

  // Remove alert rule
  public removeAlertRule(ruleId: string): boolean {
    const index = this.config.rules.findIndex((r) => r.id === ruleId);
    if (index >= 0) {
      this.config.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  // Get alert statistics
  public getAlertStats(hours: number = 24): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    resolved: number;
    acknowledged: number;
  } {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    const alerts = this.alertHistory.filter(
      (alert) => alert.timestamp > cutoffTime,
    );

    const stats = {
      total: alerts.length,
      byType: {},
      bySeverity: {},
      resolved: 0,
      acknowledged: 0,
    };

    alerts.forEach((alert) => {
      // Count by type
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;

      // Count by severity
      stats.bySeverity[alert.severity] =
        (stats.bySeverity[alert.severity] || 0) + 1;

      // Count resolved and acknowledged
      if (alert.resolved) stats.resolved++;
      if (alert.acknowledgedBy) stats.acknowledged++;
    });

    return stats;
  }
}

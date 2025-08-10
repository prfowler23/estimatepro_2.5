/**
 * Advanced Analytics Dashboard Types
 * Comprehensive workflow and performance analytics
 */

export interface WorkflowAnalytics {
  id: string;
  estimateId: string;
  userId: string;
  userName: string;
  userRole: string;

  // Workflow metadata
  templateUsed?: string;
  startTime: Date;
  endTime?: Date;
  currentStep: number;
  totalSteps: number;

  // Performance metrics
  totalDuration: number; // in minutes
  stepDurations: StepDuration[];
  aiInteractions: AIInteractionSummary[];

  // Quality metrics
  validationScore: number;
  errorCount: number;
  warningCount: number;
  autoFixesApplied: number;

  // Collaboration metrics
  collaboratorCount: number;
  conflictCount: number;
  averageConflictResolutionTime: number;

  // Completion metrics
  completionRate: number;
  abandonmentPoint?: number;
  completionQuality: WorkflowQuality;

  // User experience metrics
  userSatisfactionScore?: number;
  usabilityScore: number;

  // Business metrics
  estimateValue?: number;
  conversionRate?: number;
  revisionCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface StepDuration {
  stepId: string;
  stepName: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  visitCount: number;
  backtrackCount: number;
  validationErrors: number;
  aiAssistanceUsed: boolean;
  helpViewCount: number;
  timeSpentInHelp: number;
}

export interface AIInteractionSummary {
  interactionId: string;
  type:
    | "photo_analysis"
    | "document_extraction"
    | "smart_defaults"
    | "validation"
    | "suggestions";
  stepId: string;
  timestamp: Date;
  duration: number;
  tokensUsed: number;
  cost: number;
  accuracy: number;
  userAcceptanceRate: number;
  confidence: number;
}

export interface WorkflowQuality {
  completenessScore: number;
  accuracyScore: number;
  consistencyScore: number;
  timelinessScore: number;
  overallScore: number;

  // Quality indicators
  missingFieldCount: number;
  dataInconsistencyCount: number;
  validationFailureCount: number;
  aiSuggestionAcceptanceRate: number;
}

export interface UserWorkflowStats {
  userId: string;
  userName: string;
  userRole: string;

  // Workflow statistics
  totalWorkflows: number;
  completedWorkflows: number;
  averageCompletionTime: number;
  averageQualityScore: number;

  // Efficiency metrics
  averageStepDuration: number;
  averageBacktrackRate: number;
  averageErrorRate: number;
  averageAIUsage: number;

  // Performance trends
  weeklyCompletionRate: number;
  monthlyCompletionRate: number;
  qualityTrend: "improving" | "stable" | "declining";
  efficiencyTrend: "improving" | "stable" | "declining";

  // Areas for improvement
  slowestSteps: string[];
  mostCommonErrors: string[];
  underutilizedFeatures: string[];
}

export interface TeamAnalytics {
  teamId: string;
  teamName: string;

  // Team performance
  totalWorkflows: number;
  averageCompletionTime: number;
  averageQualityScore: number;
  collaborationEfficiency: number;

  // Team composition
  memberCount: number;
  roleDistribution: Record<string, number>;
  experienceLevels: Record<string, number>;

  // Workflow distribution
  workflowsByTemplate: Record<string, number>;
  workflowsByComplexity: Record<string, number>;

  // Collaboration metrics
  averageCollaboratorCount: number;
  conflictResolutionTime: number;
  knowledgeSharing: number;

  // Performance trends
  weeklyTrends: TimeSeriesData[];
  monthlyTrends: TimeSeriesData[];
}

/**
 * Time series data point with optional metadata
 */
export interface TimeSeriesData {
  date: Date;
  value: number;
  metric: string;
  metadata?: TimeSeriesMetadata;
}

/**
 * Metadata for time series data points
 */
export interface TimeSeriesMetadata {
  source?: string;
  confidence?: number;
  aggregation_method?: "sum" | "avg" | "max" | "min" | "count";
  data_quality?: "high" | "medium" | "low";
  sample_size?: number;
  [key: string]: unknown;
}

export interface WorkflowBenchmark {
  benchmarkType:
    | "step_duration"
    | "quality_score"
    | "completion_time"
    | "error_rate";
  stepId?: string;
  template?: string;

  // Benchmark values
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  average: number;

  // Sample size
  sampleSize: number;
  lastUpdated: Date;
}

/**
 * Data point used in predictive analysis
 */
export interface PredictiveDataPoint {
  timestamp: Date;
  value: number;
  feature_name: string;
  weight: number;
  confidence: number;
  metadata?: {
    source: string;
    computation_method?: string;
    validation_status?: "validated" | "unvalidated" | "flagged";
    [key: string]: unknown;
  };
}

export interface PredictiveInsight {
  insightId: string;
  type:
    | "completion_prediction"
    | "quality_prediction"
    | "bottleneck_detection"
    | "resource_optimization";
  confidence: number;
  severity: "low" | "medium" | "high";

  // Prediction data
  prediction: string;
  probability: number;
  impact: "low" | "medium" | "high";

  // Recommendations
  recommendations: string[];
  actionItems: ActionItem[];

  // Context
  affectedWorkflows: string[];
  affectedUsers: string[];
  dataPoints: PredictiveDataPoint[];

  createdAt: Date;
  expiresAt?: Date;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  category: "training" | "process" | "technology" | "resource";
  estimatedImpact: string;
  estimatedEffort: string;
  dueDate?: Date;
  assignedTo?: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
}

export interface AnalyticsFilter {
  startDate?: Date;
  endDate?: Date;
  userIds?: string[];
  templates?: string[];
  steps?: string[];
  completionStatus?: "all" | "completed" | "abandoned";
  qualityRange?: [number, number];
  collaborationLevel?: "solo" | "team" | "all";
}

export interface AnalyticsMetric {
  id: string;
  name: string;
  description: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  trendPercentage: number;
  benchmark?: number;
  target?: number;

  // Visualization hints
  chartType: "line" | "bar" | "pie" | "gauge" | "number";
  colorScheme: "success" | "warning" | "error" | "info";

  // Drill-down data
  breakdown?: Record<string, number>;
  timeSeries?: TimeSeriesData[];
}

export interface AnalyticsDashboard {
  dashboardId: string;
  name: string;
  description: string;

  // Configuration
  refreshRate: number; // in seconds
  autoRefresh: boolean;
  layout: DashboardLayout;

  // Widgets
  widgets: DashboardWidget[];

  // Filters
  globalFilters: AnalyticsFilter;

  // Permissions
  viewPermissions: string[];
  editPermissions: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: "metric" | "chart" | "table" | "insight" | "benchmark";
  title: string;
  description?: string;

  // Position and size
  position: { x: number; y: number };
  size: { width: number; height: number };

  // Data configuration
  dataSource: string;
  query: AnalyticsQuery;
  refreshRate?: number;

  // Visualization
  chartConfig?: ChartConfig;

  // Interactivity
  clickable: boolean;
  drillDownTarget?: string;

  // Permissions
  viewPermissions: string[];
}

export interface AnalyticsQuery {
  metric: string;
  aggregation: "sum" | "avg" | "count" | "max" | "min" | "p50" | "p95";
  groupBy?: string[];
  filters?: AnalyticsFilter;
  timeRange?: {
    start: Date;
    end: Date;
    granularity: "hour" | "day" | "week" | "month";
  };
}

export interface ChartConfig {
  type: "line" | "bar" | "pie" | "area" | "scatter" | "heatmap";
  xAxis?: string;
  yAxis?: string;
  colorBy?: string;
  stackBy?: string;

  // Styling
  colors?: string[];
  showLegend: boolean;
  showAxes: boolean;
  showGrid: boolean;

  // Interactivity
  zoomable: boolean;
  hoverable: boolean;
  clickable: boolean;
}

export interface DashboardLayout {
  type: "grid" | "flow" | "masonry";
  columns: number;
  gap: number;
  responsive: boolean;
}

export interface AnalyticsExport {
  exportId: string;
  type: "pdf" | "excel" | "csv" | "json";
  name: string;
  description?: string;

  // Export configuration
  dashboardId?: string;
  widgets?: string[];
  filters?: AnalyticsFilter;

  // Scheduling
  schedule?: {
    frequency: "daily" | "weekly" | "monthly";
    time: string;
    recipients: string[];
  };

  // Status
  status: "pending" | "generating" | "completed" | "failed";
  fileUrl?: string;
  fileSizeBytes?: number;

  createdAt: Date;
  completedAt?: Date;
}

export interface AnalyticsAlert {
  alertId: string;
  name: string;
  description: string;

  // Alert condition
  metric: string;
  threshold: number;
  operator: "gt" | "lt" | "eq" | "ne";

  // Notification
  recipients: string[];
  channels: ("email" | "slack" | "webhook")[];

  // Status
  isActive: boolean;
  lastTriggered?: Date;
  triggerCount: number;

  createdAt: Date;
  updatedAt: Date;
}

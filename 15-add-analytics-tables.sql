-- Advanced Analytics Tables
-- Creates comprehensive analytics and reporting infrastructure

-- Workflow Analytics Table
CREATE TABLE IF NOT EXISTS workflow_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    
    -- Workflow metadata
    template_used TEXT,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    current_step INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL DEFAULT 9,
    
    -- Performance metrics
    total_duration INTEGER DEFAULT 0, -- in minutes
    step_durations JSONB DEFAULT '[]',
    ai_interactions JSONB DEFAULT '[]',
    
    -- Quality metrics
    validation_score NUMERIC(5,2) DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    warning_count INTEGER DEFAULT 0,
    auto_fixes_applied INTEGER DEFAULT 0,
    
    -- Collaboration metrics
    collaborator_count INTEGER DEFAULT 1,
    conflict_count INTEGER DEFAULT 0,
    average_conflict_resolution_time NUMERIC(10,2) DEFAULT 0,
    
    -- Completion metrics
    completion_rate NUMERIC(5,2) DEFAULT 0,
    abandonment_point INTEGER,
    completion_quality JSONB DEFAULT '{}',
    
    -- User experience metrics
    user_satisfaction_score NUMERIC(3,2),
    usability_score NUMERIC(5,2) DEFAULT 0,
    
    -- Business metrics
    estimate_value NUMERIC(12,2),
    conversion_rate NUMERIC(5,2),
    revision_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Metrics Table
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC(15,4) NOT NULL,
    metric_unit TEXT NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'summary')),
    
    -- Metric metadata
    description TEXT,
    category TEXT,
    tags JSONB DEFAULT '{}',
    
    -- Time series data
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_bucket TEXT, -- for aggregation (hour, day, week, month)
    
    -- Dimensions
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID,
    workflow_id UUID REFERENCES workflow_analytics(id) ON DELETE CASCADE,
    
    -- Aggregation helpers
    sample_count INTEGER DEFAULT 1,
    percentile_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Performance Stats Table
CREATE TABLE IF NOT EXISTS user_performance_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    
    -- Performance period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly')),
    
    -- Workflow statistics
    total_workflows INTEGER DEFAULT 0,
    completed_workflows INTEGER DEFAULT 0,
    average_completion_time NUMERIC(10,2) DEFAULT 0,
    average_quality_score NUMERIC(5,2) DEFAULT 0,
    
    -- Efficiency metrics
    average_step_duration NUMERIC(10,2) DEFAULT 0,
    average_backtrack_rate NUMERIC(5,2) DEFAULT 0,
    average_error_rate NUMERIC(5,2) DEFAULT 0,
    average_ai_usage NUMERIC(5,2) DEFAULT 0,
    
    -- Performance trends
    weekly_completion_rate NUMERIC(5,2) DEFAULT 0,
    monthly_completion_rate NUMERIC(5,2) DEFAULT 0,
    quality_trend TEXT DEFAULT 'stable' CHECK (quality_trend IN ('improving', 'stable', 'declining')),
    efficiency_trend TEXT DEFAULT 'stable' CHECK (efficiency_trend IN ('improving', 'stable', 'declining')),
    
    -- Areas for improvement
    slowest_steps JSONB DEFAULT '[]',
    most_common_errors JSONB DEFAULT '[]',
    underutilized_features JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Benchmarks Table
CREATE TABLE IF NOT EXISTS workflow_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    benchmark_type TEXT NOT NULL,
    step_id TEXT,
    template TEXT,
    
    -- Benchmark values
    p25 NUMERIC(10,4) NOT NULL,
    p50 NUMERIC(10,4) NOT NULL,
    p75 NUMERIC(10,4) NOT NULL,
    p90 NUMERIC(10,4) NOT NULL,
    p95 NUMERIC(10,4) NOT NULL,
    average NUMERIC(10,4) NOT NULL,
    
    -- Sample information
    sample_size INTEGER NOT NULL,
    calculation_method TEXT DEFAULT 'percentile',
    
    -- Time range
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Predictive Insights Table
CREATE TABLE IF NOT EXISTS predictive_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_type TEXT NOT NULL CHECK (insight_type IN ('completion_prediction', 'quality_prediction', 'bottleneck_detection', 'resource_optimization')),
    confidence NUMERIC(3,2) NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    
    -- Prediction data
    prediction TEXT NOT NULL,
    probability NUMERIC(3,2) NOT NULL,
    impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
    
    -- Recommendations
    recommendations JSONB DEFAULT '[]',
    action_items JSONB DEFAULT '[]',
    
    -- Context
    affected_workflows JSONB DEFAULT '[]',
    affected_users JSONB DEFAULT '[]',
    data_points JSONB DEFAULT '[]',
    
    -- Lifecycle
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Dashboards Table
CREATE TABLE IF NOT EXISTS analytics_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Configuration
    refresh_rate INTEGER DEFAULT 300, -- in seconds
    auto_refresh BOOLEAN DEFAULT FALSE,
    layout_config JSONB DEFAULT '{}',
    
    -- Widgets
    widgets JSONB DEFAULT '[]',
    
    -- Filters
    global_filters JSONB DEFAULT '{}',
    
    -- Permissions
    view_permissions JSONB DEFAULT '[]',
    edit_permissions JSONB DEFAULT '[]',
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Exports Table
CREATE TABLE IF NOT EXISTS analytics_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'excel', 'csv', 'json')),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Export configuration
    dashboard_id UUID REFERENCES analytics_dashboards(id) ON DELETE CASCADE,
    widgets JSONB DEFAULT '[]',
    filters JSONB DEFAULT '{}',
    
    -- Scheduling
    schedule_config JSONB DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
    file_url TEXT,
    file_size_bytes BIGINT,
    error_message TEXT,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Analytics Alerts Table
CREATE TABLE IF NOT EXISTS analytics_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Alert condition
    metric_name TEXT NOT NULL,
    threshold_value NUMERIC(15,4) NOT NULL,
    threshold_operator TEXT NOT NULL CHECK (threshold_operator IN ('gt', 'lt', 'eq', 'ne')),
    
    -- Notification
    recipients JSONB DEFAULT '[]',
    notification_channels JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Series Analytics Table (for high-volume metrics)
CREATE TABLE IF NOT EXISTS time_series_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC(15,4) NOT NULL,
    
    -- Time dimensions
    timestamp TIMESTAMPTZ NOT NULL,
    hour_bucket TIMESTAMPTZ NOT NULL,
    day_bucket DATE NOT NULL,
    week_bucket DATE NOT NULL,
    month_bucket DATE NOT NULL,
    
    -- Dimensions
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflow_analytics(id) ON DELETE CASCADE,
    tags JSONB DEFAULT '{}',
    
    -- Aggregation metadata
    sample_count INTEGER DEFAULT 1,
    min_value NUMERIC(15,4),
    max_value NUMERIC(15,4),
    sum_value NUMERIC(15,4),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance

-- Workflow Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_user_id ON workflow_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_estimate_id ON workflow_analytics(estimate_id);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_created_at ON workflow_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_template ON workflow_analytics(template_used);
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_completion ON workflow_analytics(completion_rate);

-- Analytics Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_name ON analytics_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_recorded_at ON analytics_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_user_id ON analytics_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_workflow_id ON analytics_metrics(workflow_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_time_bucket ON analytics_metrics(time_bucket);

-- User Performance Stats Indexes
CREATE INDEX IF NOT EXISTS idx_user_performance_stats_user_id ON user_performance_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_performance_stats_period ON user_performance_stats(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_user_performance_stats_type ON user_performance_stats(period_type);

-- Workflow Benchmarks Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_benchmarks_type ON workflow_benchmarks(benchmark_type);
CREATE INDEX IF NOT EXISTS idx_workflow_benchmarks_period ON workflow_benchmarks(period_start, period_end);

-- Predictive Insights Indexes
CREATE INDEX IF NOT EXISTS idx_predictive_insights_type ON predictive_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_severity ON predictive_insights(severity);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_status ON predictive_insights(status);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_created_at ON predictive_insights(created_at);

-- Time Series Analytics Indexes
CREATE INDEX IF NOT EXISTS idx_time_series_analytics_metric_name ON time_series_analytics(metric_name);
CREATE INDEX IF NOT EXISTS idx_time_series_analytics_timestamp ON time_series_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_time_series_analytics_day_bucket ON time_series_analytics(day_bucket);
CREATE INDEX IF NOT EXISTS idx_time_series_analytics_user_id ON time_series_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_time_series_analytics_workflow_id ON time_series_analytics(workflow_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflow_analytics_user_created ON workflow_analytics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_name_recorded ON analytics_metrics(metric_name, recorded_at);
CREATE INDEX IF NOT EXISTS idx_time_series_name_day ON time_series_analytics(metric_name, day_bucket);

-- Row Level Security (RLS) Policies

-- Workflow Analytics RLS
ALTER TABLE workflow_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workflow analytics" ON workflow_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own workflow analytics" ON workflow_analytics
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own workflow analytics" ON workflow_analytics
  FOR UPDATE USING (user_id = auth.uid());

-- Analytics Metrics RLS
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analytics metrics" ON analytics_metrics
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert their own analytics metrics" ON analytics_metrics
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- User Performance Stats RLS
ALTER TABLE user_performance_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own performance stats" ON user_performance_stats
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own performance stats" ON user_performance_stats
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own performance stats" ON user_performance_stats
  FOR UPDATE USING (user_id = auth.uid());

-- Workflow Benchmarks RLS
ALTER TABLE workflow_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view benchmarks" ON workflow_benchmarks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Predictive Insights RLS
ALTER TABLE predictive_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view insights" ON predictive_insights
  FOR SELECT USING (auth.role() = 'authenticated');

-- Analytics Dashboards RLS
ALTER TABLE analytics_dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public dashboards and their own dashboards" ON analytics_dashboards
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own dashboards" ON analytics_dashboards
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own dashboards" ON analytics_dashboards
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own dashboards" ON analytics_dashboards
  FOR DELETE USING (created_by = auth.uid());

-- Analytics Exports RLS
ALTER TABLE analytics_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exports" ON analytics_exports
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create their own exports" ON analytics_exports
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own exports" ON analytics_exports
  FOR UPDATE USING (created_by = auth.uid());

-- Analytics Alerts RLS
ALTER TABLE analytics_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts" ON analytics_alerts
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can manage their own alerts" ON analytics_alerts
  FOR ALL USING (created_by = auth.uid());

-- Time Series Analytics RLS
ALTER TABLE time_series_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time series data" ON time_series_analytics
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert their own time series data" ON time_series_analytics
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Functions for analytics calculations

-- Function to calculate percentiles
CREATE OR REPLACE FUNCTION calculate_percentiles(values NUMERIC[], percentiles NUMERIC[])
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    sorted_values NUMERIC[];
    result JSONB = '{}';
    percentile NUMERIC;
    index INTEGER;
    value NUMERIC;
BEGIN
    -- Sort values
    SELECT array_agg(val ORDER BY val) INTO sorted_values FROM unnest(values) AS val;
    
    -- Calculate each percentile
    FOREACH percentile IN ARRAY percentiles
    LOOP
        index := GREATEST(1, LEAST(array_length(sorted_values, 1), 
                                   ROUND(percentile * array_length(sorted_values, 1))::INTEGER));
        value := sorted_values[index];
        result := result || jsonb_build_object(percentile::TEXT, value);
    END LOOP;
    
    RETURN result;
END;
$$;

-- Function to aggregate time series data
CREATE OR REPLACE FUNCTION aggregate_time_series(
    metric_name TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    granularity TEXT
)
RETURNS TABLE(
    time_bucket TIMESTAMPTZ,
    avg_value NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    sum_value NUMERIC,
    count_value BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date_trunc(granularity, timestamp) AS time_bucket,
        AVG(metric_value) AS avg_value,
        MIN(metric_value) AS min_value,
        MAX(metric_value) AS max_value,
        SUM(metric_value) AS sum_value,
        COUNT(*)::BIGINT AS count_value
    FROM time_series_analytics
    WHERE time_series_analytics.metric_name = aggregate_time_series.metric_name
      AND timestamp >= start_time
      AND timestamp <= end_time
    GROUP BY date_trunc(granularity, timestamp)
    ORDER BY time_bucket;
END;
$$;

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_analytics_updated_at
    BEFORE UPDATE ON workflow_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_performance_stats_updated_at
    BEFORE UPDATE ON user_performance_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictive_insights_updated_at
    BEFORE UPDATE ON predictive_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_dashboards_updated_at
    BEFORE UPDATE ON analytics_dashboards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_alerts_updated_at
    BEFORE UPDATE ON analytics_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE workflow_analytics IS 'Comprehensive analytics data for individual workflow sessions';
COMMENT ON TABLE analytics_metrics IS 'General purpose metrics storage with flexible tagging';
COMMENT ON TABLE user_performance_stats IS 'Aggregated user performance statistics by time period';
COMMENT ON TABLE workflow_benchmarks IS 'Benchmark data for performance comparisons';
COMMENT ON TABLE predictive_insights IS 'AI-generated insights and recommendations';
COMMENT ON TABLE analytics_dashboards IS 'User-customizable analytics dashboards';
COMMENT ON TABLE analytics_exports IS 'Analytics export jobs and results';
COMMENT ON TABLE analytics_alerts IS 'Alert configurations and triggers';
COMMENT ON TABLE time_series_analytics IS 'High-volume time series metrics data';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON workflow_analytics TO authenticated;
GRANT SELECT, INSERT ON analytics_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_performance_stats TO authenticated;
GRANT SELECT ON workflow_benchmarks TO authenticated;
GRANT SELECT ON predictive_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_dashboards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON analytics_exports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_alerts TO authenticated;
GRANT SELECT, INSERT ON time_series_analytics TO authenticated;
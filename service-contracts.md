# Service Contracts Documentation

Generated: 8/8/2025, 12:13:11 AM

## Overview

This document provides comprehensive documentation for all service contracts in EstimatePro, including interfaces, methods, dependencies, and usage examples.

**Total Services**: 38

---

## ai-conversation-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/ai-conversation-service.ts`  
**Description**: No description available

### Interfaces

No public interfaces defined.

### Public Methods

No public methods defined.

### Classes

#### `AIConversationService`

**Public Methods**:

- `async createConversation(userId: string, input?: CreateConversationInput): Promise<AIConversation>`
- `parse(): `

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `ValidationError`
- `AIError`
- `extractError`

### Configuration

No configuration interfaces defined.

---

## ai-predictive-analytics-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/ai-predictive-analytics-service.ts`  
**Description**: AI Predictive Analytics Service Advanced AI-powered analytics with predictive modeling and anomaly detection / Prediction request schema

### Interfaces

#### `PredictionResult`

- `predictionId: string`
- `type: string`
- `predictions: Array<{`
- `date: string`
- `predictedValue: number`
- `confidence: number`
- `factors: Record<string, number>`
- `range: { min`

#### `AnomalyResult`

- `anomalyId: string`
- `detectedAt: string`
- `dataSource: string`
- `anomalies: Array<{`
- `timestamp: string`
- `value: number`
- `expectedValue: number`
- `deviationScore: number`
- `severity: "low" | "medium" | "high" | "critical"`
- `type: "spike" | "drop" | "trend_change" | "pattern_break"`
- `context: Record<string, any>`
- `possibleCauses: string[]`

#### `SeasonalPattern`

- `season: string`
- `multiplier: number`
- `confidence: number`
- `historicalData: Array<{ period`

#### `CustomerSegment`

- `segmentId: string`
- `name: string`
- `characteristics: Record<string, any>`
- `predictedBehavior: {`
- `conversionRate: number`
- `avgOrderValue: number`
- `seasonality: SeasonalPattern[]`

### Public Methods

No public methods defined.

### Classes

#### `AIPredictiveAnalyticsService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: @supabase/ssr, zod

### Input/Output Types

**Input Types**: None  
**Output Types**: PredictionResult, AnomalyResult

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## ai-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/ai-service.ts`  
**Description**: AI service layer for photo analysis and content extraction

### Interfaces

#### `PhotoAnalysisParams`

- `imageUrl: string`
- `analysisType: "building" | "scope" | "damage" | "measurement"`
- `buildingContext?: {`
- `buildingType?: string`
- `stories?: number`
- `address?: string`

#### `ContactExtractionParams`

- `content: string`
- `contentType: "email" | "document" | "message"`

#### `ServiceRecommendationParams`

- `buildingAnalysis: AIAnalysisResult`
- `userPreferences?: string[]`
- `budgetRange?: {`
- `min: number`
- `max: number`

#### `SimilarProjectsParams`

- `projectType: string`
- `budget?: {`
- `min?: number`
- `max?: number`

#### `SimilarProject`

- `id: string`
- `name: string`
- `type: string`
- `totalCost: number`
- `features: string[]`
- `completionDate: string`
- `similarity: number`

#### `AIValidationResult`

- `isValid: boolean`
- `confidence: number`
- `warnings: string[]`
- `suggestions: string[]`

### Public Methods

No public methods defined.

### Classes

#### `AIService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: PhotoAnalysisParams, ContactExtractionParams, ServiceRecommendationParams, SimilarProjectsParams  
**Output Types**: AIValidationResult

### Error Types

- `ConfigurationError`
- `ExternalAPIError`

### Configuration

No configuration interfaces defined.

---

## analytics-cache-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/analytics/analytics-cache-service.ts`  
**Description**: Analytics Cache Service Handles caching, offline support, and retry logic for analytics operations /

### Interfaces

No public interfaces defined.

### Public Methods

No public methods defined.

### Classes

#### `AnalyticsCacheService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `initializeError`
- `retryError`
- `isRetryableError`
- `retryableError`
- `averageError`
- `mostCommonError`

### Configuration

No configuration interfaces defined.

---

## analytics-insights-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/analytics/analytics-insights-service.ts`  
**Description**: Analytics Insights Service Handles predictive analytics, insights generation, and optimization suggestions /

### Interfaces

No public interfaces defined.

### Public Methods

No public methods defined.

### Classes

#### `AnalyticsInsightsService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: @supabase/ssr

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `avgError`
- `generateError`

### Configuration

No configuration interfaces defined.

---

## analytics-stats-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/analytics/analytics-stats-service.ts`  
**Description**: Analytics Statistics Service Handles user and team statistics calculation and retrieval /

### Interfaces

No public interfaces defined.

### Public Methods

No public methods defined.

### Classes

#### `AnalyticsStatsService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: @supabase/ssr

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `averageError`
- `calculateAverageError`
- `mostCommonError`
- `findMostCommonError`

### Configuration

No configuration interfaces defined.

---

## analytics-api-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/analytics-api-service.ts`  
**Description**: Analytics API Service Centralized service for all analytics-related API calls /

### Interfaces

#### `APIError`

- `message: string`
- `code?: string`
- `details?: Record<string, any>`

#### `RequestConfig`

- `retries?: number`
- `retryDelay?: number`
- `timeout?: number`
- `cache?: boolean`
- `cacheTimeout?: number`
- `signal?: AbortSignal`

### Public Methods

- `getAnalyticsAPIService(): AnalyticsAPIService`

### Classes

#### `SimpleCache`

**Public Methods**:

- `set(key: string, data: any, timeout?: number): void`

#### `AnalyticsAPIService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `APIError`
- `lastError`
- `AbortError`

### Configuration

#### `RequestConfig`

- `retries?: number`
- `retryDelay?: number`
- `timeout?: number`
- `cache?: boolean`
- `cacheTimeout?: number`
- `signal?: AbortSignal`

---

## analytics-metrics-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/analytics-metrics-service.ts`  
**Description**: Service for calculating analytics metrics and business insights

### Interfaces

#### `AIMetrics`

- `aiSavedHours: number`
- `photoAccuracy: number`
- `avgEstimateTime: number`
- `automationRate: number`

### Public Methods

No public methods defined.

### Classes

#### `AnalyticsMetricsService`

**Public Methods**:

- `static calculateAIMetrics(data: AnalyticsData | null): AIMetrics`

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## analytics-personalization-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/analytics-personalization-service.ts`  
**Description**: Analytics Personalization Service Provides user preference management and personalized analytics experiences

### Interfaces

#### `UserPreferences`

- `userId: string`
- `dashboardLayout: string[]`
- `favoriteCharts: string[]`
- `defaultTimeRange: string`
- `defaultMetrics: string[]`
- `notifications: {`
- `realTime: boolean`
- `anomalies: boolean`
- `dailyReports: boolean`
- `thresholdAlerts: boolean`

#### `PersonalizationContext`

- `userId: string`
- `role: string`
- `permissions: string[]`
- `lastLogin: string`
- `sessionDuration: number`
- `viewingHistory: {`
- `charts: string[]`
- `metrics: string[]`
- `timeRanges: string[]`

### Public Methods

- `getAnalyticsPersonalizationService(): AnalyticsPersonalizationService`

### Classes

#### `AnalyticsPersonalizationService`

**Public Methods**:

- `async getUserPreferences(userId: string): Promise<UserPreferences>`

### Dependencies

**Internal Services**: None  
**External Libraries**: zod

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## analytics-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/analytics-service.ts`  
**Description**: Advanced Analytics Service Handles workflow analytics data collection, processing, and insights / Using client-compatible supabase

### Interfaces

No public interfaces defined.

### Public Methods

No public methods defined.

### Classes

#### `AnalyticsService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: @supabase/ssr

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `initializeError`
- `retryError`
- `isRetryableError`
- `retryableError`
- `averageError`
- `mostCommonError`
- `fetchError`
- `validationError`
- `updateError`
- `teamError`
- `calculateAverageError`
- `findMostCommonError`

### Configuration

No configuration interfaces defined.

---

## analytics-websocket-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/analytics-websocket-service.ts`  
**Description**: Analytics WebSocket Service Provides real-time data streaming for analytics dashboard

### Interfaces

#### `WebSocketMessage`

- `type: `
- `data: any`
- `timestamp: string`
- `id: string`

#### `AnalyticsSubscription`

- `id: string`
- `metrics: string[]`
- `callback: (data`
- `filters?: Record<string, any>`

### Public Methods

- `getAnalyticsWebSocketService(): AnalyticsWebSocketService`

### Classes

#### `AnalyticsWebSocketService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: zod

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## auto-save-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/auto-save-service.ts`  
**Description**: Enhanced Auto-Save Service with Conflict Resolution Handles automatic saving, version control, and conflict resolution for guided estimation flows

### Interfaces

#### `AutoSaveState`

- `lastSaved: Date`
- `isDirty: boolean`
- `isSaving: boolean`
- `saveError: string | null`
- `conflictDetected: boolean`
- `localVersion: number`
- `serverVersion: number`
- `lastSaveAttempt: Date | null`

#### `SaveVersion`

- `id: string`
- `version: number`
- `data: GuidedFlowData | string`
- `timestamp: Date`
- `userId: string`
- `stepId: string`
- `changeDescription: string`
- `deviceInfo?: {`
- `userAgent: string`
- `platform: string`
- `sessionId: string`

#### `ConflictResolution`

- `strategy: "merge" | "overwrite-local" | "overwrite-server" | "manual"`
- `resolvedData: GuidedFlowData`
- `conflictedFields: string[]`
- `resolutionNotes?: string`

#### `AutoSaveConfig`

- `saveInterval: number // milliseconds` - milliseconds
- `maxRetries: number`
- `retryDelay: number // milliseconds` - milliseconds
- `enableVersionControl: boolean`
- `maxVersions: number`
- `conflictDetectionEnabled: boolean`
- `compressionEnabled: boolean`

### Public Methods

No public methods defined.

### Classes

#### `AutoSaveService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `DatabaseError`
- `AuthError`
- `saveError`
- `lastError`
- `conflictError`
- `estimateError`
- `versionError`
- `cleanupError`
- `selectError`
- `deleteError`

### Configuration

#### `AutoSaveConfig`

- `saveInterval: number // milliseconds` - milliseconds
- `maxRetries: number`
- `retryDelay: number // milliseconds` - milliseconds
- `enableVersionControl: boolean`
- `maxVersions: number`
- `conflictDetectionEnabled: boolean`
- `compressionEnabled: boolean`

---

## calculator-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/calculator-service.ts`  
**Description**: Calculator service layer for all service calculations

### Interfaces

#### `CalculationParams`

- `serviceType: ServiceType`
- `formData: ServiceFormData`
- `buildingContext?: {`
- `stories: number`
- `heightFeet?: number`
- `buildingType?: string`
- `accessDifficulty?: "easy" | "moderate" | "difficult"`

#### `ValidationResult`

- `isValid: boolean`
- `errors: string[]`
- `warnings: string[]`

### Public Methods

No public methods defined.

### Classes

#### `CalculatorService`

**Public Methods**:

- `static calculateService(params: CalculationParams): ServiceCalculationResult`

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: CalculationParams  
**Output Types**: ValidationResult

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## base-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/core/base-service.ts`  
**Description**: Base Service Class Provides common functionality for all service classes /

### Interfaces

#### `ServiceConfig`

- `serviceName: string`
- `enableCaching?: boolean`
- `cacheTimeout?: number // milliseconds` - milliseconds
- `enableRetry?: boolean`
- `maxRetries?: number`
- `retryDelay?: number // milliseconds` - milliseconds
- `enableLogging?: boolean`

### Public Methods

No public methods defined.

### Classes

#### `BaseService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `ServiceError`
- `isRecoverableError`
- `lastError`

### Configuration

#### `ServiceConfig`

- `serviceName: string`
- `enableCaching?: boolean`
- `cacheTimeout?: number // milliseconds` - milliseconds
- `enableRetry?: boolean`
- `maxRetries?: number`
- `retryDelay?: number // milliseconds` - milliseconds
- `enableLogging?: boolean`

---

## cross-step-population-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/cross-step-population-service.ts`  
**Description**: Cross-step data population service for auto-populating subsequent steps Based on AI-extracted data from Initial Contact step

### Interfaces

#### `CrossStepPopulationOptions`

- `enableServiceSuggestions?: boolean`
- `enableScopeGeneration?: boolean`
- `enableAddressValidation?: boolean`
- `enableTimelineEstimation?: boolean`

#### `PopulationResult`

- `success: boolean`
- `populatedSteps: string[]`
- `confidence: number`
- `warnings: string[]`
- `suggestions: string[]`

### Public Methods

No public methods defined.

### Classes

#### `CrossStepPopulationService`

**Public Methods**:

- `async populateFromExtractedData(flowData: GuidedFlowData, options: CrossStepPopulationOptions = {}): Promise<`

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: PopulationResult

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## cross-step-validation-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/cross-step-validation-service.ts`  
**Description**: Cross-Step Validation Service Handles validation that spans multiple steps and updates when dependencies change

### Interfaces

#### `CrossStepValidationResult`

- `isValid: boolean`
- `warnings: ValidationWarning[]`
- `errors: ValidationError[]`
- `suggestions: ValidationSuggestion[]`
- `blockedSteps: string[]`
- `confidence: "high" | "medium" | "low"`
- `lastValidated: Date`

#### `ValidationWarning`

- `id: string`
- `type: "inconsistency" | "optimization" | "risk" | "dependency"`
- `severity: "low" | "medium" | "high"`
- `message: string`
- `affectedSteps: string[]`
- `suggestedAction?: string`
- `canAutoFix: boolean`
- `autoFixAction?: () => void`

#### `ValidationError`

- `id: string`
- `type: "required" | "invalid" | "conflict" | "dependency"`
- `severity: "warning" | "error" | "critical"`
- `field: string`
- `stepId: string`
- `message: string`
- `expectedValue?: any`
- `currentValue?: any`
- `blocksProgression: boolean`

#### `ValidationSuggestion`

- `id: string`
- `type: "optimization" | "consistency" | "efficiency" | "accuracy"`
- `priority: "low" | "medium" | "high"`
- `message: string`
- `targetStep: string`
- `targetField?: string`
- `suggestedValue?: any`
- `reasoning: string`
- `potentialImpact: string`

#### `ValidationRule`

- `id: string`
- `name: string`
- `description: string`
- `dependsOn: string[] // step IDs` - step IDs
- `validator: (data`
- `priority: "low" | "medium" | "high" | "critical"`
- `autoFix?: (data`

#### `CrossStepValidationConfig`

- `enableRealTimeValidation: boolean`
- `enableAutoFix: boolean`
- `validationInterval: number // milliseconds` - milliseconds
- `priorityThreshold: "low" | "medium" | "high" | "critical"`

### Public Methods

No public methods defined.

### Classes

#### `CrossStepValidationService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: CrossStepValidationResult

### Error Types

- `ValidationError`
- `ServiceValidationError`
- `ServiceError`
- `allError`

### Configuration

#### `CrossStepValidationConfig`

- `enableRealTimeValidation: boolean`
- `enableAutoFix: boolean`
- `validationInterval: number // milliseconds` - milliseconds
- `priorityThreshold: "low" | "medium" | "high" | "critical"`

---

## data-quality-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/data-quality-service.ts`  
**Description**: Comprehensive Data Quality Framework Provides data validation, quality scoring, and automated data cleansing / Data quality assessment schema

### Interfaces

#### `QualityDimension`

- `dimension: string`
- `score: number`
- `issues: QualityIssue[]`
- `recommendations: string[]`

#### `QualityIssue`

- `type: `
- `severity: "low" | "medium" | "high" | "critical"`
- `field: string`
- `count: number`
- `examples: string[]`
- `impact: string`

#### `DataQualityReport`

- `dataSource: string`
- `overallScore: number`
- `dimensions: QualityDimension[]`
- `totalRecords: number`
- `qualityIssues: QualityIssue[]`
- `recommendations: string[]`
- `cleansingSuggestions: DataCleansingRule[]`
- `complianceStatus: "compliant" | "warning" | "non_compliant"`
- `timestamp: string`

#### `DataCleansingRule`

- `id: string`
- `type: `
- `field: string`
- `condition: string`
- `action: string`
- `priority: number`
- `estimatedImpact: number`

#### `ValidationRule`

- `field: string`
- `type: "required" | "format" | "range" | "enum" | "custom"`
- `condition: any`
- `errorMessage: string`

### Public Methods

No public methods defined.

### Classes

#### `DataQualityService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: @supabase/ssr, zod

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## dependency-tracking-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/dependency-tracking-service.ts`  
**Description**: Dependency Tracking Service Manages automatic recalculations when dependencies change

### Interfaces

#### `DependencyRule`

- `id: string`
- `sourceStep: string`
- `sourceField: string`
- `targetSteps: string[]`
- `type: "auto-populate" | "recalculate" | "validate" | "clear"`
- `priority: "low" | "medium" | "high" | "critical"`
- `condition?: (value`
- `transformer?: (value`

#### `DependencyUpdate`

- `sourceStep: string`
- `sourceField: string`
- `value: any`
- `affectedSteps: string[]`
- `updateType: "auto-populate" | "recalculate" | "validate" | "clear"`
- `timestamp: Date`

#### `DependencyTrackingConfig`

- `enableAutoPopulation: boolean`
- `enableRecalculation: boolean`
- `enableValidation: boolean`
- `debounceMs: number`
- `priorityThreshold: "low" | "medium" | "high" | "critical"`

### Public Methods

No public methods defined.

### Classes

#### `DependencyTrackingService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `ServiceError`

### Configuration

#### `DependencyTrackingConfig`

- `enableAutoPopulation: boolean`
- `enableRecalculation: boolean`
- `enableValidation: boolean`
- `debounceMs: number`
- `priorityThreshold: "low" | "medium" | "high" | "critical"`

---

## equipment-materials-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/equipment-materials-service.ts`  
**Description**: Dynamic Equipment and Materials Service Replaces hardcoded static data with configurable, updateable data sources

### Interfaces

#### `EquipmentItem`

- `id: string`
- `category: string`
- `name: string`
- `description: string`
- `manufacturer?: string`
- `model?: string`
- `dailyRate: number`
- `weeklyRate?: number`
- `monthlyRate?: number`
- `replacementCost?: number`
- `specifications: Record<string, any>`
- `availabilityStatus: "available" | "unavailable" | "maintenance"`
- `vendors: EquipmentVendor[]`

#### `EquipmentVendor`

- `id: string`
- `name: string`
- `contactEmail?: string`
- `contactPhone?: string`
- `website?: string`
- `rating?: number`
- `dailyRate?: number`
- `weeklyRate?: number`
- `monthlyRate?: number`
- `deliveryFee?: number`
- `pickupFee?: number`
- `minimumRentalDays?: number`

#### `MaterialItem`

- `id: string`
- `category: string`
- `name: string`
- `description: string`
- `brand?: string`
- `sku?: string`
- `unitOfMeasure: string`
- `costPerUnit: number`
- `coverageRate?: number`
- `dilutionRatio?: string`
- `environmentalImpactRating?: "low" | "medium" | "high"`
- `specifications: Record<string, any>`
- `vendors: MaterialVendor[]`

#### `MaterialVendor`

- `id: string`
- `name: string`
- `contactEmail?: string`
- `contactPhone?: string`
- `rating?: number`
- `costPerUnit: number`
- `minimumQuantity?: number`
- `bulkDiscountThreshold?: number`
- `bulkDiscountRate?: number`
- `leadTimeDays?: number`
- `deliveryFee?: number`

#### `CompetitorProfile`

- `id: string`
- `region: string`
- `name: string`
- `tier: "budget" | "standard" | "premium" | "luxury"`
- `marketShare: number`
- `averagePricingMultiplier: number`
- `strengths: string[]`
- `weaknesses: string[]`
- `website?: string`
- `servicePricing: Record<`
- `basePrice?: number`
- `pricePerSqft?: number`
- `pricePerHour?: number`
- `minimumPrice?: number`
- `confidenceLevel: "low" | "medium" | "high"`

#### `MarketData`

- `region: string`
- `costOfLivingMultiplier: number`
- `competitors: CompetitorProfile[]`
- `averageWages: {`
- `entry: number`
- `experienced: number`
- `supervisor: number`

### Public Methods

No public methods defined.

### Classes

#### `EquipmentMaterialsService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## error-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/error-service.ts`  
**Description**: Centralized Error Service Handles all error logging, monitoring, and reporting across the application /

### Interfaces

#### `ErrorContext`

- `component?: string`
- `action?: string`
- `userId?: string`
- `metadata?: Record<string, any>`

#### `ErrorLog`

- `message: string`
- `error: Error | unknown`
- `severity: ErrorSeverity`
- `category: ErrorCategory`
- `context?: ErrorContext`
- `timestamp: Date`

### Public Methods

No public methods defined.

### Classes

#### `ErrorService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `initializeError`
- `logError`
- `handleProductionError`
- `handleDevelopmentError`
- `processCriticalError`
- `criticalError`
- `logNetworkError`
- `logValidationError`
- `logBusinessError`
- `logSystemError`
- `logUserError`
- `processError`
- `clearError`

### Configuration

No configuration interfaces defined.

---

## estimate-crud-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/estimate-crud-service.ts`  
**Description**: CRUD operations service for estimates Extracted from monolithic estimate-service.ts for better separation of concerns

### Interfaces

#### `EstimateCreationParams`

- `customerName: string`
- `customerEmail: string`
- `customerPhone: string`
- `companyName?: string`
- `buildingName: string`
- `buildingAddress: string`
- `buildingHeightStories: number`
- `buildingHeightFeet?: number`
- `buildingType?: string`
- `notes?: string`
- `services: EstimateService[]`

### Public Methods

No public methods defined.

### Classes

#### `EstimateCrudService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: EstimateCreationParams  
**Output Types**: None

### Error Types

- `estimateError`
- `servicesError`
- `webhookError`

### Configuration

No configuration interfaces defined.

---

## estimate-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/estimate-service.ts`  
**Description**: Business logic service layer for estimates

### Interfaces

#### `EstimateValidationResult`

- `isValid: boolean`
- `errors: string[]`
- `warnings: string[]`

#### `EstimateCreationParams`

- `customerName: string`
- `customerEmail: string`
- `customerPhone: string`
- `companyName?: string`
- `buildingName: string`
- `buildingAddress: string`
- `buildingHeightStories: number`
- `buildingHeightFeet?: number`
- `buildingType?: string`
- `notes?: string`
- `services: EstimateService[]`

### Public Methods

No public methods defined.

### Classes

#### `EstimateBusinessService`

**Public Methods**:

- `static validateEstimate(params: EstimateCreationParams): EstimateValidationResult` - Validation methods

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: EstimateCreationParams  
**Output Types**: EstimateValidationResult

### Error Types

- `ValidationError`
- `DatabaseError`
- `AuthError`
- `BusinessLogicError`
- `NotFoundError`
- `serviceError`
- `estimateError`
- `servicesError`
- `webhookError`

### Configuration

No configuration interfaces defined.

---

## estimate-validation-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/estimate-validation-service.ts`  
**Description**: Validation service for estimates Extracted from monolithic estimate-service.ts for better separation of concerns

### Interfaces

#### `EstimateValidationResult`

- `isValid: boolean`
- `errors: string[]`
- `warnings: string[]`

#### `EstimateCreationParams`

- `customerName: string`
- `customerEmail: string`
- `customerPhone: string`
- `companyName?: string`
- `buildingName: string`
- `buildingAddress: string`
- `buildingHeightStories: number`
- `buildingHeightFeet?: number`
- `buildingType?: string`
- `notes?: string`
- `services: EstimateService[]`

### Public Methods

No public methods defined.

### Classes

#### `EstimateValidationService`

**Public Methods**:

- `static validateEstimate(params: EstimateCreationParams): EstimateValidationResult`

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: EstimateCreationParams  
**Output Types**: EstimateValidationResult

### Error Types

- `serviceError`

### Configuration

No configuration interfaces defined.

---

## external-bi-integration-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/external-bi-integration-service.ts`  
**Description**: External Business Intelligence Integration Service Provides seamless integration with popular BI tools and data platforms

### Interfaces

#### `BIConnection`

- `id: string`
- `name: string`
- `type: "tableau" | "powerbi" | "looker" | "metabase" | "grafana" | "superset"`
- `endpoint: string`
- `credentials: {`
- `type: "api_key" | "oauth" | "basic_auth" | "token"`
- `config: Record<string, any>`

#### `DataExportRequest`

- `connectionId: string`
- `exportType: "full" | "incremental" | "snapshot"`
- `dataSource: string`
- `format: "json" | "csv" | "parquet" | "sql"`
- `filters?: Record<string, any>`
- `transformations?: DataTransformation[]`
- `schedule?: ScheduleConfig`

#### `DataTransformation`

- `type: "filter" | "aggregate" | "join" | "pivot" | "calculate"`
- `config: Record<string, any>`

#### `ScheduleConfig`

- `frequency: "hourly" | "daily" | "weekly" | "monthly"`
- `interval: number`
- `timeZone: string`
- `startTime: string`

#### `WebhookEndpoint`

- `id: string`
- `connectionId: string`
- `url: string`
- `events: string[]`
- `secret?: string`
- `isActive: boolean`
- `retryPolicy: {`
- `maxRetries: number`
- `backoffMultiplier: number`
- `initialDelay: number`

#### `SyncLog`

- `id: string`
- `connectionId: string`
- `type: "export" | "import" | "webhook"`
- `status: "pending" | "success" | "failed" | "partial"`
- `startTime: string`
- `endTime?: string`
- `recordsProcessed: number`
- `errorMessage?: string`
- `metadata?: Record<string, any>`

### Public Methods

- `getExternalBIIntegrationService(): ExternalBIIntegrationService`

### Classes

#### `ExternalBIIntegrationService`

**Public Methods**:

- `async createConnection(connectionData: Omit<BIConnection): Promise<string>`

### Dependencies

**Internal Services**: None  
**External Libraries**: zod

### Input/Output Types

**Input Types**: DataExportRequest  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

#### `ScheduleConfig`

- `frequency: "hourly" | "daily" | "weekly" | "monthly"`
- `interval: number`
- `timeZone: string`
- `startTime: string`

---

## facade-analysis-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/facade-analysis-service.ts`  
**Description**: No description available

### Interfaces

No public interfaces defined.

### Public Methods

No public methods defined.

### Classes

#### `FacadeAnalysisService`

**Public Methods**:

- `async analyzeImageSimple(imageUrl: string, analysisType: "facade" | "general" | "measurement" = "facade", userId?: string): Promise<any>` - Simplified analyze method for AI tool integration

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## monitoring-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/monitoring-service.ts`  
**Description**: Monitoring Service Client Provides real-time system metrics and health data API response interfaces

### Interfaces

#### `MonitoringMetricsResponse`

- `current?: SystemMetrics`
- `history?: SystemMetrics[]`
- `health?: {`
- `checks: HealthCheck[]`
- `status: "healthy" | "warning" | "critical"`

#### `Alert`

- `id: string`
- `type: string`
- `severity: "info" | "warning" | "critical"`
- `message: string`
- `timestamp: number`
- `resolved?: boolean`
- `acknowledgedBy?: string`
- `details?: any`

#### `MonitoringConfig`

- `enabled: boolean`
- `interval: number`
- `retentionDays: number`
- `autoRefresh: boolean`
- `refreshInterval: number`
- `alertThresholds: {`
- `cpu: { warning`

### Public Methods

No public methods defined.

### Classes

#### `MonitoringService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: react

### Input/Output Types

**Input Types**: None  
**Output Types**: MonitoringMetricsResponse

### Error Types

- `totalError`
- `AbortError`
- `setError`

### Configuration

#### `MonitoringConfig`

- `enabled: boolean`
- `interval: number`
- `retentionDays: number`
- `autoRefresh: boolean`
- `refreshInterval: number`
- `alertThresholds: {`
- `cpu: { warning`

---

## performance-optimization-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/performance-optimization-service.ts`  
**Description**: Performance Optimization Service Tracks and manages performance improvements /

### Interfaces

#### `PerformanceMetric`

- `name: string`
- `value: number`
- `timestamp: number`
- `context?: Record<string, any>`
- `userId?: string`
- `sessionId?: string`

### Public Methods

No public methods defined.

### Classes

#### `PerformanceOptimizationService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## photo-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/photo-service.ts`  
**Description**: No description available

### Interfaces

#### `PhotoData`

- `id: string`
- `estimate_id: string`
- `file_name: string`
- `file_path: string`
- `storage_path?: string`
- `file_size: number`
- `mime_type: string`
- `analysis_data: any`
- `ai_analysis: any`
- `tags: string[] | null`
- `is_analyzed: boolean | null`
- `uploaded_by: string`
- `created_at: string`
- `updated_at: string`

#### `PhotoAnalysisData`

- `id: string`
- `photo_id: string`
- `analysis_type: string`
- `analysis_data: Record<string, any> // Changed from 'results' to match database schema` - Changed from 'results' to match database schema
- `confidence?: number`
- `processing_time_ms?: number`
- `processed_at: string`

#### `PhotoUploadOptions`

- `estimateId?: string`
- `compress?: boolean`
- `maxSizeMB?: number`

#### `AnalysisProgress`

- `totalPhotos: number`
- `processedPhotos: number`
- `currentStep: string`
- `isComplete: boolean`
- `errors: string[]`

### Public Methods

No public methods defined.

### Classes

#### `PhotoService`

**Public Methods**:

- `async uploadPhotos(files: File[], userId: string, options: PhotoUploadOptions = {}): Promise<PhotoData[]>`

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `uploadError`
- `dbError`
- `photoError`
- `analysisError`
- `fetchError`
- `storageError`

### Configuration

No configuration interfaces defined.

---

## pilot-service-client

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/pilot-service-client.ts`  
**Description**: Pilot Service Client Client-safe version of pilot service without server-side dependencies /

### Interfaces

#### `PilotCertification`

- `id: string`
- `pilotId: string`
- `pilotName: string`
- `licenseNumber: string`
- `certifications: string[]`
- `expiryDate: Date`
- `flightHours: number`
- `isActive: boolean`
- `lastMedicalExam?: Date`
- `restrictions?: string[]`

#### `PilotQualificationCheck`

- `qualified: boolean`
- `issues: string[]`
- `warnings: string[]`
- `certificationStatus: "valid" | "expiring_soon" | "expired" | "missing"`

### Public Methods

No public methods defined.

### Classes

#### `PilotServiceClient`

**Public Methods**:

- `async getPilotCertification(userId: string): Promise<PilotCertification | null>`

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## pilot-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/pilot-service.ts`  
**Description**: Pilot Service Manages drone pilot certifications, licenses, and qualification validation /

### Interfaces

#### `PilotCertification`

- `id: string`
- `pilotId: string`
- `pilotName: string`
- `licenseNumber: string`
- `certifications: string[]`
- `expiryDate: Date`
- `flightHours: number`
- `isActive: boolean`
- `lastMedicalExam?: Date`
- `restrictions?: string[]`

#### `PilotQualificationCheck`

- `qualified: boolean`
- `issues: string[]`
- `warnings: string[]`
- `certificationStatus: "valid" | "expiring_soon" | "expired" | "missing"`

### Public Methods

No public methods defined.

### Classes

#### `PilotService`

**Public Methods**:

- `async getPilotCertification(userId: string): Promise<PilotCertification | null>`

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## real-time-pricing-service-v2

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/real-time-pricing-service-v2.ts`  
**Description**: Real-time Pricing Service V2 Improved version without singleton pattern, with better performance and type safety /

### Interfaces

No public interfaces defined.

### Public Methods

No public methods defined.

### Classes

#### `RealTimePricingServiceV2`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

- `PricingError`
- `originalError`

### Configuration

No configuration interfaces defined.

---

## real-time-pricing-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/real-time-pricing-service.ts`  
**Description**: Real-time Pricing Service Provides live cost calculations and updates throughout the guided workflow

### Interfaces

#### `RealTimePricingResult`

- `totalCost: number`
- `totalHours: number`
- `totalArea: number`
- `serviceBreakdown: ServicePricingBreakdown[]`
- `adjustments: PricingAdjustment[]`
- `confidence: "high" | "medium" | "low"`
- `missingData: string[]`
- `warnings: string[]`
- `lastUpdated: Date`

#### `ServicePricingBreakdown`

- `serviceType: ServiceType`
- `serviceName: string`
- `basePrice: number`
- `adjustedPrice: number`
- `hours: number`
- `area: number`
- `confidence: "high" | "medium" | "low"`
- `calculations?: ServiceCalculationResult`
- `dependencies?: string[]`

#### `PricingAdjustment`

- `type: `
- `description: string`
- `value: number`
- `isPercentage: boolean`
- `appliedTo: "total" | "labor" | "materials" | ServiceType`

#### `PricingDependency`

- `stepId: string`
- `fieldPath: string`
- `affects: string[]`
- `validator?: (value`

#### `RealTimePricingConfig`

- `updateInterval: number // Update interval in milliseconds` - Update interval in milliseconds
- `enableLiveUpdates: boolean`
- `confidenceThreshold: number // Confidence threshold between 0-1` - Confidence threshold between 0-1
- `includeRiskAdjustments: boolean`
- `enableDependencyTracking: boolean`

### Public Methods

No public methods defined.

### Classes

#### `RealTimePricingService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: RealTimePricingResult

### Error Types

No custom errors defined.

### Configuration

#### `RealTimePricingConfig`

- `updateInterval: number // Update interval in milliseconds` - Update interval in milliseconds
- `enableLiveUpdates: boolean`
- `confidenceThreshold: number // Confidence threshold between 0-1` - Confidence threshold between 0-1
- `includeRiskAdjustments: boolean`
- `enableDependencyTracking: boolean`

---

## risk-assessment-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/risk-assessment-service.ts`  
**Description**: No description available

### Interfaces

#### `RiskFactor`

- `category: string`
- `description: string`
- `severity: "low" | "medium" | "high" | "critical"`
- `mitigation: string`

#### `RiskAssessment`

- `projectDescription: string`
- `overallRisk: "low" | "medium" | "high" | "critical"`
- `factors: RiskFactor[]`
- `recommendations: string[]`
- `confidenceScore: number`

### Public Methods

No public methods defined.

### Classes

#### `RiskAssessmentService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## session-recovery-service-client

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/session-recovery-service-client.ts`  
**Description**: Client-safe Session Recovery Service Provides browser-based session recovery without server dependencies

### Interfaces

#### `SessionDraft`

- `id: string`
- `estimateId: string`
- `data: Partial<GuidedFlowData>`
- `timestamp: number`
- `tabId: string`
- `pageUrl: string`
- `isActive: boolean`
- `lastActiveStep?: string`
- `completedSteps?: string[]`
- `version: number`

#### `RecoveryState`

- `status: `
- `message?: string`
- `timestamp?: number`

#### `RecoveryOptions`

- `maxDrafts: number`
- `maxAge: number // milliseconds` - milliseconds
- `checkInterval: number`
- `mergeStrategy: "newest" | "mostComplete" | "manual"`

### Public Methods

No public methods defined.

### Classes

#### `SessionRecoveryServiceClient`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## session-recovery-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/session-recovery-service.ts`  
**Description**: Session Recovery Service Handles browser tab recovery, draft management, and session restoration

### Interfaces

#### `SessionDraft`

- `id: string`
- `estimateId: string | null`
- `userId: string`
- `sessionId: string`
- `currentStep: string`
- `data: GuidedFlowData`
- `progress: {`
- `completedSteps: string[]`
- `currentStepIndex: number`
- `totalSteps: number`
- `progressPercentage: number`

#### `RecoveryOptions`

- `maxDraftAge: number // hours` - hours
- `maxRecoveryAttempts: number`
- `autoCleanupEnabled: boolean`
- `notificationEnabled: boolean`
- `persistenceStrategy: "localStorage" | "indexedDB" | "both"`

#### `RecoveryState`

- `hasRecoverableSessions: boolean`
- `availableDrafts: SessionDraft[]`
- `currentSession?: SessionDraft`
- `lastRecoveryCheck: Date`
- `recoveryInProgress: boolean`

### Public Methods

No public methods defined.

### Classes

#### `SessionRecoveryService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## vendor-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/vendor-service.ts`  
**Description**: Vendor Service Manages equipment vendors, materials suppliers, and pricing data from database /

### Interfaces

#### `Vendor`

- `id: string`
- `name: string`
- `type: "equipment" | "materials" | "both"`
- `rating: number`
- `reliability: number`
- `preferredVendor: boolean`
- `contact: {`
- `name?: string | null`
- `phone?: string | null`
- `email?: string | null`
- `address?: string | null`

#### `VendorPricing`

- `vendorId: string`
- `equipmentId?: string`
- `materialId?: string`
- `dailyRate?: number`
- `weeklyRate?: number`
- `monthlyRate?: number`
- `unitCost?: number`
- `available: boolean`
- `leadTime?: number`
- `minOrder?: number`
- `deliveryCharge?: number`
- `bulkDiscounts?: { quantity`

#### `EquipmentWithVendors`

- `id: string`
- `name: string`
- `category: string`
- `description: string`
- `dailyRate: number`
- `weeklyRate?: number`
- `monthlyRate?: number`
- `vendors: VendorPricing[]`

#### `MaterialWithVendors`

- `id: string`
- `name: string`
- `category: string`
- `unit: string`
- `unitCost: number`
- `vendors: VendorPricing[]`

### Public Methods

No public methods defined.

### Classes

#### `VendorService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

---

## webhook-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/webhook-service.ts`  
**Description**: No description available

### Interfaces

No public interfaces defined.

### Public Methods

No public methods defined.

### Classes

#### `WebhookService`

**Public Methods**:

- `static getInstance(): WebhookService`

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: None

### Error Types

No custom errors defined.

### Configuration

No configuration interfaces defined.

### Examples

```typescript
.com",
          phone: "+1234567890",
          created_at: new Date().toISOString(),
        };
      case "payment":
        return {
          id: "sample-payment-id",
          amount: 500.0,
          currency: "USD",
          status: action === "failed" ? "failed" : "succeeded",
          created_at: new Date().toISOString(),
        };
      default:
        return {
          id: "sample-id",
          event: eventType,
          timestamp: new Date().toISOString(),
        };
    }
  }

  /**
   * Validate webhook events selection
```

---

## workflow-service

**File**: `/home/prfowler/Projects/estimatepro_2.5/lib/services/workflow-service.ts`  
**Description**: Workflow service layer for guided estimation flows

### Interfaces

#### `WorkflowStep`

- `id: string`
- `title: string`
- `description: string`
- `isRequired: boolean`
- `isCompleted: boolean`
- `data?: any`
- `validationRules?: ValidationRule[]`
- `conditionalRules?: ConditionalRule[]`
- `estimatedDuration?: number // Minutes` - Minutes
- `category?: "data-collection" | "analysis" | "calculation" | "review"`
- `dependencies?: string[] // Step IDs this step depends on` - Step IDs this step depends on
- `allowParallel?: boolean // Can be worked on while other steps are incomplete` - Can be worked on while other steps are incomplete

#### `ValidationRule`

- `field: string`
- `type: "required" | "minLength" | "maxLength" | "pattern" | "custom"`
- `value?: any`
- `message: string`
- `validator?: (value`

#### `ConditionalRule`

- `id: string`
- `condition: ConditionExpression`
- `action: ConditionalAction`
- `priority: number // Higher numbers execute first` - Higher numbers execute first

#### `ConditionExpression`

- `type: `
- `field?: string`
- `value?: any`
- `operator?: `
- `conditions?: ConditionExpression[] // For composite conditions` - For composite conditions
- `logic?: "and" | "or" // For composite conditions` - For composite conditions

#### `ConditionalAction`

- `type: `
- `targetStep?: string`
- `data?: any`
- `message?: string`

#### `StepNavigationResult`

- `canNavigate: boolean`
- `nextStep?: WorkflowStep`
- `skipReason?: string`
- `requiredActions?: ConditionalAction[]`
- `warnings?: string[]`

#### `WorkflowProgress`

- `currentStep: number`
- `totalSteps: number`
- `completedSteps: string[]`
- `availableSteps: string[]`
- `completionPercentage: number`

#### `WorkflowValidationResult`

- `isValid: boolean`
- `errors: Record<string, string[]>`
- `warnings: Record<string, string[]>`
- `canProceed: boolean`

### Public Methods

No public methods defined.

### Classes

#### `WorkflowService`

**Public Methods**:

### Dependencies

**Internal Services**: None  
**External Libraries**: None

### Input/Output Types

**Input Types**: None  
**Output Types**: StepNavigationResult, WorkflowValidationResult

### Error Types

- `fieldError`
- `allError`

### Configuration

No configuration interfaces defined.

---

_Generated by EstimatePro Service Contract Generator_

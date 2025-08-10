# API Reference Documentation

Generated: 8/8/2025, 12:13:11 AM

## Overview

This document provides comprehensive API reference for all HTTP endpoints in EstimatePro.

**Total Endpoints**: 48

---

## GET, DELETE /ai/analytics

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/analytics/route.ts`  
**Description**: Query parameter schemas

### Methods

- **GET**
- **DELETE**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

```typescript
{
  type: z.enum(["summary" "user", "dashboard", "export"]).default("summary"), // Required
  startDate: z.string().optional() // Optional
  endDate: z.string().optional() // Optional
  userId: z.string().optional() // Optional
  format: z.enum(["json" "csv"]).default("json"), // Required
  page: z // Required
  .transform((val) => (val ? parseInt(val, 10): 1)) // Required
  limit: z // Required
  .transform((val) => (val ? parseInt(val, 10): 50)) // Required
}
```

### Response Format

## No response format documented

## GET, POST /ai/analyze-facade

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/analyze-facade/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      success: true,
      result,
      processedAt: new Date().toISOString(),

```

---

## POST /ai/assistant

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/assistant/route.ts`  
**Description**: No description available

### Methods

- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- validation
- authentication

### Request Schema

```typescript
{
  message: z.string().min(1).max(4000 "Message too long"), // Required
  context: z.record(z.unknown()).optional() // Optional
  mode: z // Required
  conversationId: z.string().uuid().optional() // Optional
}
```

### Response Format

## No response format documented

## GET, POST /ai/competitive-intelligence

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/competitive-intelligence/route.ts`  
**Description**: Zod schema for competitive intelligence request

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- validation
- rate-limiting
- authentication

### Request Schema

```typescript
{
  competitorContent: z.string().min(1).max(50000 "Content too large"), // Required
  options: z // Required
  focusAreas: z // Required
  compareToOwnPricing: z.boolean().optional() // Optional
}
```

### Response Format

**JSON**:

```json

      success: true,
      analysis,
      processedAt: new Date().toISOString(),

```

**JSON**:

```json

    message: "Competitive intelligence analysis endpoint",
    methods: ["POST"],
    required_fields: ["competitorContent"],
    description:
      "Analyze competitor quotes and proposals for market intelligence",
    output_fields: [
      "extraction: standard project data extraction",
      "competitive.competitors: list of competitor companies",
      "competitive.pricingStrategy: observed pricing approach",
      "competitive.serviceOfferings: services they offer",
      "competitive.strengthsWeaknesses: competitive advantages/disadvantages",
      "competitive.marketRates: service pricing ranges observed",
      "competitive.differentiators: unique selling points",
      "competitive.threats: competitive threats identified",
      "competitive.opportunities: market gaps identified",
    ],

```

---

## GET, PUT, DELETE /ai/conversations/:id

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/conversations/[id]/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **PUT**
- **DELETE**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json
 success: true
```

---

## GET, POST /ai/conversations

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/conversations/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

## No response format documented

## GET, POST /ai/enhanced-photo-analysis

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/enhanced-photo-analysis/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- rate-limiting
- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      success: true,
      action,
      result,
      processedAt: new Date().toISOString(),

```

---

## GET, POST /ai/extract-documents

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/extract-documents/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      success: true,
      data: extractedData,
      extractionType: imageUrl ? "image_ocr" : "document_text",
      processedAt: new Date().toISOString(),

```

---

## POST /ai/facade-analysis

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/facade-analysis/route.ts`  
**Description**: No description available

### Methods

- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- rate-limiting
- authentication

### Request Schema

```typescript
{
  imageUrl: z.string().url() // Required
  imageType: z.enum(["aerial" "ground", "drone", "satellite"]), // Required
  viewAngle: z.enum(["front" "rear", "left", "right", "oblique", "top"]), // Required
  existingAnalysis: z // Required
  building_type: z.string().optional() // Optional
  building_address: z.string().optional() // Optional
}
```

### Response Format

**JSON**:

```json

        result: cached,
        cached: true,

```

---

## GET, POST /ai/follow-up-automation

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/follow-up-automation/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      success: true,
      action,
      result,
      processedAt: new Date().toISOString(),

```

---

## GET, POST /ai/metrics

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/metrics/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

## No response format documented

## GET, POST /ai/risk-assessment

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/risk-assessment/route.ts`  
**Description**: Zod schema for risk assessment request

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- validation
- rate-limiting
- authentication

### Request Schema

```typescript
{
  customer: z.object({ // Required
  name: z.string().optional() // Optional
  email: z.string().email().optional() // Optional
  phone: z.string().optional() // Optional
  company: z.string().optional() // Optional
  address: z.string().optional() // Optional
}
```

```typescript
{
  description: z.string().optional(); // Optional
  services: z.array(z.string()).optional(); // Optional
  specialRequests: z.array(z.string()).optional(); // Optional
  constraints: z.string().optional(); // Optional
}
```

```typescript
{
  extractedData: extractedDataSchema; // Required
  projectContext: z.string().max(5000).optional(); // Optional
}
```

### Response Format

**JSON**:

```json

      success: true,
      riskAssessment,
      processedAt: new Date().toISOString(),

```

**JSON**:

```json

    message: "Project risk assessment endpoint",
    methods: ["POST"],
    required_fields: ["extractedData"],
    optional_fields: ["projectContext"],
    description:
      "Analyze project data for potential risks and provide mitigation strategies",
    output_fields: [
      "riskScore: overall risk rating (1-10)",
      "riskFactors: detailed risk analysis by category",
      "recommendations: strategic recommendations",
      "pricing_adjustments: suggested service pricing multipliers",
    ],
    risk_categories: [
      "timeline: scheduling and deadline risks",
      "budget: financial and payment risks",
      "technical: complexity and skill risks",
      "safety: worker and site safety risks",
      "weather: environmental condition risks",
      "access: site access and logistics risks",
      "regulatory: compliance and permit risks",
      "customer: client-related risks",
    ],

```

---

## POST /ai/template-recommendations

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/template-recommendations/route.ts`  
**Description**: Validation schema

### Methods

- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- rate-limiting
- authentication

### Request Schema

```typescript
{
  buildingType: z.string().optional(); // Optional
  services: z.array(z.string()).optional(); // Optional
  constraints: z.record(z.any()).optional(); // Optional
}
```

### Response Format

**JSON**:

```json

      success: true,
      recommendations,

```

---

## GET, POST /ai/usage

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/ai/usage/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- rate-limiting
- authentication

### Request Schema

No request validation schema defined

### Response Format

## No response format documented

## GET, POST, PUT, DELETE /analytics/bi-integration

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/analytics/bi-integration/route.ts`  
**Description**: BI Integration API Endpoint Provides REST API for managing business intelligence tool integrations Request validation schemas

### Methods

- **GET**
- **POST**
- **PUT**
- **DELETE**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

```typescript
{
  name: z.string().min(1 "Connection name is required"), // Required
  type: z.enum([ // Required
  endpoint: z.string().url("Valid endpoint URL is required") // Required
  credentials: z.object({ // Required
  type: z.enum(["api_key" "oauth", "basic_auth", "token"]), // Required
  config: z.record(z.any()) // Required
}
```

```typescript
{
  connectionId: z.string() // Required
  exportType: z.enum(["full" "incremental", "snapshot"]), // Required
  dataSource: z.string() // Required
  format: z.enum(["json" "csv", "parquet", "sql"]), // Required
  filters: z.record(z.any()).optional() // Optional
  transformations: z.array(z.any()).optional() // Optional
  schedule: z // Required
  frequency: z.enum(["hourly" "daily", "weekly", "monthly"]), // Required
  interval: z.number() // Required
  timeZone: z.string() // Required
  startTime: z.string() // Required
}
```

```typescript
{
  connectionId: z.string() // Required
  streamConfig: z.object({ // Required
  webhookUrl: z.string().url() // Required
  events: z.array(z.string()) // Required
  secret: z.string().optional() // Optional
  batchSize: z.number().optional() // Optional
  bufferTimeout: z.number().optional() // Optional
}
```

```typescript
{
  connectionId: z.string() // Required
  dashboardConfig: z.object({ // Required
  dashboardId: z.string() // Required
  reportId: z.string().optional() // Optional
  workbook: z.string().optional() // Optional
  view: z.string().optional() // Optional
  uid: z.string().optional() // Optional
  slug: z.string().optional() // Optional
  token: z.string().optional() // Optional
  groupId: z.string().optional() // Optional
  ticketId: z.string().optional() // Optional
  width: z.number().optional() // Optional
  height: z.number().optional() // Optional
  showTabs: z.boolean().optional() // Optional
  showToolbar: z.boolean().optional() // Optional
}
```

### Response Format

**JSON**:

```json

        success: true,
        data: health,

```

**JSON**:

```json

          success: true,
          message: "Data synchronization completed successfully",

```

**JSON**:

```json

      success: true,
      message: "BI connection updated successfully",

```

**JSON**:

```json

      success: true,
      message: "BI connection deleted successfully",

```

---

## POST /analytics/preload-metrics

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/analytics/preload-metrics/route.ts`  
**Description**: Schema for preload metrics data

### Methods

- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

```typescript
{
  route: z.string(); // Required
  loadTime: z.number(); // Required
  success: z.boolean(); // Required
  error: z.string().optional(); // Optional
  timestamp: z.number(); // Required
  userAgent: z.string().optional(); // Optional
  connectionType: z.string().optional(); // Optional
}
```

### Response Format

**JSON**:

```json
 success: true
```

**JSON**:

```json

      success: true,
      message: "Preload metrics received",

```

---

## GET, POST /analytics

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/analytics/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

```typescript
{
  startDate: z.string().optional(); // Optional
  endDate: z.string().optional(); // Optional
  userId: z.string().optional(); // Optional
  limit: z.string().transform(Number).optional(); // Optional
  offset: z.string().transform(Number).optional(); // Optional
}
```

```typescript
{
  eventType: z.string(); // Required
  eventData: z.record(z.any()); // Required
  sessionId: z.string().optional(); // Optional
}
```

### Response Format

## No response format documented

## POST /analytics/vitals

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/analytics/vitals/route.ts`  
**Description**: Schema for web vitals data

### Methods

- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

```typescript
{
  name: z.enum(["CLS" "FCP", "LCP", "TTFB", "INP", "FID"]), // Required
  value: z.number() // Required
  rating: z.enum(["good" "needs-improvement", "poor"]).optional(), // Optional
  delta: z.number().optional() // Optional
  id: z.string() // Required
  navigationType: z.string().optional() // Optional
}
```

### Response Format

**JSON**:

```json
 success: true
```

**JSON**:

```json
 success: true
```

**JSON**:

```json
 success: true
```

---

## GET, POST /analytics/websocket

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/analytics/websocket/route.ts`  
**Description**: Analytics WebSocket API Provides real-time data streaming for analytics dashboard Store active WebSocket connections

### Methods

- **GET**
- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

## No response format documented

## POST /email

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/email/route.ts`  
**Description**: No description available

### Methods

- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json
 message: "Send email endpoint"
```

---

## GET, PUT, DELETE /estimates/:id

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/estimates/[id]/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **PUT**
- **DELETE**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      success: true,
      estimate,

```

**JSON**:

```json

      success: true,
      message: "Estimate updated successfully",

```

**JSON**:

```json

      success: true,
      message: "Estimate deleted successfully",

```

---

## GET, PUT, DELETE /estimation-flows/:id

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/estimation-flows/[id]/route.ts`  
**Description**: Authenticate request

### Methods

- **GET**
- **PUT**
- **DELETE**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json
 flow
```

**JSON**:

```json
 flow
```

**JSON**:

```json
 success: true
```

---

## GET, POST, PUT /estimation-flows

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/estimation-flows/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **POST**
- **PUT**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- rate-limiting
- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json
 flow: updatedFlow
```

**JSON**:

```json
 flows
```

---

## POST /facade-analysis/:id/analyze

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/facade-analysis/[id]/analyze/route.ts`  
**Description**: No description available

### Methods

- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

## No response format documented

## GET, POST /facade-analysis/:id/images

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/facade-analysis/[id]/images/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json
 images: images || []
```

---

## GET, DELETE, PATCH /facade-analysis/:id

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/facade-analysis/[id]/route.ts`  
**Description**: No description available

### Methods

- **GET**
- **DELETE**
- **PATCH**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      analysis,
      images: images || [],
      measurements,

```

**JSON**:

```json
 analysis: updatedAnalysis
```

**JSON**:

```json

      message: "Facade analysis deleted successfully",

```

---

## GET, POST /facade-analysis

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/facade-analysis/route.ts`  
**Description**: GET /api/facade-analysis - List facade analyses GET /api/facade-analysis?estimate_id=xyz - Get by estimate ID

### Methods

- **GET**
- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

        analysis,
        images: images || [],

```

**JSON**:

```json
 analyses: data
```

---

## GET, POST /health

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/health/route.ts`  
**Description**: Public health check endpoint - returns minimal information For detailed health information, use /api/health/secure (requires authentication) / Quick database connectivity check

### Methods

- **GET**
- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

## No response format documented

## GET /health/secure

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/health/secure/route.ts`  
**Description**: Secure health check endpoint - requires authentication Returns detailed health information for monitoring /

### Methods

- **GET**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

## No response format documented

## GET /integrations/health

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/integrations/health/route.ts`  
**Description**: Integration Health Check API Monitors integration status and connection health

### Methods

- **GET**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

## No response format documented

## GET, POST /integrations/quickbooks/auth

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/integrations/quickbooks/auth/route.ts`  
**Description**: QuickBooks OAuth authentication flow

### Methods

- **GET**
- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json
 auth_url: authUrl
```

**JSON**:

```json
 success: true
```

---

## GET, POST /integrations/quickbooks/webhook

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/integrations/quickbooks/webhook/route.ts`  
**Description**: QuickBooks webhook endpoint

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      success: true,
      processed: result.data?.processed_events || 0,

```

**JSON**:

```json

    message: "QuickBooks webhook endpoint is active",
    timestamp: new Date().toISOString(),

```

---

## GET, POST, PUT, DELETE /integrations

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/integrations/route.ts`  
**Description**: Integration Management API Handles CRUD operations for integrations and webhook endpoints

### Methods

- **GET**
- **POST**
- **PUT**
- **DELETE**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      integrations: integrations || [],
      count: integrations?.length || 0,

```

**JSON**:

```json

      integration: result.data,
      message: "Integration created successfully",

```

**JSON**:

```json

      integration,
      message: "Integration updated successfully",

```

**JSON**:

```json

      message: "Integration deleted successfully",

```

---

## GET, POST /integrations/sync

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/integrations/sync/route.ts`  
**Description**: Integration Sync API Handles manual and automated synchronization of integrations

### Methods

- **GET**
- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

        message: "Integration sync initiated",
        integration_id,
        direction,

```

**JSON**:

```json

      sync_logs: syncLogs || [],
      count: syncLogs?.length || 0,

```

---

## GET, POST /integrations/webhooks/receive/:provider

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/integrations/webhooks/receive/[provider]/route.ts`  
**Description**: Webhook Handler API Handles incoming webhooks from various integration providers

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      success: true,
      message: "Webhook processed successfully",
      data: result.data,

```

---

## GET, POST, PUT, DELETE /monitoring/alerts

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/monitoring/alerts/route.ts`  
**Description**: Monitoring Alerts API Alert management and notification API endpoint Global alert manager instance GET /api/monitoring/alerts

### Methods

- **GET**
- **POST**
- **PUT**
- **DELETE**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      alerts,
      total: alerts.length,
      timestamp: Date.now(),

```

**JSON**:

```json

      success: true,
      alertId,
      timestamp: Date.now(),

```

**JSON**:

```json

      success: true,
      timestamp: Date.now(),

```

**JSON**:

```json

        success: true,
        message: "All resolved alerts cleared",
        timestamp: Date.now(),

```

**JSON**:

```json

      success: true,
      timestamp: Date.now(),

```

---

## GET, POST, PUT, DELETE /monitoring/config

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/monitoring/config/route.ts`  
**Description**: Monitoring Configuration API Configuration management for monitoring and alerting systems Global alert manager instance

### Methods

- **GET**
- **POST**
- **PUT**
- **DELETE**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

No request validation schema defined

### Response Format

## No response format documented

## GET, POST, PUT /monitoring/metrics

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/monitoring/metrics/route.ts`  
**Description**: Monitoring Metrics API Real-time system metrics and health data API endpoint GET /api/monitoring/metrics

### Methods

- **GET**
- **POST**
- **PUT**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json
 success: true
```

**JSON**:

```json
 success: true
```

---

## GET, POST, PUT /pdf/process

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/pdf/process/route.ts`  
**Description**: PDF Processing API Endpoint Handles PDF upload, text extraction, OCR, and measurement detection

### Methods

- **GET**
- **POST**
- **PUT**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

```typescript
{
  extractImages: z.boolean().optional().default(true) // Optional
  performOCR: z.boolean().optional().default(true) // Optional
  detectMeasurements: z.boolean().optional().default(true) // Optional
  ocrLanguage: z.enum(["eng" "spa", "fra", "deu"]).optional().default("eng"), // Optional
  convertToImages: z.boolean().optional().default(false) // Optional
  imageFormat: z.enum(["png" "jpeg"]).optional().default("png"), // Optional
  imageDensity: z.number().min(72).max(300).optional().default(150) // Optional
}
```

```typescript
{
  searchTerm: z.string().min(1).max(100); // Required
  useRegex: z.boolean().optional().default(false); // Optional
  caseSensitive: z.boolean().optional().default(false); // Optional
}
```

### Response Format

**JSON**:

```json

      success: true,
      filename: file.name,
      fileSize: file.size,
      metadata: responseResult.metadata,
      extractedText: responseResult.text,
      textLength: responseResult.text.length,
      imagesFound: responseResult.images.length,
      imageDetails: responseResult.images.map((img) => ({
        pageNumber: img.pageNumber,
        imageIndex: img.imageIndex,
        width: img.width,
        height: img.height,
        format: img.format,
        hasOCRText: !!img.extractedText,
        ocrConfidence: img.confidence,
        textPreview: img.extractedText
          ? img.extractedText.substring(0, 100)
          : undefined,

```

**JSON**:

```json

      success: result.success,
      totalMatches: sanitizedMatches.length,
      matches: sanitizedMatches,

```

**JSON**:

```json

    status: "healthy",
    service: "pdf-processor",
    maxFileSize: MAX_FILE_SIZE,
    supportedFormats: ALLOWED_MIME_TYPES,
    features: [
      "text-extraction",
      "ocr",
      "measurement-detection",
      "image-extraction",
      "search",
    ],

```

---

## GET, POST /performance/alerts

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/performance/alerts/route.ts`  
**Description**: Performance Alerts API Manages performance alerts and notifications

### Methods

- **GET**
- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json
 alerts
```

**JSON**:

```json

        message: "Alert resolved successfully",

```

**JSON**:

```json

        message: "Subscribed to performance alerts",

```

---

## GET /performance/bundle

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/performance/bundle/route.ts`  
**Description**: Read bundle history file

### Methods

- **GET**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      history,
      current: currentMetrics,

```

---

## GET, POST /performance/cache

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/performance/cache/route.ts`  
**Description**: Performance Cache API Manages cache performance metrics and operations

### Methods

- **GET**
- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json
 metrics
```

**JSON**:

```json

        message: "Cache cleared successfully",

```

**JSON**:

```json

        message: "Cache warmed successfully",

```

**JSON**:

```json

        message: "Cache invalidated successfully",

```

**JSON**:

```json

        message: "Cache invalidated successfully",

```

---

## GET, DELETE /performance/entries

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/performance/entries/route.ts`  
**Description**: Performance Entries API Provides access to performance tracking entries

### Methods

- **GET**
- **DELETE**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

      entries,
      summary,
      timeRange,
      timestamp: now,

```

**JSON**:

```json

      message: "Performance entries cleared successfully",
      timestamp: Date.now(),

```

---

## GET, POST /performance/metrics

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/performance/metrics/route.ts`  
**Description**: Performance Metrics API Provides real-time performance metrics and monitoring data

### Methods

- **GET**
- **POST**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json

        message: "Performance metrics cleared successfully",

```

**JSON**:

```json

        message: "Performance entry recorded successfully",

```

---

## GET /performance/vitals

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/performance/vitals/route.ts`  
**Description**: Get query parameters

### Methods

- **GET**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

No middleware applied

### Request Schema

No request validation schema defined

### Response Format

**JSON**:

```json
 data: vitals
```

---

## GET, POST /photos/analyze

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/photos/analyze/route.ts`  
**Description**: Validation schema for analysis request

### Methods

- **GET**
- **POST**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- rate-limiting
- authentication

### Request Schema

```typescript
{
  photo_ids: z.array(z.string().uuid()).min(1).max(20); // Required
  analysis_types: z; // Required
  stream_progress: z.boolean().default(false); // Required
}
```

```typescript
{
  before_photo_id: z.string().uuid(); // Required
  after_photo_id: z.string().uuid(); // Required
}
```

```typescript
{
  photo_ids: z.array(z.string().uuid()).min(2).max(10); // Required
}
```

### Response Format

**JSON**:

```json

      success: true,
      action,
      result,
      processedAt: new Date().toISOString(),
      count: Array.isArray(result) ? result.length : 1,

```

**JSON**:

```json

      success: true,
      photo_id: photoId,
      analysis_results: analysisResults,
      count: analysisResults.length,

```

---

## GET, POST, DELETE /photos/upload

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/photos/upload/route.ts`  
**Description**: Validation schema for upload request

### Methods

- **GET**
- **POST**
- **DELETE**

### Authentication

❌ **Not Required**

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- rate-limiting
- authentication

### Request Schema

```typescript
{
  estimate_id: z.string().uuid().optional(); // Optional
  compress: z.boolean().default(true); // Required
  max_size_mb: z.number().min(1).max(50).default(10); // Required
}
```

### Response Format

**JSON**:

```json

      success: true,
      photos,
      count: photos.length,

```

**JSON**:

```json

      success: true,
      message: "Photo deleted successfully",

```

---

## PUT /process

**File**: `/home/prfowler/Projects/estimatepro_2.5/app/api/process/route.ts`  
**Description**: PDF Processing API endpoint Handles PDF upload, text extraction, image extraction, and measurement detection

### Methods

- **PUT**

### Authentication

✅ **Required** (supabase-auth)

### Rate Limiting

♾️ **No rate limiting**

### Middleware

- authentication

### Request Schema

```typescript
{
  extractImages: z.boolean().default(true) // Required
  performOCR: z.boolean().default(true) // Required
  detectMeasurements: z.boolean().default(true) // Required
  ocrLanguage: z.string().default("eng") // Required
  convertToImages: z.boolean().default(false) // Required
  imageFormat: z.enum(["png" "jpeg"]).default("png"), // Required
  imageDensity: z.number().min(72).max(300).default(150) // Required
}
```

### Response Format

**JSON**:

```json

      success: true,
      searchTerm,
      useRegex,
      totalMatches: searchResult.matches.length,
      matches: searchResult.matches.map((match) => ({
        pageNumber: match.pageNumber,
        matchText: match.text,
        context: match.context,

```

**JSON**:

```json

      success: true,
      startPage,
      endPage,
      extractedText: textResult.text,
      textLength: textResult.text.length,

```

---

_Generated by EstimatePro Service Contract Generator_

# EstimatePro - AI-Powered Building Services Estimation Platform

## Project Overview

EstimatePro is a comprehensive Next.js 15 application for building services contractors featuring AI-enhanced workflows, real-time pricing, session recovery, photo analysis, document extraction, 11 specialized service calculators, 3D visualization, drone integration, progressive web app capabilities, and professional estimate generation.

### Key Features

- **15 AI Endpoints**: Photo analysis, facade analysis, document extraction, competitive intelligence, risk assessment, auto-quote generation, AI assistant, conversations, analytics, metrics, usage tracking, contact extraction, follow-up automation, analyze-facade, auto-estimate
- **11 Service Calculators**: Real-time calculations for window cleaning, pressure washing, 3D modeling, etc.
- **Real-Time Systems**: Live pricing updates, cross-step validation, dependency tracking, smart auto-save
- **Session Management**: Browser crash recovery, tab sync, progressive data restoration
- **AI Intelligence**: Smart service suggestions, cross-step population, context-aware defaults
- **3D Visualization & Drone Integration**: Building modeling, aerial inspection, flight planning
- **Progressive Web App**: Offline functionality, background sync, native app experience
- **Guided Workflows**: Step-by-step estimation with validation and state persistence
- **Enterprise Architecture**: Service layer, transaction support, caching, lazy loading, security
- **Advanced UI Polish**: Skeleton loaders, contextual error handling, empty states, micro-interactions
- **Visual Design System**: Industrial color palette, glass morphism effects, gradient overlays, professional animations

## Technology Stack

**Frontend**: Next.js 15, TypeScript, Tailwind CSS, React Hook Form + Zod, Zustand, React Query, Radix UI, Framer Motion

**Backend**: Supabase (PostgreSQL, Auth, RLS), OpenAI GPT-4, Weather API, Resend Email

**Processing**: jsPDF, React PDF, XLSX, html2canvas

## Available MCP Servers and Subagents

### MCP Servers

**supabase**: Supabase database operations

- Branch management (create, list, delete, merge, reset, rebase)
- Database operations (list tables/extensions, apply migrations, execute SQL)
- Edge Functions deployment
- Logs and monitoring
- TypeScript type generation
- Security advisors for performance and vulnerability checks

**zen**: Advanced AI workflow tools

- Chat, debug, analyze, refactor, and plan workflows
- Specialized tools for code review, security audits, documentation generation
- Test generation and code tracing
- Pre-commit validation and consensus building
- Challenge tool for critical analysis

### Available Subagents (via Task tool)

**general-purpose**: General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks

**sql-pro**: Write complex SQL queries, optimize execution plans, and design normalized schemas. Masters CTEs, window functions, and stored procedures

**senior-code-reviewer**: Comprehensive code review from a senior fullstack developer perspective, including analysis of code quality, architecture decisions, security vulnerabilities, performance implications, and adherence to best practices

**ui-engineer**: Create, modify, or review frontend code, UI components, or user interfaces. Includes building responsive layouts, implementing modern UI patterns, optimizing frontend performance, ensuring accessibility compliance

**mcp-development-expert**: Assistance with Model Context Protocol (MCP) development, including building clients and servers, debugging MCP applications, understanding protocol specifications, or implementing MCP solutions

## Project Structure

```
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── ai/                   # 15 specialized AI endpoints
│   │   │   ├── analytics/        # AI analytics and insights
│   │   │   ├── analyze-facade/   # Facade analysis endpoint
│   │   │   ├── assistant/        # AI assistant chat interface
│   │   │   ├── auto-estimate/    # Automated estimate generation
│   │   │   ├── auto-quote/       # Automated quote generation
│   │   │   ├── competitive-intelligence/ # Market analysis
│   │   │   ├── conversations/    # AI conversation management
│   │   │   ├── enhanced-photo-analysis/ # Advanced photo processing
│   │   │   ├── extract-contact-info/ # Contact extraction
│   │   │   ├── extract-documents/ # Document processing
│   │   │   ├── facade-analysis/  # AI facade analysis
│   │   │   ├── follow-up-automation/ # Automated follow-ups
│   │   │   ├── metrics/          # AI usage metrics
│   │   │   ├── risk-assessment/  # Automated risk analysis
│   │   │   └── usage/            # AI usage tracking
│   │   ├── analytics/            # Analytics API
│   │   │   └── vitals/           # Web vitals and performance metrics
│   │   ├── analyze-photos/       # Photo analysis
│   │   ├── customers/            # Customer management
│   │   ├── drone/                # Drone operations API
│   │   ├── enhanced/             # Enhanced API endpoints
│   │   ├── estimation-flows/     # Guided flow API
│   │   ├── process/              # Processing API
│   │   ├── stream/               # Streaming API
│   │   └── quotes/               # Quote operations
│   ├── auth/                     # Authentication pages
│   ├── calculator/               # Service calculator page
│   ├── dashboard/                # Main dashboard
│   ├── estimates/                # Estimate management
│   │   ├── [id]/                 # Individual estimate pages
│   │   └── new/guided/           # Guided estimation flow
│   ├── ai-analytics/             # AI Analytics Dashboard
│   ├── ai-assistant/             # AI Assistant pages
│   │   ├── enhanced/             # Enhanced AI Assistant interface
│   │   ├── integrated/           # Integrated AI Assistant
│   │   └── tools/                # AI Assistant with tools
│   ├── 3d-demo/                  # 3D visualization demo
│   ├── drone-demo/               # Drone integration demo
│   ├── test-sentry/              # Sentry error tracking test
│   └── settings/                 # Application settings
├── components/                   # React components
│   ├── ai/                       # AI-related components
│   │   ├── FacadeAnalysisForm.tsx # AI facade analysis interface
│   │   ├── FacadeAnalysisResults.tsx # Facade analysis display
│   │   └── SmartField.tsx        # AI-powered form fields
│   ├── calculator/               # Service calculators with lazy loading
│   ├── canvas/                   # Drawing and measurement tools
│   ├── dashboard/                # Enhanced dashboard components
│   │   ├── AIBusinessInsights.tsx # AI-powered analytics dashboard
│   │   ├── AICreateEstimateCard.tsx # Quick estimate creation (industrial theme)
│   │   ├── EnhancedDashboardLayout.tsx # Animated background & depth
│   │   └── EnhancedDashboardHeader.tsx # Dynamic greetings & status
│   ├── drone/                    # Drone operations components
│   ├── duration/                 # Timeline and scheduling
│   ├── error-handling/           # Error boundaries and handling
│   ├── estimation/               # Guided estimation flow
│   │   └── guided-flow/          # Enhanced guided flow components
│   │       ├── AutoSaveStatusDisplay.tsx # Auto-save status feedback
│   │       ├── RealTimeCostBreakdown.tsx # Live pricing display
│   │       ├── DesktopStepIndicator.tsx # Desktop navigation
│   │       ├── TemplatePreviewModal.tsx # Template preview system
│   │       └── components/       # Shared guided flow components
│   │           └── ProgressiveValidation.tsx # Real-time validation
│   ├── expenses/                 # Cost breakdown components
│   ├── pricing/                  # Pricing strategy tools
│   ├── pwa/                      # Progressive Web App components
│   │   ├── pwa-status.tsx        # PWA status indicators
│   │   └── pwa-initializer.tsx   # PWA initialization
│   ├── takeoff/                  # Measurement and takeoff
│   ├── validation/               # Enhanced validation components
│   │   └── ProgressiveHintsSystem.tsx # Progressive validation hints
│   ├── visualizer/               # 3D visualization components
│   └── ui/                       # Reusable UI components with lazy loading
│       ├── skeleton.tsx          # Advanced skeleton loaders with animations
│       ├── error-alert.tsx       # Contextual error handling with recovery
│       ├── empty-state.tsx       # Intelligent empty states with guidance
│       ├── button.tsx            # Enhanced buttons with ripple & haptic feedback
│       ├── stat-card.tsx         # Gradient statistics cards
│       ├── feature-card.tsx      # Feature cards with hover effects
│       ├── section-header.tsx    # Animated section headers
│       ├── enhanced-card.tsx     # Versatile card variants
│       ├── SaveExitButton.tsx    # Smart workflow exit handling
│       ├── SessionRecoveryModal.tsx # Session recovery interface
│       ├── mobile-bottom-nav.tsx # Advanced mobile navigation
│       └── mobile/               # Mobile-specific UI components
│           ├── MobilePhotoCapture.tsx # Enhanced mobile photo workflow
│           ├── SwipeIndicator.tsx # Touch gesture feedback
│           └── components/       # Shared mobile components
├── lib/                          # Core utilities and services
│   ├── ai/                       # AI service integrations
│   │   ├── ai-response-cache.ts  # AI response caching system
│   │   ├── ai-config.ts          # AI configuration management
│   │   ├── ai-security.ts        # AI security and validation
│   │   ├── template-cache.ts     # AI template caching
│   │   ├── smart-defaults-engine.ts # Context-aware form pre-filling
│   │   ├── optimized-prompts.ts  # Performance-optimized prompts
│   │   └── prompts/              # AI prompt templates
│   ├── calculations/             # Service calculation engines
│   ├── config/                   # Application configuration
│   ├── drone/                    # Drone service framework
│   ├── schemas/                  # API validation schemas
│   ├── services/                 # Business logic layer
│   │   ├── ai-conversation-service.ts # AI conversation management
│   │   ├── ai-service.ts         # AI business logic
│   │   ├── analytics-metrics-service.ts # Analytics metrics tracking
│   │   ├── analytics-service.ts  # Analytics business logic
│   │   ├── auto-save-service.ts  # Smart auto-save with conflict resolution
│   │   ├── calculator-service.ts # Calculator business logic
│   │   ├── cross-step-population-service.ts # AI-driven step population
│   │   ├── cross-step-validation-service.ts # Inter-step validation
│   │   ├── dependency-tracking-service.ts # Data dependency tracking
│   │   ├── equipment-materials-service.ts # Equipment and materials management
│   │   ├── estimate-crud-service.ts # Estimate CRUD operations
│   │   ├── estimate-service.ts   # Estimate business logic
│   │   ├── estimate-validation-service.ts # Estimate validation
│   │   ├── facade-analysis-service.ts # Facade analysis business logic
│   │   ├── performance-optimization-service.ts # Performance optimization
│   │   ├── photo-service.ts      # Photo management and processing
│   │   ├── pilot-service.ts      # Pilot/drone service management
│   │   ├── pilot-service-client.ts # Pilot service client
│   │   ├── real-time-pricing-service.ts # Live pricing calculations
│   │   ├── risk-assessment-service.ts # Risk assessment logic
│   │   ├── session-recovery-service.ts # Browser crash recovery
│   │   ├── session-recovery-service-client.ts # Session recovery client
│   │   ├── vendor-service.ts     # Vendor management
│   │   ├── weather-service.ts    # Weather integration service
│   │   ├── workflow-service.ts   # Workflow management
│   │   └── workflow-templates.ts # Workflow template management
│   ├── stores/                   # Zustand state management
│   ├── supabase/                 # Database client/server
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   │   ├── cache.ts              # Caching utilities
│   │   ├── database-optimization.ts # DB performance
│   │   ├── null-safety.ts        # Type-safe null handling
│   │   └── retry-logic.ts        # Retry mechanisms
│   ├── pwa/                      # Progressive Web App services
│   │   ├── offline-manager.ts    # Advanced offline functionality
│   │   └── pwa-service.ts        # Complete PWA management
│   ├── validation/               # Validation utilities
│   │   └── data-sanitization.ts  # XSS/injection protection
│   └── visualization/            # 3D visualization engine
├── contexts/                     # React contexts
├── hooks/                        # Custom React hooks
│   ├── useAutoSave.ts            # Auto-save hook
│   ├── useFacadeAnalysis.ts      # Facade analysis hook
│   ├── useRealTimePricing.ts     # Real-time pricing hook
│   ├── useSessionRecovery.ts     # Session recovery hook
│   ├── useSmartAutoSave.ts       # Smart auto-save hook
│   └── useSwipeGestures.ts       # Touch gesture hook
└── types/                        # Global type definitions
```

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key
- Resend API key (for emails)

### Environment Variables

Create `.env.local` with required keys:

```bash
# Core Services
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
RESEND_API_KEY=your_resend_api_key

# Weather API
ACCUWEATHER_API_KEY=your_accuweather_api_key

# Error Tracking
SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
SENTRY_AUTH_TOKEN=your_sentry_auth_token

# Feature Flags (all default true)
NEXT_PUBLIC_ENABLE_AI=true
NEXT_PUBLIC_ENABLE_3D=true
NEXT_PUBLIC_ENABLE_DRONE=true
NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS=true
NEXT_PUBLIC_DEBUG=false

# Performance Settings
AI_CACHE_TTL=3600
AI_RATE_LIMIT_PER_MINUTE=100
CACHE_TTL=1800

# AI Model Configuration
FACADE_ANALYSIS_MODEL_VERSION=v8.0
AI_VISION_MODEL=gpt-4o
AI_DEFAULT_MODEL=gpt-4-turbo
MAX_IMAGE_SIZE_MB=10
CONFIDENCE_THRESHOLD=85
AI_MAX_TOKENS=4000
AI_TEMPERATURE=0.7
AI_RETRY_ATTEMPTS=3
AI_MAX_INPUT_LENGTH=50000
AI_MAX_OUTPUT_LENGTH=10000

# AI Security & Features
AI_ENABLE_CACHING=true
AI_ENABLE_CONTENT_FILTERING=true
AI_ENABLE_INPUT_SANITIZATION=true
AI_ENABLE_OUTPUT_VALIDATION=true
AI_ENABLE_LOGGING=false

# Admin Configuration
ADMIN_EMAIL=admin@example.com
ADMIN_PHONE=+1234567890

# CORS & Security
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Audit & Monitoring
AUDIT_RETENTION_DAYS=90
AUDIT_AUTO_PURGE=true
AUDIT_ANONYMIZATION_RULES={"email":"mask","phone":"mask"}

# Bundle Analysis
ANALYZE_BUNDLE=false
```

### Installation & Setup

```bash
# Install dependencies
npm install

# Set up database schema
npm run setup-db

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Available Scripts

```bash
# Development (MANDATORY: run fmt && lint && typecheck before commits)
npm run fmt && npm run lint && npm run typecheck
npm run dev

# Production
npm run build && npm run start

# Database
node scripts/setup-basic-schema.js
node scripts/run-migration.js
node scripts/production-check.js
node scripts/create-sample-data.js
node scripts/migrate-database.js
```

## Documentation Hierarchy

- **CLAUDE.md** (this file): Comprehensive project documentation, architecture overview, and development setup
- **.cursor/.cursorrules**: Strict coding standards and enforcement rules for AI assistants
- **docs/THEME_GUIDE.md**: Professional theme system guide for AI assistants (Stripe/Salesforce-inspired design)
- **All files must be kept in sync** for consistent development practices

## Key Development Commands

### Database Operations

```bash
# Initialize new database schema
node scripts/setup-basic-schema.js

# Run standard migrations
node scripts/run-migration.js

# Add transaction support
node scripts/run-transaction-migration.js

# Create sample data for development
node scripts/create-sample-data.js

# Verify database setup and connectivity
node scripts/production-check.js

# Run database migrations
node scripts/migrate-database.js
```

### Development Workflow (ENFORCED)

```bash
# MANDATORY: Format, lint, and type check before any commits
npm run fmt && npm run lint && npm run typecheck

# Start development with hot reload
npm run dev

# Test production build locally
npm run build && npm run start

# Verify production readiness
node scripts/production-check.js
```

### AI Integration Requirements

```bash
# NEVER call AI APIs directly from components
# ALWAYS use services in /lib/ai/ with caching and security validation
# MUST validate inputs with ai-security.ts
# REQUIRED: Check AI cache before making API calls
```

### Service Layer Requirements

```bash
# ALL business logic MUST be in /lib/services/
# ALL database operations MUST use service layer with transactions
# NEVER write raw Supabase queries in components
# ALWAYS validate RLS policies are applied
```

### Testing & Validation

```bash
# Run TypeScript compilation check
npm run typecheck

# Test real-time pricing
node scripts/test-real-time-pricing.js

# Test session recovery
node scripts/test-session-recovery.js

# Test Sentry integration
node scripts/test-sentry-integration.js

# Production verification
bash scripts/production-verify.sh
```

## Architecture

**Component Organization**: Feature-based structure with atomic design principles and strict separation of concerns

**State Management**: Zustand (global state), React Query (server state), React Context (auth/theme), Service Layer (business logic)

**Data Flow**: Components → Hooks → Stores → API Routes → Services → Supabase → Database

### Type System Organization

**Two-Directory Structure**:

- `/types/` - Database-centric types (Supabase generated, database models)
- `/lib/types/` - Application domain types (business logic, features)

**Type Name Resolution** (Resolved naming conflicts):

- `EstimateRow` - Database record from Supabase (previously conflicted as `Estimate`)
- `EstimateDocument` - UI/Legacy model for display (previously conflicted as `Estimate`)
- `EstimateStoreState` - Store state for estimation workflow (previously conflicted as `Estimate`)

**Type Aliases** (for clarity):

- `DatabaseEstimate` → `EstimateRow`
- `UIEstimate` → `EstimateDocument`
- `StoreEstimate` → `EstimateStoreState`

**Import Guidelines**:

- Use `@/types/supabase` for database types only
- Use `@/lib/types` for all application domain types
- Centralized exports via `/lib/types/index.ts`

### Security & Validation

**Database**: RLS policies, ACID transactions, input sanitization, encryption, audit logging

**Application**: Environment validation, CSP, API rate limiting, Supabase Auth, RBAC

**AI Security**: Input validation (`ai-security.ts`), response sanitization, rate limiting, content filtering

**Validation**: Zod schemas, API validation, null safety, error boundaries

## Service Calculators

**11 Specialized Calculators**: Window Cleaning, Pressure Washing, Soft Washing, Biofilm Removal, Glass/Frame Restoration, High Dusting, Final Clean, Granite Reconditioning, Pressure Wash & Seal, Parking Deck, AI Facade Analysis

**Features**: Material costs, labor estimation, equipment requirements, markup/margin settings, risk adjustments, AI-powered measurements

## AI Integration

**15 AI Endpoints**: Enhanced photo analysis, facade analyzer, document extraction, contact extraction, auto-quote generation, competitive intelligence, risk assessment, follow-up automation, AI assistant chat, conversation management, AI analytics, metrics tracking, usage monitoring, analyze-facade, auto-estimate generation

**AI Intelligence Features**:

- **Smart Service Suggestions** (`IntelligentServiceSuggestions.tsx`): AI-powered service recommendations with confidence scoring
- **Cross-Step Population** (`cross-step-population-service.ts`): Auto-populate workflow steps from AI extraction
- **Smart Defaults Engine** (`smart-defaults-engine.ts`): Context-aware form pre-filling
- **AI Business Insights** (`AIBusinessInsights.tsx`): Analytics dashboard with AI metrics

**Core Features**: GPT-4 Vision analysis, automated scope extraction, service recommendations, timeline predictions

**Performance**: Intelligent caching (`ai-response-cache.ts`), template caching (`template-cache.ts`), rate limiting, optimized prompts, error recovery

**Safety**: Schema validation, content filtering, confidence scoring, human-in-the-loop reviews

### AI Facade Analysis Feature

**Overview**: Advanced computer vision system for automated building measurement and material classification from photographs.

**Technical Stack**:

- OpenAI GPT-4 Vision for image analysis
- Custom-trained models for material classification
- Real-time validation and confidence scoring

**Key Capabilities**:

- Window detection and counting (95% accuracy)
- Material classification (85%+ confidence)
- Height estimation (±3% accuracy)
- Covered area detection
- Multi-angle image fusion

**Integration Points**:

- Service calculators for automated pricing
- Guided estimation flow for seamless workflow
- 3D visualization for result verification
- Report generation with professional formatting

**Database Schema**:

- `facade_analyses`: Main analysis results
- `facade_analysis_images`: Image storage and AI results
- Full RLS policies for security

**API Endpoints**:

- `/api/ai/facade-analysis`: Main analysis endpoint
- `/api/facade/validate`: Measurement validation
- `/api/facade/report`: Report generation

## 3D Visualization System

**3D Engine** (`lib/visualization/3d-engine.ts`): Canvas-based rendering with interactive building modeling, measurement tools, service area management

**Enhanced Building3D Component**: Pan/zoom/rotate controls, real-time analysis, drawing tools, export capabilities

**Integration**: Guided flow integration, persistent state management, automated complexity analysis

**Demo**: `/3d-demo` page with feature toggle support (`NEXT_PUBLIC_ENABLE_3D`)

## Drone Integration Platform

**Drone Service Framework** (`lib/drone/drone-service.ts`): AI flight planning, multi-drone fleet management, weather integration, FAA Part 107 compliance

**Aerial Analysis**: 4K/6K photography, thermal imaging, automated 3D mapping, damage detection, coverage verification

**Operations Dashboard** (`components/drone/drone-dashboard.tsx`): Real-time monitoring, flight tracking, weather conditions, fleet status

**API** (`/api/drone/operations`): Flight plan management, fleet control, weather integration, automated analysis

**Safety**: Regulatory compliance, safety protocols, no-fly zones, flight logging, incident reporting

**Demo**: `/drone-demo` page with simulation mode (`NEXT_PUBLIC_ENABLE_DRONE`)

## Advanced UI Polish System

**Skeleton Loading Components**: Intelligent loading states with multiple animation variants (shimmer, pulse, wave), contextual skeleton patterns for cards, lists, tables, and text blocks with staggered animations

**Contextual Error Handling**: Advanced error alert system with type-specific recovery suggestions, copy functionality, dismissible states, and progressive error disclosure for network, validation, server, and permission errors

**Empty State Management**: Pre-configured empty states for all major sections (estimates, customers, photos, analytics) with contextual guidance, helpful actions, and professional illustrations

**Enhanced Micro-Interactions**: Framer Motion-powered button animations with ripple effects, haptic feedback for mobile, spring animations, and custom motion properties for professional touch interactions

**Mobile-First Polish**: Advanced touch feedback, gesture recognition, enhanced bottom navigation with badges and animations, optimized for one-handed usage with proper touch targets

**Performance-Optimized Animations**: 60fps animations, intelligent staggered loading, memory-efficient transitions, and device-specific optimizations for smooth interactions across all devices

## Visual Design System

**Industrial Color Palette**: Sophisticated color scheme designed for building contractors

- **Dusty Blue** (#6B7A89): Primary brand color - professional and trustworthy
- **Light Sandy Beige** (#CDBCA8): Warm accent for highlights and CTAs
- **Warm Taupe** (#675C5A): Secondary accent for depth and contrast
- **Off-Black/Dark Charcoal** (#201E1F): Text and strong UI elements

**Visual Components**:

- `StatCard`: Gradient overlay statistics with animated trends and icons
- `FeatureCard`: Eye-catching cards with featured badges and hover effects
- `SectionHeader`: Elegant headers with rotating icons and gradient text
- `EnhancedCard`: Versatile cards with variants (gradient, glass, glow, elevated)

**Dashboard Enhancements**:

- `EnhancedDashboardLayout`: Animated background orbs and subtle grid patterns
- `EnhancedDashboardHeader`: Dynamic greetings with live status indicators
- `AICreateEstimateCard`: Redesigned with industrial palette and smooth animations

**Design Features**:

- Glass morphism effects with backdrop blur
- Gradient overlays and mesh backgrounds
- Smooth spring animations via Framer Motion
- Haptic feedback support for mobile devices
- Professional ripple effects on interactive elements

**Implementation Details**: See `docs/UI_VISUAL_ENHANCEMENTS.md` for complete visual enhancement guide

## Service Layer Architecture

**Core Business Services**:

- `estimate-service.ts`: CRUD operations, validation, status management, data transformation
- `estimate-crud-service.ts`: Dedicated estimate CRUD operations
- `estimate-validation-service.ts`: Estimate validation logic
- `ai-service.ts`: Centralized AI communication, caching, error recovery, rate limiting
- `ai-conversation-service.ts`: AI conversation state management and history
- `calculator-service.ts`: Real-time calculations, validation, historical data integration
- `workflow-service.ts`: Guided flow orchestration, step validation, state persistence
- `analytics-service.ts`: Analytics data collection and processing
- `analytics-metrics-service.ts`: Metrics tracking and aggregation
- `equipment-materials-service.ts`: Equipment and materials inventory management
- `photo-service.ts`: Photo processing, storage, and management
- `pilot-service.ts` & `pilot-service-client.ts`: Drone pilot management and operations
- `risk-assessment-service.ts`: Automated risk evaluation and scoring
- `weather-service.ts`: Weather data integration and impact analysis
- `performance-optimization-service.ts`: Performance monitoring and optimization

**Real-Time & Session Services**:

- `real-time-pricing-service.ts`: Live cost calculations with confidence scoring
- `session-recovery-service.ts`: Browser crash recovery with multi-device support
- `auto-save-service.ts`: Smart auto-save with conflict detection and resolution
- `cross-step-population-service.ts`: AI-driven auto-population of workflow steps
- `cross-step-validation-service.ts`: Inter-step data validation and consistency checks
- `dependency-tracking-service.ts`: Track data relationships across workflow steps

**Database Layer**: ACID transactions (`database-transactions.ts`), connection pooling, null safety (`null-safety.ts`), Zod validation

**Performance**: Multi-level caching, intelligent invalidation, retry logic, performance monitoring

**Reliability**: Error boundaries, graceful degradation, detailed logging

## Database Schema

**Core Tables**: profiles, estimates, estimate_services, estimate_flows, measurements, analytics_events

**Enhanced Models**: ai_analysis_cache, service_calculations, workflow_steps, document_extractions, risk_assessments

**Relationships**: Users → Estimates → Services → Measurements/Calculations → AI Analysis (with RLS)

**Enhancements**: ACID transactions, optimized indexes, real-time subscriptions, data validation, audit trails

## Testing Strategy

**Unit Tests**: Jest + React Testing Library for components, calculation engines, utilities

**Integration Tests**: API endpoints, database operations, AI services

**Test Coverage**:

- `cross-step-population.test.ts`: AI-driven step population testing
- `session-recovery.test.ts`: Browser crash recovery validation
- `real-time-pricing-basic.test.ts`: Basic real-time pricing functionality
- `real-time-pricing-integration.test.ts`: Advanced real-time pricing integration
- `facade-analysis.test.tsx`: Component tests for facade analysis
- `facade-analysis-service.test.ts`: Service layer tests
- `use-facade-analysis.test.tsx`: Hook integration tests
- `calculator.test.tsx`: Calculator component tests
- `photo-analysis.test.ts`: Photo analysis tests
- `service-validation.test.ts`: Service validation tests

## Performance Optimization

**Code Splitting**: Dynamic component loading (`lazy-forms.tsx`, `lazy-components.tsx`), route-based splitting, optimized chunks

**Caching**: Multi-level caching, AI response caching, database query caching, service worker integration

**Database**: Connection pooling (`database-optimization.ts`), query optimization, transaction batching, read replicas

**Assets**: Next.js Image optimization, WebP conversion, CDN integration, progressive loading

**Runtime**: Memory management, error boundaries, performance monitoring, bundle analysis

**UI Performance**: Framer Motion animations optimized for 60fps, skeleton loading states for perceived performance, intelligent staggered animations, mobile-first touch interactions

**AI Facade Analysis Optimizations**:

- Progressive image upload with compression
- Parallel processing for multiple images
- Result caching for repeated analyses
- Lazy loading of analysis components

## Progressive Web App (PWA) Features

**Core PWA Services**:

- `pwa-service.ts`: Complete PWA management with install prompts, update detection
- `offline-manager.ts`: Advanced offline functionality with background sync
- `pwa-status.tsx`: Comprehensive offline status with sync indicators

**PWA Capabilities**:

- **Offline Functionality**: Complete workflow capability without internet connection
- **Background Sync**: Queue actions for execution when connection restored
- **Native App Experience**: App-like interface with installation prompts
- **Push Notifications**: Real-time updates and engagement
- **Service Worker Management**: Automatic caching and intelligent sync

**Mobile Enhancements**:

- **Enhanced Touch Support**: Advanced gesture recognition with haptic feedback
- **Mobile Photo Workflows** (`MobilePhotoCapture.tsx`): Optimized mobile photography
- **Swipe Gestures** (`useSwipeGestures.ts`): Natural touch navigation
- **Mobile Navigation**: Advanced bottom navigation with badges and animations

## Real-Time Systems

**Real-Time Pricing** (`real-time-pricing-service.ts`):

- Live cost calculations with confidence scoring
- Cross-step validation and dependency tracking
- Debounced updates with intelligent change detection
- Integration with `RealTimeCostBreakdown.tsx` for live display

**Session Recovery** (`session-recovery-service.ts`):

- Browser crash detection and recovery
- Multi-device session synchronization
- Progressive data restoration with user confirmation
- Tab management and conflict resolution

**Smart Auto-Save** (`auto-save-service.ts`):

- Intelligent save triggering with conflict detection
- Change tracking with debounced persistence
- Visual feedback through `AutoSaveStatusDisplay.tsx`
- Integration with session recovery system

## Advanced Validation & Security

**Cross-Step Validation** (`cross-step-validation-service.ts`):

- Inter-step data consistency checks
- Progressive validation with contextual hints
- Dependency tracking across workflow steps
- Real-time validation feedback

**Data Security** (`data-sanitization.ts`):

- Comprehensive XSS and injection protection
- Input sanitization with Zod schema validation
- Security-first validation approach
- Content filtering and safety checks

**Progressive Validation System**:

- `ProgressiveHintsSystem.tsx`: Smart validation hints
- `ProgressiveValidation.tsx`: Real-time validation feedback
- Context-aware error messaging
- Recovery suggestions and guidance

## Deployment

**Production Checklist**: `npm run production-check`, verify environment variables, security audit, build and test

**Configuration**: Supabase production DB, OpenAI API limits, Resend email, domain/SSL setup

**Monitoring**: Performance monitoring, error tracking, usage analytics

## Common Development Tasks

**Service Calculator**: Create form (`components/calculator/forms/`), add logic (`lib/calculations/services/`), update constants, validation schema, write tests

**AI Features**: Create prompts (`lib/ai/prompts/`), add processing logic, update service (`lib/services/ai-service.ts`), create UI, add API endpoints, update types/validation/caching/security

**Real-Time Features**: Extend real-time service (`lib/services/real-time-pricing-service.ts`), add UI components, implement WebSocket connections, add validation

**Session Management**: Extend recovery service (`lib/services/session-recovery-service.ts`), add recovery UI, implement storage strategies, add conflict resolution

**PWA Features**: Update PWA service (`lib/pwa/pwa-service.ts`), add offline capabilities, implement background sync, add native features

**Cross-Step Features**: Extend validation service (`lib/services/cross-step-validation-service.ts`), add dependency tracking, implement progressive hints, add UI feedback

**Database Changes**: Write migration SQL, test locally, update TypeScript types, add service logic, update schemas

**Estimate Features**: Update types (`lib/types/estimate-types.ts`), service logic, create UI with lazy loading, add APIs, update guided flow

**3D Features**: Extend engine (`lib/visualization/3d-engine.ts`), update Building3D component, add analysis capabilities, integrate with workflow

**Drone Features**: Extend service (`lib/drone/drone-service.ts`), update dashboard, extend APIs, add drone models, update compliance

## Code Conventions

**See `.cursor/.cursorrules` for detailed standards and `docs/THEME_GUIDE.md` for theme consistency.**

**TypeScript**: Strict .ts/.tsx only, no `any` types, explicit interfaces, generic types for reusables

**Import Order**: React imports → Third-party (alphabetical) → Internal (alphabetical, grouped)

**Architecture**: UI components have no business logic, all business logic in `/lib/services`, named exports only

**Naming**: Components (PascalCase), Files (kebab-case), Functions (camelCase), Constants (SCREAMING_SNAKE_CASE)

**Styling**: Professional theme system using semantic CSS variables, semantic color tokens only (see `docs/THEME_GUIDE.md`)

- Use `bg-bg-base`, `text-text-primary`, `border-border-primary` (semantic tokens)
- Avoid `bg-white`, `text-gray-500`, `bg-blue-500` (hardcoded colors)
- Component variants over custom styling
- Test in light/dark/system themes
- Industrial color palette: Dusty Blue, Sandy Beige, Warm Taupe, Dark Charcoal
- Visual enhancement guide: `docs/UI_VISUAL_ENHANCEMENTS.md`

## Troubleshooting

**Build Errors**: Verify environment variables, run `npm run typecheck`, update database schema

**Database**: Check Supabase URL/keys, verify RLS policies, ensure service role permissions

**AI Integration**: Verify OpenAI key/billing, check rate limits/quotas, validate prompts, review cache/security settings

**Performance**: Check lazy loading, verify caching, monitor connection pooling, review bundle sizes

**Visual/UI Issues**: Check for duplicate properties in tailwind.config.ts, restart dev server after theme changes, verify CSS variables in globals.css, ensure Framer Motion imports

**Debug Mode**: Set `NEXT_PUBLIC_DEBUG=true` for detailed logging, AI prompt/response logs, performance timing

## Production Status

**Platform Status**: Active Development

**Completed Features**: 11 service calculators, 15 AI endpoints, 3D visualization, drone integration, guided workflows, service layer architecture, performance optimization, security implementation, error handling, advanced UI polish system, real-time systems, PWA capabilities, session management, AI intelligence features, visual design system, AI assistant interfaces, analytics dashboards

**Technical Stack**: Next.js 15 application with TypeScript, Supabase backend, OpenAI integration, Framer Motion animations, contextual UX patterns, real-time pricing, browser crash recovery, smart auto-save, cross-step validation, progressive web app features, industrial color palette, glass morphism effects, gradient overlays

**Architecture**: Service layer architecture, enterprise security (RLS, rate limiting, validation), multi-level caching, monitoring/analytics, strict type safety

**Active Development**: TypeScript migration fixes, Next.js 15 compatibility updates, database schema refinements, continuous improvements

## Contributing

**Code Quality**: Run `npm run lint`, ensure tests pass, follow patterns

**Git Workflow**: Feature branches from main, descriptive commits, production check before merge

**Documentation**: Update CLAUDE.md for architecture changes, JSDoc for complex functions

## Resources

**External**: [Next.js](https://nextjs.org/docs), [Supabase](https://supabase.com/docs), [Tailwind](https://tailwindcss.com/docs), [OpenAI](https://platform.openai.com/docs)

**Internal Documentation**:

- `docs/design-system.md` - Design system guidelines
- `docs/test-calculators.md` - Calculator testing guide
- `docs/facade-analysis-guide.md` - Facade analysis implementation
- `docs/AI_DEPLOYMENT_GUIDE.md` - AI deployment instructions
- `docs/THEME_GUIDE.md` - Professional theme system guide
- `docs/UI_VISUAL_ENHANCEMENTS.md` - Visual enhancement guide
- `docs/database-setup-guide.md` - Database configuration
- `docs/mobile-optimization-guide.md` - Mobile optimization strategies

# Project Guide for Claude

## Key commands

- `npm run fmt` – format files with Prettier
- `npm run lint` – lint code with ESLint (no warnings allowed)

## Expectations

1. All code must pass these commands.
2. Commit messages follow Conventional Commits (hint: `feat: …`, `fix: …`).

Claude: ALWAYS run `npm run fmt && npm run lint` after you edit or create files.

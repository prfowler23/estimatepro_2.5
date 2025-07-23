# EstimatePro - AI-Powered Building Services Estimation Platform

## Project Overview

EstimatePro is a comprehensive Next.js 14 application for building services contractors featuring AI-enhanced workflows, photo analysis, document extraction, 11 specialized service calculators, 3D visualization, drone integration, and professional estimate generation.

### Key Features

- **9 AI Endpoints**: Photo analysis, document extraction, competitive intelligence, risk assessment, auto-quote generation
- **11 Service Calculators**: Real-time calculations for window cleaning, pressure washing, 3D modeling, etc.
- **3D Visualization & Drone Integration**: Building modeling, aerial inspection, flight planning
- **Guided Workflows**: Step-by-step estimation with validation and state persistence
- **Enterprise Architecture**: Service layer, transaction support, caching, lazy loading, security
- **Advanced UI Polish**: Skeleton loaders, contextual error handling, empty states, micro-interactions (NEW)

## Technology Stack

**Frontend**: Next.js 14, TypeScript, Tailwind CSS, React Hook Form + Zod, Zustand, React Query, Radix UI, Framer Motion

**Backend**: Supabase (PostgreSQL, Auth, RLS), OpenAI GPT-4, Weather API, Resend Email

**Processing**: jsPDF, React PDF, XLSX, html2canvas

## Project Structure

```
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── ai/                   # 9 specialized AI endpoints
│   │   │   ├── auto-quote/       # Automated quote generation
│   │   │   ├── competitive-intelligence/ # Market analysis
│   │   │   ├── enhanced-photo-analysis/ # Advanced photo processing
│   │   │   ├── extract-contact-info/ # Contact extraction
│   │   │   ├── extract-documents/ # Document processing
│   │   │   ├── follow-up-automation/ # Automated follow-ups
│   │   │   └── risk-assessment/  # Automated risk analysis
│   │   ├── analytics/            # Analytics API
│   │   ├── analyze-photos/       # Photo analysis
│   │   ├── customers/            # Customer management
│   │   ├── drone/                # Drone operations API (NEW)
│   │   ├── estimation-flows/     # Guided flow API
│   │   └── quotes/               # Legacy quote operations
│   ├── auth/                     # Authentication pages
│   ├── calculator/               # Service calculator page
│   ├── dashboard/                # Main dashboard
│   ├── estimates/                # Estimate management (NEW)
│   │   ├── [id]/                 # Individual estimate pages
│   │   └── new/guided/           # Guided estimation flow
│   ├── 3d-demo/                  # 3D visualization demo (NEW)
│   ├── drone-demo/               # Drone integration demo (NEW)
│   └── settings/                 # Application settings
├── components/                   # React components
│   ├── ai/                       # AI-related components
│   ├── calculator/               # Service calculators with lazy loading
│   ├── canvas/                   # Drawing and measurement tools
│   ├── drone/                    # Drone operations components (NEW)
│   ├── duration/                 # Timeline and scheduling
│   ├── error-handling/           # Error boundaries and handling (NEW)
│   ├── estimation/               # Guided estimation flow
│   ├── expenses/                 # Cost breakdown components
│   ├── pricing/                  # Pricing strategy tools
│   ├── takeoff/                  # Measurement and takeoff
│   ├── visualizer/               # 3D visualization components (NEW)
│   └── ui/                       # Reusable UI components with lazy loading (ENHANCED)
│       ├── skeleton.tsx          # Advanced skeleton loaders with animations
│       ├── error-alert.tsx       # Contextual error handling with recovery
│       ├── empty-state.tsx       # Intelligent empty states with guidance
│       ├── button.tsx            # Enhanced buttons with ripple & haptic feedback
│       └── mobile-bottom-nav.tsx # Advanced mobile navigation with micro-interactions
├── lib/                          # Core utilities and services
│   ├── ai/                       # AI service integrations (ENHANCED)
│   │   ├── ai-cache.ts           # AI response caching
│   │   ├── ai-config.ts          # AI configuration management
│   │   ├── ai-security.ts        # AI security and validation
│   │   └── optimized-prompts.ts  # Performance-optimized prompts
│   ├── calculations/             # Service calculation engines
│   ├── config/                   # Application configuration
│   ├── drone/                    # Drone service framework (NEW)
│   ├── schemas/                  # API validation schemas (NEW)
│   ├── services/                 # Business logic layer (NEW)
│   │   ├── ai-service.ts         # AI business logic
│   │   ├── calculator-service.ts # Calculator business logic
│   │   ├── estimate-service.ts   # Estimate business logic
│   │   └── workflow-service.ts   # Workflow management
│   ├── stores/                   # Zustand state management
│   ├── supabase/                 # Database client/server
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions (ENHANCED)
│   │   ├── cache.ts              # Caching utilities
│   │   ├── database-optimization.ts # DB performance
│   │   ├── null-safety.ts        # Type-safe null handling
│   │   └── retry-logic.ts        # Retry mechanisms
│   ├── validation/               # Validation utilities (NEW)
│   └── visualization/            # 3D visualization engine (NEW)
├── contexts/                     # React contexts
├── hooks/                        # Custom React hooks
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

# Feature Flags (all default true)
NEXT_PUBLIC_ENABLE_AI=true
NEXT_PUBLIC_ENABLE_3D=true
NEXT_PUBLIC_ENABLE_DRONE=true
NEXT_PUBLIC_DEBUG=false

# Performance Settings
AI_CACHE_TTL=3600
AI_RATE_LIMIT_PER_MINUTE=100
CACHE_TTL=1800
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

# Add transaction support (run once)
node scripts/run-transaction-migration.js

# Create sample data for development
node scripts/create-sample-data.js

# Verify database setup and connectivity
node scripts/production-check.js
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
# Test analytics functionality
node scripts/test-analytics.js

# Run TypeScript compilation check
npm run typecheck

# Validate database migrations
node scripts/migrate-database.js

# Production verification
bash scripts/production-verify.sh
```

## Architecture

**Component Organization**: Feature-based structure with atomic design principles and strict separation of concerns

**State Management**: Zustand (global state), React Query (server state), React Context (auth/theme), Service Layer (business logic)

**Data Flow**: Components → Hooks → Stores → API Routes → Services → Supabase → Database

### Security & Validation

**Database**: RLS policies, ACID transactions, input sanitization, encryption, audit logging

**Application**: Environment validation, CSP, API rate limiting, Supabase Auth, RBAC

**AI Security**: Input validation (`ai-security.ts`), response sanitization, rate limiting, content filtering

**Validation**: Zod schemas, API validation, null safety, error boundaries

## Service Calculators

**11 Specialized Calculators**: Window Cleaning, Pressure Washing, Soft Washing, Biofilm Removal, Glass/Frame Restoration, High Dusting, Final Clean, Granite Reconditioning, Pressure Wash & Seal, Parking Deck

**Features**: Material costs, labor estimation, equipment requirements, markup/margin settings, risk adjustments

## AI Integration

**9 AI Endpoints**: Enhanced photo analysis, facade analyzer, document extraction, contact extraction, auto-quote generation, competitive intelligence, risk assessment, follow-up automation

**Core Features**: GPT-4 Vision analysis, automated scope extraction, service recommendations, timeline predictions

**Performance**: Intelligent caching (`ai-cache.ts`), rate limiting, optimized prompts, error recovery (`ai-error-handler.ts`)

**Safety**: Schema validation, content filtering, confidence scoring, human-in-the-loop reviews

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

## Advanced UI Polish System (NEW)

**Skeleton Loading Components**: Intelligent loading states with multiple animation variants (shimmer, pulse, wave), contextual skeleton patterns for cards, lists, tables, and text blocks with staggered animations

**Contextual Error Handling**: Advanced error alert system with type-specific recovery suggestions, copy functionality, dismissible states, and progressive error disclosure for network, validation, server, and permission errors

**Empty State Management**: Pre-configured empty states for all major sections (estimates, customers, photos, analytics) with contextual guidance, helpful actions, and professional illustrations

**Enhanced Micro-Interactions**: Framer Motion-powered button animations with ripple effects, haptic feedback for mobile, spring animations, and custom motion properties for professional touch interactions

**Mobile-First Polish**: Advanced touch feedback, gesture recognition, enhanced bottom navigation with badges and animations, optimized for one-handed usage with proper touch targets

**Performance-Optimized Animations**: 60fps animations, intelligent staggered loading, memory-efficient transitions, and device-specific optimizations for smooth interactions across all devices

## Service Layer Architecture

**Business Services**:

- `estimate-service.ts`: CRUD operations, validation, status management, data transformation
- `ai-service.ts`: Centralized AI communication, caching, error recovery, rate limiting
- `calculator-service.ts`: Real-time calculations, validation, historical data integration
- `workflow-service.ts`: Guided flow orchestration, step validation, state persistence

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

**Test Files**: `calculator.test.tsx`, `photo-analysis.test.ts`, `service-validation.test.ts`

## Performance Optimization

**Code Splitting**: Dynamic component loading (`lazy-forms.tsx`, `lazy-components.tsx`), route-based splitting, optimized chunks

**Caching**: Multi-level caching, AI response caching, database query caching, service worker integration

**Database**: Connection pooling (`database-optimization.ts`), query optimization, transaction batching, read replicas

**Assets**: Next.js Image optimization, WebP conversion, CDN integration, progressive loading

**Runtime**: Memory management, error boundaries, performance monitoring, bundle analysis

**UI Performance** (NEW): Framer Motion animations optimized for 60fps, skeleton loading states for perceived performance, intelligent staggered animations, mobile-first touch interactions

## Deployment

**Production Checklist**: `npm run production-check`, verify environment variables, security audit, build and test

**Configuration**: Supabase production DB, OpenAI API limits, Resend email, domain/SSL setup

**Monitoring**: Performance monitoring, error tracking, usage analytics

## Common Development Tasks

**Service Calculator**: Create form (`components/calculator/forms/`), add logic (`lib/calculations/services/`), update constants, validation schema, write tests

**AI Features**: Create prompts (`lib/ai/`), add processing logic, update service (`lib/services/ai-service.ts`), create UI, add API endpoints, update types/validation/caching/security

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

## Troubleshooting

**Build Errors**: Verify environment variables, run `npm run typecheck`, update database schema

**Database**: Check Supabase URL/keys, verify RLS policies, ensure service role permissions

**AI Integration**: Verify OpenAI key/billing, check rate limits/quotas, validate prompts, review cache/security settings

**Performance**: Check lazy loading, verify caching, monitor connection pooling, review bundle sizes

**Debug Mode**: Set `NEXT_PUBLIC_DEBUG=true` for detailed logging, AI prompt/response logs, performance timing

## Production Status

**🎉 100% Implementation Complete**

**Completed Features**: 11 service calculators, 9 AI endpoints, 3D visualization, drone integration, guided workflows, service layer architecture, performance optimization, security implementation, error handling, TypeScript compilation, advanced UI polish system (NEW)

**Technical Achievements**: Production-grade architecture, enterprise security (RLS, rate limiting, validation), multi-level caching, monitoring/analytics, strict type safety, Framer Motion animations, contextual UX patterns (NEW)

**Deployment Ready**: Environment configuration, production scripts, database migrations, feature flags, monitoring integration, security hardening

**Enterprise Ready**: Scalable architecture, multi-user support, high-volume optimization, RESTful APIs, compliance & security

## Contributing

**Code Quality**: Run `npm run lint`, ensure tests pass, follow patterns

**Git Workflow**: Feature branches from main, descriptive commits, production check before merge

**Documentation**: Update CLAUDE.md for architecture changes, JSDoc for complex functions

## Resources

**External**: [Next.js](https://nextjs.org/docs), [Supabase](https://supabase.com/docs), [Tailwind](https://tailwindcss.com/docs), [OpenAI](https://platform.openai.com/docs)

**Internal**: `docs/design-system.md`, `docs/test-calculators.md`, `DEPLOYMENT_GUIDE.md`, `INTEGRATION_GUIDE.md`

# Project Guide for Claude

## Key commands

- `npm run fmt` – format files with Prettier
- `npm run lint` – lint code with ESLint (no warnings allowed)

## Expectations

1. All code must pass these commands.
2. Commit messages follow Conventional Commits (hint: `feat: …`, `fix: …`).

Claude: ALWAYS run `npm run fmt && npm run lint` after you edit or create files.

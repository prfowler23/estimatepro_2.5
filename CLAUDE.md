# EstimatePro - AI-Powered Building Services Estimation Platform

## Project Overview

Next.js 15 application for building services contractors with AI-enhanced workflows, real-time pricing, session recovery, 11 service calculators, 3D visualization, drone integration, and PWA capabilities.

## Core Features

| Category                | Features                                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **AI Systems**          | 15 endpoints: photo/facade analysis, document extraction, auto-quotes, risk assessment, conversations, analytics |
| **Service Calculators** | 11 real-time calculators: window cleaning, pressure washing, biofilm removal, etc.                               |
| **Real-Time**           | Live pricing, cross-step validation, dependency tracking, smart auto-save                                        |
| **Session Management**  | Browser crash recovery, multi-tab sync, progressive restoration                                                  |
| **3D/Drone**            | Building modeling, aerial inspection, flight planning, measurement tools                                         |
| **PWA**                 | Offline functionality, background sync, native app experience                                                    |
| **UI/UX**               | Industrial design system, skeleton loaders, micro-interactions, glass morphism                                   |
| **Performance**         | Multi-layer caching (70-90% improvement), error monitoring, Web Vitals                                           |

## Technology Stack

| Layer          | Technologies                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| **Frontend**   | Next.js 15, TypeScript, Tailwind CSS, React Hook Form + Zod, Zustand, React Query, Radix UI, Framer Motion |
| **Backend**    | Supabase (PostgreSQL, Auth, RLS), OpenAI GPT-4, AccuWeather API, Resend Email                              |
| **Processing** | jsPDF, React PDF, XLSX, html2canvas, Sentry                                                                |
| **PWA**        | Service Workers, Background Sync, Push Notifications                                                       |

## Available MCP Servers & Subagents

| Type      | Name                   | Capabilities                                                                       |
| --------- | ---------------------- | ---------------------------------------------------------------------------------- |
| **MCP**   | supabase               | Database ops, migrations, Edge Functions, monitoring, TypeScript generation        |
| **MCP**   | zen                    | AI workflows, code review, security audits, test generation, pre-commit validation |
| **Agent** | general-purpose        | Research, code search, multi-step tasks                                            |
| **Agent** | sql-pro                | Complex SQL queries, optimization, schema design (CTEs, window functions)          |
| **Agent** | senior-code-reviewer   | Code quality analysis, architecture review, security assessment                    |
| **Agent** | ui-engineer            | Frontend development, UI components, accessibility compliance                      |
| **Agent** | mcp-development-expert | MCP protocol development, client/server implementation                             |

## Project Structure

| Directory         | Purpose             | Key Files                                                           |
| ----------------- | ------------------- | ------------------------------------------------------------------- |
| **app/**          | Next.js App Router  |                                                                     |
| └── api/          | API routes          | 15 AI endpoints, analytics, monitoring, drone, estimates            |
| └── (pages)/      | Application pages   | dashboard, calculator, estimates, ai-assistant, 3d-demo, drone-demo |
| **components/**   | React components    |                                                                     |
| └── ai/           | AI components       | FacadeAnalysisForm, SmartField, AIBusinessInsights                  |
| └── calculator/   | Service calculators | 11 calculator forms with lazy loading                               |
| └── estimation/   | Guided workflows    | RealTimeCostBreakdown, ProgressiveValidation                        |
| └── ui/           | Reusable UI         | skeleton, error-alert, enhanced-card, mobile components             |
| **lib/**          | Core utilities      |                                                                     |
| └── ai/           | AI services         | response-cache, security, smart-defaults-engine                     |
| └── services/     | Business logic      | 25+ services: estimate, ai, calculator, session-recovery            |
| └── optimization/ | Performance         | cache-coordinator, caching strategies                               |
| └── monitoring/   | Error tracking      | advanced-error-analytics, mobile-web-vitals                         |
| **hooks/**        | Custom hooks        | useAutoSave, useRealTimePricing, useSessionRecovery                 |

## Development Setup

## Development Setup

### Prerequisites

- Node.js 18+, npm
- Supabase account/project
- API keys: OpenAI, Resend, AccuWeather
- Optional: Sentry (error tracking)

### Environment Variables

**Core Services:**

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
RESEND_API_KEY=your_resend_api_key
ACCUWEATHER_API_KEY=your_accuweather_api_key
```

**AI Configuration:**

```bash
AI_VISION_MODEL=gpt-4o
AI_DEFAULT_MODEL=gpt-4-turbo
FACADE_ANALYSIS_MODEL_VERSION=v8.0
CONFIDENCE_THRESHOLD=85
AI_MAX_TOKENS=4000
AI_CACHE_TTL=3600
```

**Feature Flags (default: true):**

```bash
NEXT_PUBLIC_ENABLE_AI=true
NEXT_PUBLIC_ENABLE_3D=true
NEXT_PUBLIC_ENABLE_DRONE=true
NEXT_PUBLIC_ENABLE_FACADE_ANALYSIS=true
```

**Optional - Error Tracking:**

```bash
SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
```

### Installation & Setup

```bash
npm install                    # Install dependencies
npm run setup-db              # Set up database schema
npm run migrate               # Run database migrations
npm run dev                   # Start development server
```

## Development Commands

### Core Workflow (ENFORCED)

```bash
# MANDATORY before commits:
npm run fmt && npm run lint && npm run typecheck

# Development
npm run dev                   # Start with hot reload
npm run build && npm run start # Test production build
```

### Database Operations

```bash
node scripts/setup-basic-schema.js        # Initialize schema
node scripts/run-migration.js             # Standard migrations
node scripts/run-transaction-migration.js  # Add transaction support
node scripts/create-sample-data.js         # Development data
node scripts/production-check.js           # Verify setup
```

### Testing & Validation

```bash
npm run typecheck                      # TypeScript compilation
node scripts/test-real-time-pricing.js   # Test pricing system
node scripts/test-session-recovery.js    # Test recovery system
node scripts/test-sentry-integration.js  # Test error tracking
bash scripts/production-verify.sh        # Production readiness
```

## Architecture Requirements

**AI Integration:** Use `/lib/ai/` services only, validate with `ai-security.ts`, check cache before API calls

**Service Layer:** All business logic in `/lib/services/`, use transactions, validate RLS policies

**Documentation Sync:** Keep CLAUDE.md, `.cursor/.cursorrules`, and `docs/THEME_GUIDE.md` aligned

## Architecture

**Structure:** Feature-based components with atomic design and strict separation of concerns  
**State:** Zustand (global), React Query (server), React Context (auth/theme), Service Layer (business)  
**Data Flow:** Components → Hooks → Stores → API Routes → Services → Supabase → Database

### Type System

| Directory     | Purpose        | Examples                                             |
| ------------- | -------------- | ---------------------------------------------------- |
| `/types/`     | Database types | Supabase generated, EstimateRow                      |
| `/lib/types/` | Domain types   | Business logic, EstimateDocument, EstimateStoreState |

**Type Aliases:** DatabaseEstimate → EstimateRow, UIEstimate → EstimateDocument, StoreEstimate → EstimateStoreState

### Security & Validation

| Layer           | Implementation                                                              |
| --------------- | --------------------------------------------------------------------------- |
| **Database**    | RLS policies, ACID transactions, encryption, audit logging                  |
| **Application** | Environment validation, CSP, rate limiting, Supabase Auth, RBAC             |
| **AI**          | Input validation (ai-security.ts), response sanitization, content filtering |
| **Validation**  | Zod schemas, null safety, error boundaries                                  |

## Service Calculators

**11 Specialized Calculators:** Window Cleaning, Pressure Washing, Soft Washing, Biofilm Removal, Glass/Frame Restoration, High Dusting, Final Clean, Granite Reconditioning, Pressure Wash & Seal, Parking Deck, AI Facade Analysis

**Features:** Material costs, labor estimation, equipment requirements, markup/margin settings, risk adjustments, AI-powered measurements

## AI Integration

**15 AI Endpoints:** Enhanced photo analysis, facade analysis, document extraction, competitive intelligence, risk assessment, auto-quotes, AI assistant, conversations, analytics, metrics, usage tracking, contact extraction, follow-up automation

**Intelligence Features:** Smart service suggestions, cross-step population, context-aware defaults, business insights dashboard

**Core:** GPT-4 Vision analysis, automated scope extraction, timeline predictions  
**Performance:** Multi-layer caching, rate limiting, optimized prompts, error recovery  
**Safety:** Schema validation, content filtering, confidence scoring, human oversight

### AI Facade Analysis

**Computer vision system** for automated building measurement and material classification from photos.

**Capabilities:** Window detection (95% accuracy), material classification (85%+ confidence), height estimation (±3% accuracy), area detection, multi-angle fusion

**Integration:** Service calculators, guided workflows, 3D visualization, professional reports

**Tech:** GPT-4 Vision, real-time validation, confidence scoring, RLS security

## 3D Visualization & Drone Integration

**3D Engine:** Canvas-based rendering, interactive building modeling, measurement tools, pan/zoom/rotate controls

**Drone Platform:** AI flight planning, multi-drone fleet management, weather integration, FAA Part 107 compliance, 4K/6K photography, thermal imaging, automated 3D mapping

**Features:** Real-time analysis, drawing tools, export capabilities, guided flow integration

**Demos:** `/3d-demo` and `/drone-demo` pages (feature flags: `NEXT_PUBLIC_ENABLE_3D`, `NEXT_PUBLIC_ENABLE_DRONE`)

## UI/UX System

**Visual Design:** Industrial color palette (Dusty Blue, Sandy Beige, Warm Taupe, Dark Charcoal), glass morphism effects, gradient overlays, professional animations

**Loading States:** Intelligent skeleton loaders with animation variants (shimmer, pulse, wave), contextual patterns, staggered animations

**Error Handling:** Advanced alert system with recovery suggestions, progressive disclosure, copy functionality

**Empty States:** Pre-configured states for all sections with contextual guidance and helpful actions

**Micro-Interactions:** Framer Motion animations, ripple effects, haptic feedback, 60fps performance

**Mobile:** Advanced touch feedback, gesture recognition, enhanced bottom navigation, one-handed optimization

## Service Layer Architecture

**Core Services:** estimate (CRUD, validation), ai (communication, caching), calculator (real-time calculations), workflow (guided flows), analytics (data collection), photo (processing), risk-assessment, weather, performance-optimization

**Real-Time & Session:** real-time-pricing, session-recovery (crash recovery), auto-save (conflict detection), cross-step-population (AI-driven), cross-step-validation, dependency-tracking

**Database:** ACID transactions, connection pooling, null safety, Zod validation

**Performance:** Multi-level caching, intelligent invalidation, retry logic, monitoring

**Reliability:** Error boundaries, graceful degradation, detailed logging

## Database Schema

**Core Tables:** profiles, estimates, estimate_services, estimate_flows, measurements, analytics_events

**Enhanced Models:** ai_analysis_cache, service_calculations, workflow_steps, document_extractions, risk_assessments

**Features:** ACID transactions, optimized indexes, real-time subscriptions, RLS policies, audit trails

## Testing Strategy

**Frameworks:** Jest + React Testing Library (components, utilities), API/database/AI integration tests

**Coverage:** Cross-step population, session recovery, real-time pricing, facade analysis, calculators, photo analysis, service validation

## Performance Optimization

**70-90% Performance Improvement** through comprehensive optimization:

**Code Splitting:** Dynamic loading, route-based splitting, optimized chunks

**Caching:** Multi-level (AI, database, service worker), intelligent invalidation

**Database:** Connection pooling, query optimization, transaction batching

**Assets:** Next.js Image optimization, WebP conversion, CDN, progressive loading

**Runtime:** Memory management, error boundaries, monitoring, bundle analysis

**UI:** 60fps animations, skeleton loading, mobile-first interactions

**AI Optimizations:** Progressive uploads, parallel processing, result caching, lazy loading

## Progressive Web App (PWA) Features

**Core PWA:** Complete offline functionality, background sync, native app experience, push notifications, service worker management

**Mobile Enhancements:** Enhanced touch support with haptic feedback, optimized photo workflows, swipe gestures, advanced bottom navigation

**Services:** `pwa-service.ts` (management), `offline-manager.ts` (sync), `pwa-status.tsx` (indicators)

## Real-Time Systems

**Real-Time Pricing:** Live calculations with confidence scoring, cross-step validation, debounced updates, dependency tracking

**Session Recovery:** Browser crash detection, multi-device sync, progressive restoration, tab management

**Smart Auto-Save:** Intelligent triggering, conflict detection, change tracking, visual feedback

## Validation & Security

**Cross-Step Validation:** Inter-step consistency checks, progressive validation, dependency tracking, real-time feedback

**Data Security:** XSS/injection protection, input sanitization, Zod validation, content filtering

**Progressive System:** Smart validation hints, contextual error messaging, recovery suggestions

## Deployment

**Production Checklist**: `npm run production-check`, verify environment variables, security audit, build and test

**Configuration**: Supabase production DB, OpenAI API limits, Resend email, domain/SSL setup

**Monitoring**: Performance monitoring, error tracking, usage analytics

## Common Development Tasks

| Task Type              | Steps                                                                            |
| ---------------------- | -------------------------------------------------------------------------------- |
| **Service Calculator** | Create form → Add logic → Update validation → Write tests                        |
| **AI Features**        | Create prompts → Update service → Create UI → Add APIs → Update security         |
| **Real-Time**          | Extend service → Add components → Implement WebSockets → Add validation          |
| **Session Management** | Extend recovery service → Add UI → Implement storage → Add conflict resolution   |
| **PWA**                | Update service → Add offline capabilities → Implement sync → Add native features |
| **Database**           | Write migration SQL → Test locally → Update types → Add service logic            |
| **3D/Drone**           | Extend engine → Update components → Add analysis → Integrate workflow            |

## Code Conventions

**Standards:** See `.cursor/.cursorrules` and `docs/THEME_GUIDE.md` for complete guidelines

**TypeScript:** Strict .ts/.tsx only, no `any` types, explicit interfaces

**Architecture:** UI components (no business logic) → Services (/lib/services) → Database

**Naming:** Components (PascalCase), Files (kebab-case), Functions (camelCase), Constants (SCREAMING_SNAKE_CASE)

**Styling:** Semantic tokens only (`bg-bg-base`, `text-text-primary`), avoid hardcoded colors, industrial color palette, test all themes

## Troubleshooting

| Issue              | Solution                                                 |
| ------------------ | -------------------------------------------------------- |
| **Build Errors**   | Verify env vars → Run typecheck → Update schema          |
| **Database**       | Check Supabase keys → Verify RLS → Ensure permissions    |
| **AI Integration** | Verify OpenAI key → Check limits → Review cache/security |
| **Performance**    | Check lazy loading → Verify caching → Review bundles     |
| **Visual/UI**      | Check tailwind.config → Restart dev → Verify CSS vars    |
| **Debug**          | Set `NEXT_PUBLIC_DEBUG=true` for detailed logging        |

## Production Status

**Status:** Active Development

**Completed:** 11 service calculators, 15 AI endpoints, 3D/drone integration, guided workflows, service layer architecture, 70-90% performance optimization, error monitoring/recovery, real-time systems, PWA capabilities, session management, AI intelligence, visual design system, analytics dashboards

**Stack:** Next.js 15, TypeScript, Supabase, OpenAI, Framer Motion, industrial design system

**Architecture:** Service layer, enterprise security, multi-level caching, comprehensive monitoring, strict type safety

**Active:** TypeScript migration, Next.js 15 compatibility, schema refinements

## Contributing & Resources

**Code Quality:** Run linting → Ensure tests pass → Follow patterns  
**Git Workflow:** Feature branches → Descriptive commits → Production check before merge  
**Documentation:** Update CLAUDE.md for architecture changes

**External Resources:** [Next.js](https://nextjs.org/docs), [Supabase](https://supabase.com/docs), [Tailwind](https://tailwindcss.com/docs), [OpenAI](https://platform.openai.com/docs)

**Internal Docs:** `docs/` - Design system, testing guides, theme system, performance optimization, mobile strategies

---

# Project Guide for Claude

**Key Commands:** `npm run fmt` (format), `npm run lint` (lint - no warnings)

**Requirements:** All code must pass commands, use Conventional Commits (`feat:`, `fix:`)

**Claude:** ALWAYS run `npm run fmt && npm run lint` after editing files

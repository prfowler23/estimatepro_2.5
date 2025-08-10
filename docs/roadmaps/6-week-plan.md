# EstimatePro 6-Week Remediation Roadmap

**Timeline**: 6 weeks, 1-2 hours daily  
**Target**: A- architecture grade (92/100) with deployment readiness  
**Approach**: Critical fixes first, then systematic modernization

## Week 1: Critical System Recovery (Build & Deploy)

_Focus Area: a) Supabase Performance Optimization + Emergency Fixes_

### Day 1-2: Build System Recovery [90 min total]

**Critical Path**: Restore development workflow

- [ ] **Fix Redis Client Issue** [60 min] `[Critical]` `[High Impact]`
  - Move `lib/cache/redis-client.ts` to server-only context
  - Update `ai-cache-service.ts` to use conditional Redis import
  - Remove Redis imports from `RoutePreloader.tsx`
  - Verify build succeeds: `npm run build`

- [ ] **Next.js 15 Route Handler Fixes** [30 min] `[Critical]` `[High Impact]`
  - Update route handler signatures in 3 affected files:
    - `app/api/ai/auto-estimate/route.ts`
    - `app/api/integrations/quickbooks/sync/route.ts`
    - `app/api/process/route.ts`
  - Change `context?: { params?: Record<string, string> }` → `context: { params: Promise<Record<string, string>> }`
  - Verify typecheck: `npm run typecheck`

### Day 3-4: Database Performance Baseline [90 min total]

**Focus Area**: Establish monitoring foundation

- [ ] **Supabase Security Hardening** [45 min] `[Security]` `[Low Effort]`
  - Enable leaked password protection in Supabase dashboard
  - Configure additional MFA options (TOTP, recovery codes)
  - Verify security advisor warnings cleared

- [ ] **Performance Monitoring Setup** [45 min] `[Performance]` `[Medium Impact]`
  - Implement basic Supabase query monitoring
  - Add slow query detection to `optimized-query-service.ts`
  - Create performance dashboard endpoint
  - Document baseline performance metrics

### Day 5-7: Test Infrastructure Recovery [90 min total]

**Focus Area**: Minimum viable testing foundation

- [ ] **Fix Failing Tests** [60 min] `[Quality]` `[Medium Impact]`
  - Fix service import issues in `monitoring-service.test.ts`
  - Update test utilities for service mocking
  - Ensure test suite runs: `npm run test`

- [ ] **Core Service Test Coverage** [30 min] `[Quality]` `[Medium Impact]`
  - Add basic tests for `ai-service.ts` (happy path only)
  - Add basic tests for `estimate-service.ts` (CRUD operations)
  - Target: Bring core services to >20% coverage

**Week 1 Deliverables**:

- ✅ Deployable build system
- ✅ Type safety restored
- ✅ Basic performance monitoring
- ✅ Security warnings cleared
- 📈 Test coverage: 12.87% → 25%

---

## Week 2: Service Architecture Consolidation

_Focus Areas: b) Service Architecture Consolidation + c) Migration Completion_

### Day 8-10: AI Services Consolidation [90 min total]

**Focus Area**: Reduce AI service fragmentation

- [ ] **AI Service Boundary Analysis** [30 min] `[Architecture]` `[Medium Impact]`
  - Map dependencies between 8 AI services
  - Identify consolidation opportunities
  - Design unified AI service interface

- [ ] **AI Cache Service Integration** [60 min] `[Performance]` `[Medium Impact]`
  - Merge `ai-cache-service.ts` functionality into `ai-service.ts`
  - Update all AI service consumers
  - Remove redundant cache service
  - Verify AI caching still functions correctly

### Day 11-12: Estimate Services Consolidation [90 min total]

**Focus Area**: Unify estimate handling

- [ ] **Estimate Service Merge** [60 min] `[Architecture]` `[Medium Impact]`
  - Merge `estimate-crud-service.ts` into `estimate-service.ts`
  - Consolidate CRUD operations with business logic
  - Update all estimate service consumers
  - Maintain validation service separation

- [ ] **Migration Cleanup** [30 min] `[Migration]` `[Low Impact]`
  - Remove deprecated `real-time-pricing-service.ts` (keep v2)
  - Update imports to use v2 service
  - Clean up unused import references

### Day 13-14: Analytics Services Consolidation [90 min total]

**Focus Area**: Reduce analytics service proliferation

- [ ] **Analytics Service Hierarchy** [45 min] `[Architecture]` `[Medium Impact]`
  - Design analytics service hierarchy (core → specialized)
  - Plan consolidation of 13 analytics services
  - Keep 3-4 specialized services, merge rest into core

- [ ] **Analytics Subdirectory Cleanup** [45 min] `[Migration]` `[Low Impact]`
  - Consolidate 5 analytics subdirectory services
  - Update analytics service imports
  - Remove redundant analytics components

**Week 2 Deliverables**:

- 📦 58 services → 45 services (23% reduction)
- 🔧 Unified AI service interface
- 🧹 Deprecated service removal
- 🏗️ Cleaner service boundaries

---

## Week 3: Performance & Observability Foundation

_Focus Areas: d) Performance Monitoring + f) Observability Enhancement_

### Day 15-17: OpenTelemetry Baseline [90 min total]

**Focus Area**: Implement minimal observability

- [ ] **OTel Infrastructure Setup** [60 min] `[Observability]` `[High Impact]`
  - Install OpenTelemetry packages (`@opentelemetry/api`, `@opentelemetry/auto-instrumentations-node`)
  - Configure basic tracing for Next.js API routes
  - Set up console exporter for development
  - Instrument 3 critical paths: estimate creation, AI processing, database queries

- [ ] **Business KPI Tracking** [30 min] `[Observability]` `[Medium Impact]`
  - Implement estimate conversion rate tracking
  - Add AI usage metrics (requests, tokens, success rate)
  - Create KPI dashboard endpoint

### Day 18-19: Performance Optimization [90 min total]

**Focus Area**: Address performance bottlenecks

- [ ] **Database Query Optimization** [60 min] `[Performance]` `[High Impact]`
  - Implement query execution time logging
  - Identify and optimize 3 slowest queries
  - Add database connection pool monitoring
  - Document query performance baselines

- [ ] **Caching Strategy Optimization** [30 min] `[Performance]` `[Medium Impact]`
  - Optimize BaseService cache configuration
  - Implement cache hit rate monitoring
  - Review and optimize AI response cache TTLs

### Day 20-21: Monitoring Dashboard [90 min total]

**Focus Area**: Operational visibility

- [ ] **Performance Dashboard** [60 min] `[Monitoring]` `[Medium Impact]`
  - Create unified performance dashboard component
  - Display OTel metrics, cache hit rates, query performance
  - Integrate with existing monitoring service

- [ ] **Error Tracking Enhancement** [30 min] `[Observability]` `[Medium Impact]`
  - Enhance error-service.ts with structured logging
  - Implement error rate alerts
  - Add error categorization (transient vs permanent)

**Week 3 Deliverables**:

- 📊 OpenTelemetry tracing operational
- 📈 Business KPI tracking active
- 🎯 Performance bottlenecks identified
- 🚨 Error monitoring enhanced

---

## Week 4: Service Layer Modernization

_Focus Areas: b) Service Architecture Consolidation (continued) + e) Microservices Preparation_

### Day 22-24: Domain Module Design [90 min total]

**Focus Area**: Prepare for microservices boundaries

- [ ] **Domain Boundary Analysis** [45 min] `[Architecture]` `[High Impact]`
  - Design 6 domain modules: AI, Estimates, Analytics, Workflow, Infrastructure, Integration
  - Map current services to target modules
  - Define module public APIs and contracts

- [ ] **Service Contract Definition** [45 min] `[Architecture]` `[High Impact]`
  - Create TypeScript interfaces for module boundaries
  - Document service dependencies and data flow
  - Plan gradual service consolidation approach

### Day 25-26: Infrastructure Services Consolidation [90 min total]

**Focus Area**: Reduce infrastructure service complexity

- [ ] **Monitoring Service Merge** [60 min] `[Architecture]` `[Medium Impact]`
  - Merge `monitoring-service.ts` and `enhanced-performance-monitoring-service.ts`
  - Consolidate performance optimization service functions
  - Update monitoring service consumers

- [ ] **Auto-Save Subdirectory Consolidation** [30 min] `[Migration]` `[Low Impact]`
  - Consolidate 5 auto-save services into core auto-save service
  - Simplify auto-save architecture
  - Update auto-save component integrations

### Day 27-28: Validation Services Consolidation [90 min total]

**Focus Area**: Streamline validation architecture

- [ ] **Cross-Step Validation Merge** [60 min] `[Architecture]` `[Medium Impact]`
  - Consolidate 5 validation subdirectory services
  - Merge validation logic into core cross-step-validation service
  - Maintain validation rule engine separation

- [ ] **Workflow Services Consolidation** [30 min] `[Migration]` `[Low Impact]`
  - Evaluate workflow subdirectory services (5 services)
  - Merge workflow progress/step managers into core workflow service
  - Keep workflow templates as separate utility

**Week 4 Deliverables**:

- 📦 45 services → 32 services (44% total reduction from original)
- 🏗️ Domain module boundaries defined
- 📋 Service contracts documented
- 🔧 Simplified validation architecture

---

## Week 5: Test Coverage & Code Quality

_Focus Areas: Testing foundation + Code quality improvements_

### Day 29-31: Core Service Testing [90 min total]

**Focus Area**: Establish testing foundation for critical services

- [ ] **AI Service Testing** [60 min] `[Quality]` `[High Impact]`
  - Comprehensive tests for consolidated ai-service.ts
  - Mock OpenAI API calls, test caching, error handling
  - Test facade analysis integration
  - Target: >70% coverage for AI service

- [ ] **Estimate Service Testing** [30 min] `[Quality]` `[High Impact]`
  - Tests for merged estimate service (CRUD + validation)
  - Mock Supabase calls, test business rules
  - Target: >60% coverage for estimate service

### Day 32-33: Integration Testing [90 min total]

**Focus Area**: Service integration and end-to-end flows

- [ ] **Service Integration Tests** [60 min] `[Quality]` `[Medium Impact]`
  - Test AI service → Estimate service integration
  - Test workflow service orchestration
  - Test real-time pricing service integration
  - Mock external dependencies appropriately

- [ ] **API Route Testing** [30 min] `[Quality]` `[Medium Impact]`
  - Add tests for 3 critical API routes
  - Test request/response validation
  - Test error handling and rate limiting

### Day 34-35: Code Quality Gates [90 min total]

**Focus Area**: Establish quality standards

- [ ] **Test Coverage Gates** [30 min] `[Quality]` `[High Impact]`
  - Configure Jest coverage thresholds (50% minimum)
  - Add coverage reporting to CI pipeline
  - Document testing standards and practices

- [ ] **Code Quality Improvements** [60 min] `[Quality]` `[Medium Impact]`
  - Fix remaining TypeScript strict mode issues
  - Improve error handling in consolidated services
  - Add JSDoc documentation to public service methods

**Week 5 Deliverables**:

- 📈 Test coverage: 25% → 55%
- 🧪 Core services fully tested
- 🚪 Quality gates established
- 📚 Service documentation improved

---

## Week 6: Production Readiness & Documentation

_Focus Areas: g) Developer Experience + Production deployment preparation_

### Day 36-37: ADR Documentation [90 min total]

**Focus Area**: Document architectural decisions

- [ ] **ADR Creation** [60 min] `[Documentation]` `[Medium Impact]`
  - ADR-001: Service Layer Consolidation Strategy
  - ADR-002: AI Service Integration Pattern
  - ADR-003: OpenTelemetry Implementation Approach
  - ADR-004: Database Performance Monitoring Strategy

- [ ] **Architecture Documentation Update** [30 min] `[Documentation]` `[Medium Impact]`
  - Update service architecture diagrams
  - Document new domain module boundaries
  - Update CLAUDE.md with current state

### Day 38-39: Developer Experience Improvements [90 min total]

**Focus Area**: Improve development workflow

- [ ] **Script Optimization** [45 min] `[DX]` `[Medium Impact]`
  - Add `npm run test:quick` for rapid feedback
  - Add `npm run perf:check` for performance regression detection
  - Update pre-deploy pipeline with new quality gates

- [ ] **Development Setup Documentation** [45 min] `[DX]` `[Low Impact]`
  - Update setup instructions for consolidated services
  - Document OpenTelemetry configuration
  - Create troubleshooting guide for common issues

### Day 40-42: Production Deployment Validation [90 min total]

**Focus Area**: Ensure production readiness

- [ ] **Production Build Validation** [60 min] `[Deployment]` `[High Impact]`
  - Full production build test with optimizations
  - Validate all consolidated services function correctly
  - Test critical user journeys end-to-end
  - Performance regression testing

- [ ] **Monitoring & Alerting Configuration** [30 min] `[Operations]` `[High Impact]`
  - Configure production OpenTelemetry exporters
  - Set up basic alerting for error rates and performance
  - Document production monitoring playbook

**Week 6 Deliverables**:

- 📋 ADRs documenting key architectural decisions
- 🛠️ Improved developer experience and tooling
- 🚀 Production-ready deployment pipeline
- 📊 Production monitoring and alerting active

---

## Success Metrics & Validation

### Target Achievements (6-week completion):

- **Architecture Grade**: B+ (87/100) → A- (92/100)
- **Service Count**: 58 → 32 services (44% reduction)
- **Test Coverage**: 12.87% → 55%
- **Build Status**: FAILING → PASSING (all environments)
- **Type Safety**: 20+ errors → 0 errors
- **Performance**: Baseline monitoring → Active optimization
- **Observability**: None → OpenTelemetry + KPI tracking

### Weekly Validation Gates:

- **Week 1**: Build succeeds, tests pass, basic monitoring active
- **Week 2**: Service count reduced by 25%, deprecated services removed
- **Week 3**: OTel tracing operational, performance bottlenecks identified
- **Week 4**: Domain modules defined, service contracts documented
- **Week 5**: Test coverage >50%, quality gates enforced
- **Week 6**: Production deployment ready, monitoring configured

### Risk Mitigation:

- **Time Overruns**: Each task time-boxed to ≤90 minutes, can be completed across sessions
- **Breaking Changes**: All consolidations maintain backward compatibility initially
- **Test Failures**: Maintain existing functionality while adding test coverage
- **Performance Regressions**: Continuous monitoring with rollback capabilities

---

## Post-Roadmap Opportunities (Week 7+)

### Phase 2 Enhancements:

- **Advanced Observability**: Distributed tracing, custom metrics, alerting
- **Microservices Migration**: Extract domain modules to separate services
- **AI Service Optimization**: Advanced caching, model switching, cost optimization
- **Database Scaling**: Read replicas, query optimization, index tuning
- **Security Hardening**: Advanced auth, audit logging, compliance reporting

### Maintenance Cadence:

- **Weekly**: Performance metrics review, error rate analysis
- **Monthly**: Service architecture review, dependency updates
- **Quarterly**: Security audit, performance optimization cycle

---

_Roadmap designed for 1-2 hour daily sessions with architect mindset, safe-mode validation, and measurable outcomes._

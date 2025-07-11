# EstimatePro - Claude AI Context & Project Guide

## Project Overview

EstimatePro is a comprehensive building services estimation platform that revolutionizes how contractors calculate, manage, and deliver professional quotes for building maintenance services.

### Mission Statement
Transform the building services industry by providing accurate, AI-enhanced estimation tools that reduce quote generation time from hours to minutes while maintaining professional accuracy and compliance with industry standards.

### Target Users
- Building service contractors
- Property management companies
- Commercial cleaning companies
- Government facilities management
- Enterprise clients requiring building maintenance

## Core Business Logic

### Service Categories (11 Total Services)

#### 1. Glass Restoration (GR)
- **Pricing**: $70 per window (calculated as glass_sqft ÷ 24)
- **Process**: Remove mineral deposits from exterior glass surfaces
- **Equipment**: MANDATORY scaffold access regardless of building height
- **Time**: 0.5 hours per window + setup + rig time
- **Key Constraints**: Requires temperatures >35°F, <30% precipitation chance

#### 2. Window Cleaning (WC)  
- **Pricing**: $65-75/hour (location-dependent: Charlotte $65, Others $75)
- **Process**: Professional exterior window cleaning
- **Equipment**: Height-dependent (ground, lift, or RDS)
- **Time**: 0.025 hours per window
- **Validation**: Price per window should be $50-90

#### 3. Pressure Washing (PW)
- **Pricing**: $0.15-0.50/sqft (surface type and location dependent)
- **Surface Types**: Regular facade ($0.35), Ornate facade ($0.50), Flat surfaces (location-dependent)
- **Equipment**: Height-dependent access equipment
- **Production Rate**: 350 sqft/hr facade, 1250 sqft/hr flat surface (per person)

#### 4. Pressure Wash & Seal (PWS)
- **Pricing**: $1.25-1.35/sqft (sealer type dependent)
- **Process**: Pressure wash + protective sealer application
- **Production Rate**: Brick 160 sqft/hr, Concrete 120 sqft/hr (per person)
- **Coats**: Multiple coats add 30% each, require drying time between applications

#### 5. Final Clean (FC)
- **Pricing**: $70/hour across all locations
- **Process**: Post-construction detailed cleaning
- **Time**: 0.167 hours per window
- **Special Setup**: 2 × (labor_hours ÷ shift_length) - different from standard setup

#### 6. Frame Restoration (FR)
- **Pricing**: $25 per frame
- **Process**: Window frame repair and restoration
- **Integration**: Typically performed with Glass Restoration for efficiency
- **Time**: 0.117 hours per frame
- **Equipment**: Shares scaffold with GR when combined

#### 7. High Dusting (HD)
- **Pricing**: $0.37-0.75/sqft (complexity dependent)
- **Process**: Remove dust from high surfaces and HVAC systems
- **Access**: Varies by location and surface type

#### 8. Soft Washing (SW)
- **Pricing**: $0.45/sqft
- **Process**: Low-pressure cleaning with specialized chemicals
- **Production Rate**: 1000 sqft/hr per person

#### 9. Parking Deck (PD)
- **Pricing**: $16-23 per parking space (location-dependent)
- **Process**: Pressure washing and maintenance of parking structures
- **Calculation**: Can use either space count or total sqft ÷ 270

#### 10. Granite Reconditioning (GRC)
- **Pricing**: $1.75/sqft
- **Process**: Restore and protect granite surfaces
- **Environment**: Ground level work, requires specific conditions

#### 11. Biofilm Removal (BR)
- **Pricing**: $0.75-1.00/sqft (severity dependent)
- **Process**: Remove biological growth from building surfaces
- **Conditions**: Height-dependent access and equipment needs

### Universal Calculation Rules

#### Setup Time Calculation
- **Standard Services**: Labor hours × 0.25
- **Special Services (FC, FR)**: 2 × (labor_hours ÷ shift_length)

#### Equipment/Rig Time
- **Ground Level**: 0 hours
- **Boom Lift**: 0.25 hours per drop
- **RDS (Rope Descent System)**: 0.5 hours per drop  
- **Scaffold**: 3.0 hours per drop (GR mandatory)

#### Access Method Selection
- **1-2 Stories**: Ground level equipment
- **3-5 Stories**: Boom lift or scissor lift
- **6+ Stories**: RDS or scaffold (GR always scaffold)

#### Location-Based Pricing
- **Raleigh**: Standard rates
- **Charlotte**: 15% lower pressure wash flat rates ($0.15 vs $0.19)
- **Greensboro**: Same as Raleigh rates

### Validation Rules

#### Business Logic Validation
- Glass area cannot exceed 90% of total facade area
- Setup time must be 15-35% of total labor hours
- Price per window must be $50-90 range
- Maximum building height: 60 stories

#### Input Validation
- All measurements must be positive numbers
- Building height must be 1-60 stories
- Glass percentage must be 0-90%
- Service selections must be valid combinations

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand for global state, React Query for server state
- **Forms**: React Hook Form with Zod validation
- **3D Visualization**: Three.js with React Three Fiber

### Backend Stack
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **AI Integration**: OpenAI GPT-4 and Claude API

### Database Schema

#### Core Tables
```sql
-- User profiles extending Supabase auth
profiles (id, full_name, email, role, company_name, phone, avatar_url)

-- Quote management
quotes (id, quote_number, customer_info, building_info, total_price, status, created_by)

-- Individual services per quote
quote_services (id, quote_id, service_type, pricing_details, calculation_details)

-- Location and service-based rates
service_rates (id, service_type, location, base_rate, unit_type, effective_date)

-- User activity tracking
analytics_events (id, event_type, event_data, user_id, session_id)

-- AI facade analysis results
ai_analysis_results (id, quote_id, analysis_type, analysis_data, confidence_score)
```

#### Service Types Reference
```typescript
const SERVICE_TYPES = {
  'GR': 'Glass Restoration',
  'WC': 'Window Cleaning',
  'PW': 'Pressure Washing',
  'PWS': 'Pressure Wash & Seal',
  'FC': 'Final Clean',
  'FR': 'Frame Restoration',
  'HD': 'High Dusting',
  'SW': 'Soft Washing',
  'PD': 'Parking Deck',
  'GRC': 'Granite Reconditioning',
  'BR': 'Biofilm Removal'
} as const
```

### Calculation Engine

#### BaseCalculator Structure
```typescript
abstract class BaseCalculator {
  protected location: Location
  protected rates: ServiceRates
  
  abstract calculate(input: CalculationInput): CalculationResult
  
  protected validateInput(input: CalculationInput): ValidatedInput
  protected calculateLaborHours(input: ValidatedInput): number
  protected calculateSetupTime(laborHours: number): number
  protected calculateRigTime(equipment: string, drops: number): number
  protected applyLocationMultiplier(base: number): number
  protected validateResult(result: CalculationResult): CalculationResult
}
```

#### Calculation Flow
1. **Input Validation**: Validate all inputs against business rules
2. **Base Calculation**: Calculate labor hours based on service type
3. **Setup Time**: Apply setup time multipliers
4. **Rig Time**: Calculate equipment rig time
5. **Location Adjustment**: Apply location-based pricing
6. **Final Validation**: Ensure result meets business constraints
7. **Result Formatting**: Return standardized calculation result

### AI Integration

#### OpenAI Integration
- **Model**: GPT-4 for general assistance and analysis
- **Use Cases**: Building analysis, recommendation generation, quote summaries
- **Integration**: Streaming responses for better UX
- **Safety**: Rate limiting and content filtering

#### Claude Integration
- **Model**: Claude 3.5 Sonnet for detailed calculations and technical analysis
- **Use Cases**: Complex calculation validation, technical documentation
- **Integration**: Direct API calls for structured responses

#### Facade Analysis
```typescript
interface FacadeAnalysis {
  buildingType: string
  windowCount: number
  facadeComplexity: 'simple' | 'standard' | 'complex' | 'ornate'
  estimatedHeight: number
  surfaceCondition: string
  recommendedServices: ServiceType[]
  confidenceScore: number
}
```

### File Structure

```
app/
├── (dashboard)/
│   ├── dashboard/           # Main dashboard
│   ├── quotes/             # Quote management
│   ├── analytics/          # Analytics dashboard
│   └── settings/           # User settings
├── api/
│   ├── quotes/             # Quote CRUD operations
│   ├── ai/                 # AI integration endpoints
│   └── analytics/          # Analytics tracking
└── globals.css

components/
├── ui/                     # shadcn/ui base components
├── calculator/             # Calculator components
│   ├── forms/             # Service-specific forms
│   └── service-calculator.tsx
├── quotes/                 # Quote management UI
├── analytics/              # Analytics components
├── navigation/             # Navigation components
└── visualizer/             # 3D visualization

lib/
├── calculations/           # Calculation engines
│   ├── constants.ts       # All calculation constants
│   ├── base-calculator.ts # Base calculator class
│   └── services/          # Service-specific calculators
├── supabase/              # Database clients
├── ai/                    # AI integration
├── utils/                 # Utility functions
└── validations/           # Zod validation schemas

types/
├── calculations.ts        # Calculation type definitions
├── database.ts           # Database type definitions
├── supabase.ts           # Supabase generated types
└── index.ts              # Shared type definitions
```

### Development Guidelines

#### Code Quality Standards
- **TypeScript**: Strict typing, no `any` usage
- **Testing**: Unit tests for all calculation logic
- **Documentation**: Comprehensive inline documentation
- **Error Handling**: Proper error boundaries and validation
- **Performance**: Optimized for large datasets and complex calculations

#### Calculation Development
- Use dependency injection for rates and configuration
- Implement comprehensive input validation
- Handle edge cases and minimum charges
- Document all calculation formulas
- Test with known good values

#### UI/UX Principles
- **Accessibility**: WCAG 2.1 AA compliance
- **Responsive**: Mobile-first design approach
- **Progressive Enhancement**: Works without JavaScript
- **Loading States**: Proper loading and error states
- **Validation**: Real-time form validation with clear error messages

### Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_key
OPENAI_ORG_ID=your_org_id

# Claude Configuration
ANTHROPIC_API_KEY=your_anthropic_key

# Application Configuration
NEXT_PUBLIC_APP_URL=your_app_url
NEXT_PUBLIC_APP_ENV=development|staging|production
```

### Testing Strategy

#### Unit Testing
- All calculation logic must have unit tests
- Mock external dependencies (database, AI APIs)
- Test edge cases and error conditions
- Achieve >90% code coverage on calculation engines

#### Integration Testing
- Test API endpoints with real database connections
- Test authentication and authorization flows
- Test form submissions and validation
- Test AI integration with mock responses

#### End-to-End Testing
- Test complete user workflows
- Test calculator accuracy with known scenarios
- Test quote generation and management
- Test multi-user scenarios

### Performance Optimization

#### Database Optimization
- Use proper indexes on frequently queried columns
- Implement query optimization and caching
- Use Row Level Security for data isolation
- Monitor query performance and optimize slow queries

#### Frontend Optimization
- Use Next.js Image optimization
- Implement code splitting and lazy loading
- Use React.memo for expensive components
- Optimize bundle size and loading times

### Security Considerations

#### Authentication & Authorization
- Use Supabase Auth for user management
- Implement Role-Based Access Control (RBAC)
- Use Row Level Security for data protection
- Implement proper session management

#### Data Protection
- Encrypt sensitive data at rest and in transit
- Implement proper input validation and sanitization
- Use HTTPS for all communications
- Regular security audits and updates

### Monitoring & Analytics

#### Application Monitoring
- Track application performance and errors
- Monitor API response times and success rates
- Track user engagement and feature usage
- Monitor calculation accuracy and edge cases

#### Business Analytics
- Track quote conversion rates
- Monitor service popularity and pricing trends
- Track user behavior and feature adoption
- Generate business intelligence reports

### Deployment

#### Production Environment
- **Platform**: Vercel for frontend, Supabase for backend
- **CDN**: Vercel Edge Network for global distribution
- **Database**: Supabase PostgreSQL with automatic backups
- **Monitoring**: Vercel Analytics and Supabase monitoring

#### CI/CD Pipeline
- Automated testing on pull requests
- Automated deployment to staging environment
- Manual approval for production deployment
- Rollback capabilities for failed deployments

### Common Issues & Solutions

#### Calculation Accuracy
- **Issue**: Floating point precision errors
- **Solution**: Use decimal.js for monetary calculations
- **Prevention**: Always round monetary values to 2 decimal places

#### Performance Issues
- **Issue**: Slow calculation responses
- **Solution**: Implement calculation caching and optimization
- **Prevention**: Profile calculation performance regularly

#### Data Consistency
- **Issue**: Inconsistent rate data across environments
- **Solution**: Use database migrations for rate updates
- **Prevention**: Implement data validation and testing

### Best Practices

#### Error Handling
- Always validate inputs before processing
- Provide clear, actionable error messages
- Log errors for debugging and monitoring
- Implement graceful fallbacks for non-critical errors

#### User Experience
- Provide immediate feedback for user actions
- Show progress indicators for long operations
- Implement optimistic updates where appropriate
- Maintain consistent UI patterns throughout the application

#### Code Organization
- Keep calculation logic separate from UI components
- Use consistent naming conventions
- Document complex business logic
- Maintain clean separation of concerns

This document serves as the comprehensive guide for understanding and working with EstimatePro. It should be updated as the project evolves and new features are added.
# EstimatePro - AI-Powered Building Services Estimation Platform

## Project Overview

EstimatePro is a comprehensive Next.js 14 application designed for building services contractors to create professional estimates and quotes. The platform integrates AI-powered photo analysis, guided estimation workflows, and advanced calculation engines for multiple service types.

### Core Features
- **AI-Powered Analysis**: Photo analysis and scope extraction using OpenAI
- **Guided Estimation Flow**: Step-by-step estimation process with AI assistance
- **Service Calculators**: 11 specialized calculators for different building services
- **Quote Management**: Professional quote generation with PDF export
- **Canvas Drawing**: Interactive area measurement and takeoff tools
- **Weather Integration**: Weather impact analysis for project scheduling
- **Analytics Dashboard**: Performance metrics and business insights

## Technology Stack

### Framework & Core
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling with custom design system
- **React Hook Form**: Form management with Zod validation

### Database & Backend
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Supabase Auth**: User authentication and authorization
- **Row Level Security**: Database-level security policies

### AI & External Services
- **OpenAI GPT-4**: Photo analysis and content extraction
- **Weather API**: Weather data integration
- **Resend**: Email service for quote delivery

### State Management & UI
- **Zustand**: Lightweight state management
- **Radix UI**: Accessible component primitives
- **React Query (@tanstack/react-query)**: Server state management
- **Framer Motion**: Animations and transitions

### File Processing & Export
- **jsPDF**: PDF generation for quotes
- **React PDF**: Advanced PDF rendering
- **XLSX**: Excel export functionality
- **html2canvas**: Screenshot generation

## Project Structure

```
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── ai/                   # AI-related endpoints
│   │   ├── analytics/            # Analytics API
│   │   ├── analyze-photos/       # Photo analysis
│   │   ├── customers/            # Customer management
│   │   ├── estimation-flows/     # Guided flow API
│   │   └── quotes/               # Quote operations
│   ├── auth/                     # Authentication pages
│   ├── calculator/               # Service calculator page
│   ├── dashboard/                # Main dashboard
│   ├── quotes/                   # Quote management
│   └── settings/                 # Application settings
├── components/                   # React components
│   ├── ai/                       # AI-related components
│   ├── calculator/               # Service calculators
│   ├── canvas/                   # Drawing and measurement tools
│   ├── duration/                 # Timeline and scheduling
│   ├── estimation/               # Guided estimation flow
│   ├── expenses/                 # Cost breakdown components
│   ├── pricing/                  # Pricing strategy tools
│   ├── takeoff/                  # Measurement and takeoff
│   └── ui/                       # Reusable UI components
├── lib/                          # Core utilities and services
│   ├── ai/                       # AI service integrations
│   ├── calculations/             # Service calculation engines
│   ├── config/                   # Application configuration
│   ├── supabase/                 # Database client/server
│   ├── types/                    # TypeScript type definitions
│   └── utils/                    # Utility functions
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
Create a `.env.local` file with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Email Configuration
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=EstimatePro
NEXT_PUBLIC_APP_VERSION=2.5

# Feature Flags
NEXT_PUBLIC_ENABLE_AI=true
NEXT_PUBLIC_ENABLE_3D=false
NEXT_PUBLIC_ENABLE_WEATHER=true
NEXT_PUBLIC_ENABLE_DRONE=false
NEXT_PUBLIC_ENABLE_GUIDED_FLOW=true
NEXT_PUBLIC_DEBUG=false
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
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database Management
npm run setup-db         # Initialize database schema
npm run migrate          # Run database migrations
npm run create-sample    # Create sample data

# Testing & Quality
npm test                 # Run Jest tests
npm run test:watch       # Run tests in watch mode
npm run typecheck        # TypeScript type checking
npm run security-audit   # Security vulnerability scan

# Production
npm run production-check # Verify production readiness
npm run performance-test # Run performance benchmarks
```

## Key Development Commands

### Database Operations
```bash
# Run migrations
node scripts/run-migration.js

# Create sample data
node scripts/create-sample-data.js

# Verify database setup
node scripts/production-check.js
```

### Development Workflow
```bash
# Start development with hot reload
npm run dev

# Run type checking alongside development
npm run typecheck

# Lint code for style issues
npm run lint

# Run security audit
npm run security-audit
```

## Architecture Patterns

### Component Organization
- **Feature-based structure**: Components grouped by feature area
- **Atomic design**: UI components follow atomic design principles
- **Separation of concerns**: Business logic separated from presentation

### State Management
- **Zustand stores**: Global state for estimates, quotes, and user data
- **React Query**: Server state caching and synchronization
- **React Context**: Authentication and theme state

### Data Flow
1. **Client components** use hooks to access stores
2. **API routes** handle server-side logic and database operations
3. **Supabase client** manages real-time data synchronization
4. **AI services** process photos and extract information

### Security
- **Row Level Security (RLS)**: Database-level access control
- **Environment validation**: Required environment variables checked on startup
- **Content Security Policy**: Configured in next.config.mjs
- **Input validation**: Zod schemas for all form inputs

## Service Calculators

The platform includes 11 specialized calculators for different building services:

1. **Window Cleaning**: Interior/exterior, height-based pricing
2. **Pressure Washing**: Surface area and PSI calculations
3. **Soft Washing**: Chemical application and coverage
4. **Biofilm Removal**: Specialized cleaning processes
5. **Glass Restoration**: Damage assessment and treatment
6. **Frame Restoration**: Material and labor calculations
7. **High Dusting**: Height and complexity factors
8. **Final Clean**: Post-construction cleaning
9. **Granite Reconditioning**: Stone treatment processes
10. **Pressure Wash & Seal**: Combined washing and sealing
11. **Parking Deck**: Large area commercial cleaning

Each calculator includes:
- Material cost calculations
- Labor time estimation
- Equipment requirements
- Markup and margin settings
- Risk factor adjustments

## AI Integration

### Photo Analysis
- **OpenAI Vision API**: Analyzes uploaded building photos
- **Automated extraction**: Identifies building features and scope
- **Validation workflows**: Human review of AI suggestions

### Content Processing
- **Scope extraction**: Extracts work requirements from emails/documents
- **Service recommendations**: AI-suggested services based on building analysis
- **Risk assessment**: Automated risk factor identification

## Database Schema

### Core Tables
- **profiles**: User accounts and roles
- **quotes**: Quote metadata and status
- **quote_services**: Individual services within quotes
- **measurements**: Canvas-based measurements
- **analytics_events**: User interaction tracking

### Relationships
- Users can create multiple quotes
- Quotes contain multiple services
- Services have associated measurements and calculations
- All data respects user permissions via RLS

## Testing Strategy

### Unit Tests
- Component testing with Jest and React Testing Library
- Calculation engine validation
- Utility function testing

### Integration Tests
- API endpoint testing
- Database operation validation
- AI service integration tests

### Test Files
- `__tests__/calculator.test.tsx`: Service calculator validation
- `__tests__/photo-analysis.test.ts`: AI photo analysis tests
- `__tests__/service-validation.test.ts`: Service validation logic

## Performance Optimization

### Code Splitting
- Dynamic imports for large components
- Route-based code splitting via Next.js
- Lazy loading of calculator forms

### Image Optimization
- Next.js Image component for automatic optimization
- WebP format conversion
- Responsive image sizing

### Caching Strategy
- React Query for API response caching
- Supabase real-time subscriptions
- Browser caching via service workers

## Deployment

### Production Checklist
```bash
# Run production verification
npm run production-check

# Verify environment variables
npm run verify-env

# Run security audit
npm run security-audit

# Build and test
npm run build
npm run start
```

### Environment Configuration
- Supabase production database
- OpenAI API key with proper limits
- Resend email configuration
- Domain and SSL setup

### Monitoring
- Application performance monitoring
- Error tracking and logging
- User analytics and usage metrics

## Common Development Tasks

### Adding a New Service Calculator
1. Create calculator form in `components/calculator/forms/`
2. Add calculation logic in `lib/calculations/services/`
3. Update service constants in `lib/constants/services.ts`
4. Add validation schema in `lib/schemas/service-forms.ts`
5. Write tests in `__tests__/calculator.test.tsx`

### Adding New AI Features
1. Create prompts in `lib/ai/analysis-prompts.ts`
2. Add processing logic in `lib/ai/extraction.ts`
3. Create UI components in `components/ai/`
4. Add API endpoints in `app/api/ai/`
5. Update types in `lib/types/`

### Database Changes
1. Write migration SQL in root directory
2. Test migration locally
3. Update TypeScript types in `types/database.ts`
4. Run migration via `scripts/run-migration.js`

## Code Conventions

### TypeScript
- Strict type checking enabled
- Interface definitions in dedicated type files
- Generic types for reusable components

### React
- Functional components with hooks
- Custom hooks for business logic
- Proper dependency arrays in useEffect

### Styling
- Tailwind CSS with custom design system
- CSS variables for theming
- Responsive design patterns

### File Naming
- kebab-case for files and directories
- PascalCase for React components
- camelCase for functions and variables

## Troubleshooting

### Common Issues

**Build Errors**
- Verify all environment variables are set
- Check TypeScript errors with `npm run typecheck`
- Ensure database schema is up to date

**Database Connection**
- Verify Supabase URL and keys
- Check RLS policies are correctly configured
- Ensure service role key has proper permissions

**AI Integration**
- Verify OpenAI API key and billing
- Check rate limits and usage quotas
- Ensure prompts are within token limits

### Debug Mode
Set `NEXT_PUBLIC_DEBUG=true` to enable:
- Detailed error logging
- AI prompt/response logging
- Performance timing information

## Contributing Guidelines

### Code Quality
- Run `npm run lint` before committing
- Ensure all tests pass with `npm test`
- Follow existing code patterns and conventions

### Git Workflow
- Create feature branches from main
- Write descriptive commit messages
- Run production check before merging

### Documentation
- Update CLAUDE.md for architectural changes
- Add JSDoc comments for complex functions
- Update README for user-facing changes

## Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

### Internal Documentation
- `docs/design-system.md`: UI component guidelines
- `docs/test-calculators.md`: Calculator testing procedures
- `DEPLOYMENT_GUIDE.md`: Production deployment instructions
- `INTEGRATION_GUIDE.md`: Third-party integration setup

This document serves as the comprehensive reference for EstimatePro development. Keep it updated as the project evolves.
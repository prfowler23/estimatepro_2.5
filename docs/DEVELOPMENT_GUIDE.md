# Development Guide

## Quick Start Commands

```bash
# Run all quality checks before committing
node scripts/dev-tools.js pre-commit

# Start development server with debugging
npm run dev

# Run tests with coverage
node scripts/dev-tools.js test-coverage

# Validate environment configuration
node scripts/dev-tools.js validate-env
```

## VSCode Setup

### Required Extensions

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
- TypeScript Importer (`pmneo.tsimporter`)
- Jest (`orta.vscode-jest`)

### Recommended Extensions

- Error Lens (`usernamehw.errorlens`)
- Auto Rename Tag (`formulahendry.auto-rename-tag`)
- Path Intellisense (`christian-kohler.path-intellisense`)
- TODO Highlight (`wayou.vscode-todo-highlight`)

## Code Snippets

Type these prefixes in VSCode and press Tab:

- `rfc` - React functional component with TypeScript
- `service` - Service layer function with validation
- `api` - Next.js API route handler
- `test` - Jest test suite with arrange-act-assert
- `zod` - Zod schema with TypeScript inference
- `hook` - Custom React hook with loading/error states
- `errorBoundary` - React error boundary component

## Development Workflow

### 1. Before Starting Work

```bash
# Validate environment
node scripts/dev-tools.js validate-env

# Fresh install if needed
node scripts/dev-tools.js fresh-start
```

### 2. During Development

```bash
# Start dev server (with debugging)
npm run dev

# Run tests in watch mode
npm run test:watch

# Quality check (format, lint, typecheck)
node scripts/dev-tools.js quality-check
```

### 3. Before Committing

```bash
# Run all pre-commit checks
node scripts/dev-tools.js pre-commit

# Or manually:
npm run fmt && npm run lint && npm run typecheck && npm test
```

### 4. Before Deploying

```bash
# Verify production build
node scripts/dev-tools.js build-check

# Security audit
node scripts/dev-tools.js security-audit

# Bundle analysis
node scripts/dev-tools.js analyze-bundle
```

## Debugging

### VSCode Debugging

- **Next.js Debug**: Debug the development server
- **Jest Tests**: Debug individual tests
- **Jest Current File**: Debug the currently open test file
- **API Route Debug**: Attach to running server for API debugging

### Console Debugging

```bash
# Debug with Node.js inspector
node --inspect node_modules/.bin/next dev

# Debug tests
node --inspect node_modules/.bin/jest --runInBand
```

## Architecture Patterns

### Service Layer Pattern

```typescript
// All business logic goes in /lib/services/
import { createClient } from "@/lib/supabase/universal-client";

export async function createEstimate(data: EstimateData) {
  const supabase = createClient();
  // Business logic here
}
```

### Component Pattern

```typescript
// Components are pure UI with no business logic
interface ComponentProps {
  data: DataType;
  onAction: (id: string) => void;
}

export default function Component({ data, onAction }: ComponentProps) {
  return <div>{/* UI only */}</div>;
}
```

### API Route Pattern

```typescript
// API routes are thin wrappers around services
export async function POST(request: NextRequest) {
  try {
    const result = await serviceFunction(data);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Error message" }, { status: 500 });
  }
}
```

## Testing Strategy

### Unit Tests

- Test service layer functions
- Test utility functions
- Test complex component logic

### Integration Tests

- Test API endpoints
- Test database operations
- Test AI service integrations

### Test Structure

```typescript
describe("ServiceName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should handle success case", async () => {
    // Arrange
    const mockData = {
      /* test data */
    };

    // Act
    const result = await serviceFunction(mockData);

    // Assert
    expect(result.success).toBe(true);
  });
});
```

## Performance Guidelines

### Code Splitting

- Use dynamic imports for large components
- Implement lazy loading for non-critical features
- Split by routes and features

### Caching Strategy

- Use React Query for server state
- Implement service-level caching
- Cache expensive AI operations

### Bundle Optimization

```bash
# Analyze bundle size
ANALYZE=true npm run build

# Check for unused dependencies
npx depcheck

# Audit bundle composition
npx webpack-bundle-analyzer .next/static/chunks/
```

## Security Checklist

### Input Validation

- ✅ All inputs validated with Zod schemas
- ✅ XSS prevention in user content
- ✅ SQL injection prevention via parameterized queries
- ✅ File upload restrictions

### API Security

- ✅ Authentication required on protected routes
- ✅ Rate limiting implemented
- ✅ CORS properly configured
- ✅ Security headers enabled

### Data Protection

- ✅ Environment variables secured
- ✅ Sensitive data encrypted
- ✅ Database RLS policies active
- ✅ Audit logging enabled

## Troubleshooting

### Common Issues

**Build Errors**

```bash
# Clear Next.js cache
rm -rf .next

# Regenerate lock file
rm package-lock.json && npm install

# Check TypeScript errors
npm run typecheck
```

**Database Issues**

```bash
# Reset local database
node scripts/dev-tools.js db-reset

# Check Supabase connection
node scripts/dev-tools.js validate-env
```

**Test Failures**

```bash
# Run tests with verbose output
npm test -- --verbose

# Clear Jest cache
npm test -- --clearCache

# Run specific test file
npm test -- --testPathPattern=specific-file.test.ts
```

### Performance Issues

```bash
# Profile build performance
npm run build -- --profile

# Analyze bundle size
node scripts/dev-tools.js analyze-bundle

# Check for memory leaks
node --inspect --inspect-brk npm run build
```

## Quality Standards

### Code Quality Targets

- **TypeScript**: 100% strict mode compliance
- **Test Coverage**: >80% for service layer, >70% for components
- **ESLint**: Zero warnings allowed
- **Bundle Size**: <500KB initial load
- **Performance**: <3s load time on 3G

### Automation

- Pre-commit hooks run quality checks
- CI/CD pipeline validates all PRs
- Automated security scanning
- Performance monitoring alerts

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

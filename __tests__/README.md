# EstimatePro Enhanced Testing Framework

## Overview

The EstimatePro Enhanced Testing Framework provides comprehensive testing infrastructure with advanced features including intelligent test categorization, enhanced coverage analysis, realistic mock data generation, and streamlined test development.

## Framework Features

### 🚀 Enhanced Test Framework

- **Unified Test Runner**: Single command interface for all testing needs
- **Intelligent Test Categorization**: Unit, Integration, E2E test separation
- **Advanced Coverage Analysis**: Critical path coverage with recommendations
- **Test Quality Validation**: Automated linting and structure validation
- **Template Generation**: Automated test template creation

### 📊 Coverage Excellence

- **Critical Path Monitoring**: Higher thresholds for essential services
- **Coverage Recommendations**: AI-powered suggestions for improvement
- **HTML Reporting**: Comprehensive visual coverage reports
- **Performance Tracking**: Bundle size and performance monitoring

### 🏭 Mock Data Factory

- **Realistic Data Generation**: Faker.js powered mock factories
- **Type Safety**: Full TypeScript support with proper typing
- **Domain-Specific Factories**: EstimatePro business object generators
- **Batch Generation**: Efficient bulk mock data creation

## Quick Start

### Running Tests

```bash
# Run all tests with enhanced reporting
npm test

# Run with coverage analysis
npm run test:coverage

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode for development
npm run test:watch

# Validate test quality
npm run test:validate
```

### Generate Test Templates

```bash
# Generate service test
npm run test:generate service UserService

# Generate component test
npm run test:generate component UserProfile

# Generate integration test
npm run test:generate integration AuthFlow
```

## Test Structure

```
__tests__/
├── utils/                    # Test utilities
│   ├── test-helpers.tsx     # React Testing Library helpers
│   ├── mock-factories.ts    # Mock data generators
│   └── supabase-mock.ts     # Supabase client mocking
├── __mocks__/               # Jest mocks
├── fixtures/                # Test data fixtures
├── integration/             # Integration tests
├── e2e/                     # End-to-end tests
├── api/                     # API route tests
├── components/              # Component tests
└── services/                # Service layer tests
```

## Writing Tests

### Service Tests

```typescript
import { createMockSupabaseClient } from "@/__tests__/utils/test-helpers";
import { UserService } from "@/lib/services/user-service";

describe("UserService", () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let userService: UserService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    userService = new UserService(mockSupabase);
  });

  it("should create user successfully", async () => {
    const userData = generateMockUser();
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue(createMockSupabaseResponse(userData)),
    });

    const result = await userService.createUser(userData);
    expect(result).toEqual(userData);
  });
});
```

### Component Tests

```typescript
import { renderWithProviders } from "@/__tests__/utils/test-helpers";
import { UserProfile } from "@/components/UserProfile";

describe("UserProfile", () => {
  it("renders user information correctly", () => {
    const mockUser = generateMockUser();

    renderWithProviders(
      <UserProfile user={mockUser} />
    );

    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { createTestQueryClient } from "@/__tests__/utils/test-helpers";
import { AuthService } from "@/lib/services/auth-service";

describe("Authentication Flow Integration", () => {
  it("should complete login workflow", async () => {
    const authService = new AuthService();
    const testUser = generateMockUser();

    // Test complete authentication flow
    const result = await authService.login(testUser.email, "password123");

    expect(result.success).toBe(true);
    expect(result.user).toMatchObject(testUser);
  });
});
```

## Mock Data Factories

### Basic Usage

```typescript
import {
  createMockUser,
  createMockEstimate,
  createMockList,
} from "@/__tests__/utils/mock-factories";

// Single mock objects
const user = createMockUser();
const estimate = createMockEstimate();

// Batch generation
const users = createMockList(createMockUser, 10);
const estimates = createRealisticEstimateDataset(20);

// With overrides
const adminUser = createMockUser({ role: "admin" });
const completedEstimate = createMockEstimate({ status: "completed" });
```

### Available Factories

- `createMockUser()` - User accounts
- `createMockEstimate()` - Estimate documents
- `createMockService()` - Service line items
- `createMockAnalytics()` - Analytics data
- `createMockFacadeAnalysis()` - AI facade analysis
- `createMockMaterial()` - Materials and supplies
- `createMockEquipment()` - Equipment inventory
- `createMockAIConversation()` - AI chat sessions
- `createMockWeatherData()` - Weather information
- `createMockPerformanceMetrics()` - Performance data

## Coverage Configuration

### Global Thresholds

- **Lines**: 80%
- **Functions**: 75%
- **Branches**: 70%
- **Statements**: 80%

### Critical Path Thresholds

Critical services have higher coverage requirements:

- **AI Service**: 95% lines, 90% functions
- **Estimate Service**: 95% lines, 90% functions
- **Unified Services**: 85-90% lines, 80-85% functions

### Coverage Analysis

```bash
# Generate coverage with analysis
npm run test:coverage

# View HTML report
open coverage/html/index.html

# Get coverage recommendations
npm run test:validate
```

## Best Practices

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Clean up after tests** using `afterEach`

### Mock Usage

1. **Use realistic data** with mock factories
2. **Mock at service boundaries** not implementation details
3. **Reset mocks** between tests
4. **Verify mock calls** when testing interactions

### Performance

1. **Use `renderWithProviders`** for React tests
2. **Batch similar tests** to reduce setup overhead
3. **Mock external dependencies** to improve speed
4. **Use `waitFor`** for async operations

## Configuration

### Jest Configuration

Located in `jest.config.js` with:

- Enhanced coverage settings
- Critical path thresholds
- HTML reporting configuration
- Performance optimizations

### Test Framework Configuration

Located in `scripts/enhanced-test-framework.js` with:

- Test categorization rules
- Coverage analysis logic
- Template generation
- Quality validation

## Troubleshooting

### Common Issues

**Tests failing in CI but passing locally**

- Check environment variables in `jest.setup.js`
- Verify mock consistency across environments
- Ensure proper cleanup in `afterEach`

**Coverage thresholds not met**

- Run `npm run test:validate` for recommendations
- Focus on critical paths first
- Use coverage HTML report to identify gaps

**Slow test execution**

- Check for unresolved promises
- Verify proper mock usage
- Consider test parallelization settings

### Debug Mode

```bash
# Run tests with detailed output
npm test -- --verbose

# Run single test file
npm test -- UserService.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"
```

## Advanced Features

### Custom Matchers

```typescript
// Available custom matchers
expect(value).toBeOneOf(["option1", "option2"]);
expect(form).toHaveValidationError("email");
```

### Performance Testing

```typescript
import {
  measurePerformance,
  expectPerformance,
} from "@/__tests__/utils/test-helpers";

it("should complete operation within time limit", async () => {
  const duration = await measurePerformance(async () => {
    await someExpensiveOperation();
  });

  expectPerformance(duration, 1000); // Max 1 second
});
```

### Environment Setup

```typescript
import { setupTestEnvironment } from "@/__tests__/utils/test-helpers";

beforeAll(() => {
  setupTestEnvironment(); // Sets up all common mocks
});
```

## Contributing

### Adding New Tests

1. Use appropriate test category (unit/integration/e2e)
2. Follow naming conventions: `ComponentName.test.tsx`
3. Include both happy path and error cases
4. Use mock factories for test data

### Adding Mock Factories

1. Create factory in `__tests__/utils/mock-factories.ts`
2. Include realistic defaults with Faker.js
3. Support overrides parameter
4. Add to factory registry for discoverability

### Test Templates

The framework can generate test templates:

```bash
npm run test:generate component UserCard
npm run test:generate service PaymentService
npm run test:generate integration CheckoutFlow
```

This enhanced testing framework ensures high-quality, maintainable tests that provide confidence in the EstimatePro application's reliability and performance.

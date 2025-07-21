# AI-Powered Smart Defaults & Suggestions System

## Overview

The AI-powered smart defaults and suggestions system provides intelligent field pre-population, context-aware suggestions, and predictive input assistance throughout the guided estimation flow. This system significantly improves user efficiency and accuracy by reducing manual data entry and providing expert-level guidance.

## Key Features

### 1. Smart Defaults Engine

- **Intelligent Field Pre-population**: Automatically suggests values for form fields based on context, historical data, and AI analysis
- **Confidence Scoring**: Each suggestion includes a confidence score (0-100%) indicating reliability
- **Multi-source Intelligence**: Combines AI analysis, historical patterns, workflow templates, and business rules
- **Step-specific Logic**: Tailored defaults for each step of the estimation process

### 2. Predictive Input System

- **Real-time Autocomplete**: Dynamic suggestions as users type
- **Context-aware Predictions**: Suggestions based on current form data and project context
- **Probability Scoring**: Each prediction includes likelihood percentage
- **Keyboard Navigation**: Full keyboard support for selection (arrow keys, enter, escape)

### 3. Smart Suggestions Panel

- **Contextual Recommendations**: AI-powered suggestions for optimization, risk mitigation, and service additions
- **Impact Assessment**: Each suggestion categorized by impact level (low/medium/high)
- **Actionable Items**: One-click application or user confirmation options
- **Dismissible Interface**: Users can dismiss suggestions they don't want to see again

### 4. Smart Field Components

- **Seamless Integration**: Drop-in replacement for standard form fields
- **Visual Indicators**: Clear UI showing when AI suggestions are available
- **Auto-application**: Instant field population with user confirmation
- **Fallback Support**: Graceful degradation when AI services are unavailable

## System Architecture

### Core Components

#### SmartDefaultsEngine (`lib/ai/smart-defaults-engine.ts`)

- Central AI logic for generating defaults and suggestions
- Step-specific default generators for all 9 estimation steps
- Business rule integration for intelligent recommendations
- Caching system for performance optimization

#### SmartDefaultsProvider (`components/ai/SmartDefaultsProvider.tsx`)

- React Context provider for smart defaults state management
- Handles data flow between UI components and AI engine
- Manages suggestion lifecycle (creation, application, dismissal)

#### SmartDefaultsPanel (`components/ai/SmartDefaultsPanel.tsx`)

- Main UI component displaying defaults and suggestions
- Compact and full view modes
- Real-time updates as form data changes
- Interactive suggestion management

#### SmartField (`components/ai/SmartField.tsx`)

- Enhanced form field wrapper with AI capabilities
- Supports text, textarea, select, number, email, phone, date inputs
- Integrated predictive input for applicable field types
- Smart default notifications and application

#### PredictiveInput (`components/ai/PredictiveInput.tsx`)

- Standalone autocomplete component with AI predictions
- Debounced API calls for performance
- Rich prediction display with confidence scores
- Keyboard accessibility

## Implementation Guide

### Basic Usage

```tsx
import { SmartDefaultsProvider } from "@/components/ai/SmartDefaultsProvider";
import { SmartDefaultsPanel } from "@/components/ai/SmartDefaultsPanel";
import { SmartField } from "@/components/ai/SmartField";

function MyEstimationForm() {
  const [formData, setFormData] = useState({});

  return (
    <SmartDefaultsProvider
      flowData={formData}
      currentStep={1}
      userProfile={{ experienceLevel: "intermediate", role: "estimator" }}
      onApplyDefault={(field, value) =>
        setFormData((prev) => ({ ...prev, [field]: value }))
      }
      onApplySuggestion={(suggestion) =>
        console.log("Apply suggestion:", suggestion)
      }
    >
      <div className="flex gap-6">
        <div className="flex-1">
          <SmartField
            field="customer.name"
            value={formData.customerName}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, customerName: value }))
            }
            label="Customer Name"
            enablePredictions
            enableSmartDefaults
            flowData={formData}
            currentStep={1}
          />
        </div>
        <div className="w-80">
          <SmartDefaultsPanel />
        </div>
      </div>
    </SmartDefaultsProvider>
  );
}
```

### Advanced Configuration

```tsx
// Configure smart defaults engine
const context = {
  flowData: estimationData,
  currentStep: 3,
  userProfile: {
    experienceLevel: "expert",
    role: "manager",
    preferences: { autoApplyHighConfidence: true },
  },
  historicalData: userHistory,
  marketData: currentMarketRates,
  buildingAnalysis: aiPhotoAnalysis,
};

// Generate defaults programmatically
const defaults = await SmartDefaultsEngine.generateSmartDefaults(context);
const suggestions = await SmartDefaultsEngine.generateSuggestions(context);
```

## Smart Default Types

### Step-Specific Defaults

1. **Initial Contact (Step 1)**
   - Auto-detect contact method based on available data
   - Set contact date to today
   - Extract customer information from communication

2. **Scope Details (Step 2)**
   - Map extracted services to service codes
   - Optimize service order for efficiency
   - Suggest bundling opportunities

3. **Files/Photos (Step 3)**
   - Recommend photo count based on building complexity
   - Suggest required photo types for building type

4. **Area of Work (Step 4)**
   - Use AI-estimated areas from photo analysis
   - Generate work area breakdowns

5. **Takeoff (Step 5)**
   - Calculate measurements based on area and services
   - Apply service-specific multipliers and factors

6. **Duration (Step 6)**
   - Estimate duration based on service complexity
   - Suggest optimal start dates (next business day)
   - Factor in weather and seasonal considerations

7. **Expenses (Step 7)**
   - Auto-populate standard equipment for services
   - Calculate material quantities based on measurements
   - Apply current market pricing

8. **Pricing (Step 8)**
   - Suggest pricing strategy based on project size
   - Market comparison and optimization recommendations
   - Risk-adjusted pricing factors

9. **Summary (Step 9)**
   - Auto-select delivery method based on contact info
   - Set follow-up dates based on project urgency
   - Generate proposal terms and conditions

## Suggestion Categories

### Optimization Suggestions

- Service bundling opportunities
- Workflow efficiency improvements
- Cost reduction recommendations
- Timeline optimization

### Risk Mitigation

- Weather-related risks and contingencies
- Safety requirement alerts
- Access restriction considerations
- Material availability warnings

### Service Additions

- Complementary services based on building analysis
- Upselling opportunities
- Maintenance package suggestions
- Seasonal service recommendations

### Pricing Adjustments

- Market-based pricing optimization
- Competitive positioning advice
- Margin improvement suggestions
- Bundle pricing opportunities

## Performance & Caching

### Caching Strategy

- **Smart Defaults**: 5-minute cache per step/data combination
- **Predictions**: Real-time with 300ms debouncing
- **Suggestions**: Cached until form data changes significantly

### Optimization Features

- Lazy loading of AI components
- Debounced API calls for predictions
- Intelligent cache invalidation
- Graceful fallbacks for API failures

## Configuration Options

### Environment Variables

```bash
# AI Configuration
AI_CACHE_TTL=300                    # Cache time in seconds
AI_RATE_LIMIT_PER_MINUTE=100       # Rate limiting
AI_MAX_RETRIES=3                   # Retry attempts
AI_ENABLE_CACHING=true             # Enable response caching
AI_ENABLE_PREDICTIONS=true         # Enable predictive input
```

### User Profile Settings

```javascript
const userProfile = {
  experienceLevel: "novice" | "intermediate" | "expert",
  role: "estimator" | "manager" | "admin",
  preferences: {
    autoApplyHighConfidence: boolean,
    showSuggestionDetails: boolean,
    enablePredictiveInput: boolean,
    suggestionDismissalDuration: number, // days
  },
};
```

## Testing & Demo

### Demo Component

Use `SmartDefaultsDemo` component to showcase all features:

```tsx
import { SmartDefaultsDemo } from "@/components/ai/SmartDefaultsDemo";

function DemoPage() {
  return <SmartDefaultsDemo />;
}
```

### Manual Testing

1. Start a new guided estimation flow
2. Fill in initial contact information
3. Observe smart defaults appearing in the panel
4. Test predictive input by typing in customer name field
5. Apply defaults and suggestions to see auto-population
6. Progress through steps to see contextual suggestions

## Troubleshooting

### Common Issues

**Smart Defaults Not Appearing**

- Check if SmartDefaultsProvider is properly wrapping the component
- Verify flowData is being passed correctly
- Ensure currentStep matches the actual step number

**Predictions Not Loading**

- Check network connectivity to AI services
- Verify API keys are configured correctly
- Check browser console for rate limiting messages

**Performance Issues**

- Monitor cache hit rates in browser dev tools
- Check for excessive re-renders in React Developer Tools
- Verify debouncing is working for predictive inputs

### Debug Mode

Enable debugging by setting `AI_ENABLE_LOGGING=true` in environment variables.

## Future Enhancements

### Planned Features

- Machine learning model training on user interactions
- Advanced natural language processing for better context understanding
- Integration with external market data sources
- Collaborative filtering based on similar projects
- Voice-to-text input with AI processing
- Mobile-optimized predictive interface

### Roadmap

- Q1: Enhanced prediction accuracy with user feedback learning
- Q2: Integration with external pricing databases
- Q3: Advanced collaborative features and team suggestions
- Q4: Mobile app with offline AI capabilities

This AI-powered smart defaults system represents a significant advancement in estimation workflow efficiency, providing users with intelligent assistance while maintaining full control over their data and decisions.

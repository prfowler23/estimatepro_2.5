# EstimatePro Theme Design System Guide

## For Claude Code and Cursor AI Assistants

This guide ensures consistent implementation of EstimatePro's professional theme system inspired by Stripe and Salesforce design patterns.

---

## 🎨 Core Theme Principles

### Professional Aesthetic

- **Inspiration**: Blend of Stripe's clean minimalism + Salesforce's enterprise functionality
- **Philosophy**: Sophisticated, trustworthy, and accessible
- **Target**: Building services contractors who need professional-grade tools

### Design System Architecture

- **CSS Variables**: All colors/spacing use CSS custom properties
- **Tailwind Integration**: CSS variables mapped to Tailwind utilities
- **Theme Support**: Light/Dark/System modes with seamless switching
- **Component-Based**: Consistent styling through reusable UI components

---

## 🏷️ Semantic Color Tokens

### ALWAYS Use These Semantic Tokens

#### Backgrounds

```css
bg-bg-base          /* Primary background */
bg-bg-elevated      /* Cards, modals, dropdowns */
bg-bg-subtle        /* Muted sections, disabled states */
bg-bg-muted         /* Very subtle backgrounds */
```

#### Text Colors

```css
text-text-primary   /* Main content text */
text-text-secondary /* Supporting text, descriptions */
text-text-muted     /* Disabled, placeholder text */
text-text-inverted  /* Text on colored backgrounds */
```

#### Borders

```css
border-border-primary    /* Default borders */
border-border-secondary  /* Subtle borders */
border-border-focus      /* Focus states */
```

#### Actions (Buttons, Links)

```css
bg-primary-action       /* Default button background */
bg-primary-hover        /* Button hover state */
bg-primary-active       /* Button pressed state */
bg-primary-disabled     /* Disabled button */

bg-secondary-action     /* Secondary button background */
bg-secondary-hover      /* Secondary button hover */
bg-secondary-active     /* Secondary button pressed */
```

#### Status Colors

```css
/* Success */
bg-success-50 to bg-success-900
text-success-600, text-success-700

/* Error */
bg-error-50 to bg-error-900
text-error-600, text-error-700

/* Warning */
bg-warning-50 to bg-warning-900
text-warning-600, text-warning-700
```

---

## 🚫 What NOT to Use

### Avoid These Legacy/Hardcoded Colors

```css
❌ bg-white, bg-black
❌ text-gray-500, text-slate-600
❌ border-gray-300
❌ bg-blue-500, bg-red-500
❌ Any hardcoded color values (#fff, rgb(), etc.)
```

### Avoid Generic Tailwind Colors

```css
❌ bg-primary (use bg-primary-action instead)
❌ text-foreground (use text-text-primary instead)
❌ border-border (use border-border-primary instead)
```

---

## 🧩 Component Guidelines

### Enhanced Button Components (UPDATED)

```tsx
// ✅ CORRECT: Use semantic variants with new features
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outline Style</Button>
<Button variant="success">Success Action</Button>
<Button variant="destructive">Delete Action</Button>

// ✅ CORRECT: Enhanced button features (NEW)
<Button ripple haptic>Mobile-optimized button</Button>
<Button loading>Processing...</Button>
<Button
  variant="default"
  motionProps={{
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 }
  }}
>
  Custom interaction
</Button>

// ✅ CORRECT: Proper size variants
<Button size="xs">Small</Button>
<Button size="default">Normal</Button>
<Button size="lg">Large</Button>
<Button size="icon">Icon only</Button>
<Button size="icon-sm">Small icon</Button>

// ❌ AVOID: Custom styling that overrides theme
<Button className="bg-blue-500 text-white">Bad</Button>
```

### Card Components

```tsx
// ✅ CORRECT: Use card variants
<Card variant="default">Standard card</Card>
<Card variant="elevated">Raised card</Card>
<Card variant="outlined">Outlined card</Card>
<Card variant="interactive">Clickable card</Card>

// ✅ CORRECT: Consistent sizing
<Card size="sm">Compact</Card>
<Card size="default">Standard</Card>
<Card size="lg">Large</Card>
```

### Input Components

```tsx
// ✅ CORRECT: Floating labels with validation
<Input label="Customer Name" required />
<Input label="Email" type="email" />
<Input label="Phone" leftIcon={Phone} />
<Input label="Notes" rightIcon={Edit} />
```

### Skeleton Loading Components (NEW)

```tsx
// ✅ CORRECT: Basic skeleton patterns
<Skeleton variant="shimmer" size="lg" rounded="md" />
<Skeleton variant="pulse" className="w-full h-4" />
<Skeleton variant="wave" className="w-3/4 h-6" />

// ✅ CORRECT: Composite skeleton components
<SkeletonText lines={3} lineHeight="relaxed" lastLineWidth="1/2" />
<SkeletonCard hasHeader hasFooter contentLines={4} variant="elevated" />
<SkeletonList items={5} showAvatar showActions />
<SkeletonTable rows={5} columns={4} hasHeader />

// ✅ CORRECT: Staggered loading animations
<div className="space-y-4">
  {Array.from({ length: 3 }).map((_, index) => (
    <SkeletonCard key={index} delay={index * 0.1} />
  ))}
</div>
```

### Error Alert Components (NEW)

```tsx
// ✅ CORRECT: Contextual error handling
<ErrorAlert
  title="Connection Failed"
  description="Unable to save your changes"
  errorType="network"
  retryable
  onRetry={handleRetry}
  onAction={handleAction}
  dismissible
  onDismiss={handleDismiss}
/>

// ✅ CORRECT: Specialized error components
<NetworkErrorAlert
  description="Check your internet connection"
  onRetry={handleRetry}
/>
<ValidationErrorAlert
  title="Form Validation Error"
  description="Please correct the highlighted fields"
/>
<ServerErrorAlert
  errorCode="500"
  details="Internal server error details..."
  showDetails
/>

// ✅ CORRECT: Custom recovery actions
<ErrorAlert
  title="Upload Failed"
  description="File size too large"
  recoveryActions={[
    { label: "Compress file", action: "compress", icon: Compress },
    { label: "Choose different file", action: "choose", icon: Upload },
  ]}
/>
```

### Empty State Components (NEW)

```tsx
// ✅ CORRECT: Pre-configured empty states
<EstimatesEmptyState />
<CustomersEmptyState />
<PhotosEmptyState />
<AnalyticsEmptyState />

// ✅ CORRECT: Custom empty states
<EmptyState
  type="searchResults"
  primaryAction={{
    label: "Clear filters",
    onClick: handleClearFilters
  }}
  secondaryActions={[
    { label: "Search help", icon: MessageCircle, variant: "ghost" }
  ]}
/>

// ✅ CORRECT: Custom empty state with illustration
<EmptyState
  icon={Camera}
  title="No photos uploaded"
  description="Upload project photos to enable AI analysis"
  variant="feature"
  size="lg"
  illustration={<CustomIllustration />}
  primaryAction={{
    label: "Upload Photos",
    icon: Upload,
    onClick: handleUpload
  }}
/>
```

---

## 🎯 Shadow System

### Professional Elevation

```css
shadow-xs      /* Subtle depth */
shadow-sm      /* Cards, buttons */
shadow-md      /* Dropdowns, hover states */
shadow-lg      /* Modals, popovers */
shadow-xl      /* Maximum elevation */
```

### Usage Guidelines

```tsx
// ✅ CORRECT: Semantic shadow usage
<Card className="shadow-sm hover:shadow-md"> /* Cards */
<div className="shadow-lg"> /* Modals */
<Button className="shadow-sm hover:shadow-md"> /* Buttons */

// ❌ AVOID: Random shadow combinations
<div className="shadow-2xl drop-shadow-lg"> /* Excessive */
```

---

## 📏 Spacing & Typography

### Consistent Spacing Scale

```css
/* Use the spacing scale consistently */
p-4, p-6, p-8          /* Padding */
gap-2, gap-4, gap-6     /* Flex/Grid gaps */
space-y-4, space-y-6    /* Vertical spacing */
```

### Typography Hierarchy

```css
text-xs      /* Small labels, badges */
text-sm      /* Body text, descriptions */
text-base    /* Default body text */
text-lg      /* Subheadings */
text-xl      /* Section titles */
text-2xl     /* Page titles */
text-3xl     /* Hero headings */
```

---

## ⚡ Animation & Transitions

### Professional Motion with Framer Motion

```css
duration-normal     /* Standard 200ms transitions */
duration-fast       /* Quick 150ms transitions */
duration-slow       /* Smooth 300ms transitions */

ease-out           /* Smooth deceleration */
```

### Advanced Micro-Interactions (NEW)

```tsx
// ✅ CORRECT: Enhanced button with ripple effects
<Button ripple haptic>Advanced Interaction</Button>

// ✅ CORRECT: Button with custom motion props
<Button
  motionProps={{
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 }
  }}
>
  Custom Animation
</Button>

// ✅ CORRECT: Skeleton loading states
<SkeletonCard hasHeader hasFooter contentLines={3} />
<SkeletonList items={5} showAvatar showActions />

// ✅ CORRECT: Spring animations for mobile
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{
    type: "spring",
    stiffness: 400,
    damping: 30
  }}
>
  Touch-friendly element
</motion.div>
```

### Loading State Patterns (NEW)

```tsx
// ✅ CORRECT: Contextual skeleton loaders
<SkeletonText lines={2} lineHeight="relaxed" lastLineWidth="3/4" />
<SkeletonTable rows={5} columns={4} hasHeader />

// ✅ CORRECT: Staggered loading animations
{items.map((item, index) => (
  <motion.div
    key={item.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    {item.content}
  </motion.div>
))}
```

---

## 🌗 Dark Mode Support

### Theme-Aware Development

```tsx
// ✅ CORRECT: Uses CSS variables that adapt to theme
<div className="bg-bg-base text-text-primary border-border-primary">

// ❌ AVOID: Hardcoded colors that break in dark mode
<div className="bg-white text-black border-gray-300">
```

### Theme Testing

- Always test components in light, dark, and system themes
- Use ThemeToggle component for testing
- Ensure sufficient contrast in both modes

## 📱 Mobile-First Patterns (NEW)

### Touch-Friendly Interactions

```tsx
// ✅ CORRECT: Mobile-optimized button with haptic feedback
<Button ripple haptic size="lg" className="min-h-[44px]">
  Mobile Action
</Button>

// ✅ CORRECT: Touch targets with proper spacing
<div className="flex flex-col gap-4 p-4">
  <Button className="w-full min-h-[44px]">Primary Action</Button>
  <Button variant="outline" className="w-full min-h-[44px]">
    Secondary Action
  </Button>
</div>

// ✅ CORRECT: Swipe-friendly cards
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="touch-manipulation cursor-pointer"
>
  <Card variant="interactive">Swipeable content</Card>
</motion.div>
```

### Mobile Navigation Patterns

```tsx
// ✅ CORRECT: Enhanced mobile bottom navigation
<MobileBottomNav /> {/* Includes haptic feedback, animations, badges */}

// ✅ CORRECT: Mobile-specific loading states
<div className="md:hidden">
  <SkeletonList items={3} showActions className="space-y-2" />
</div>
<div className="hidden md:block">
  <SkeletonTable rows={5} columns={4} hasHeader />
</div>
```

### Responsive Component Usage

```tsx
// ✅ CORRECT: Responsive empty states
<EmptyState
  size="sm"              // Mobile
  className="md:size-lg" // Desktop
  variant="minimal"
  type="estimates"
/>

// ✅ CORRECT: Adaptive error handling
<ErrorAlert
  size="sm"
  className="md:size-default"
  variant="error"
  dismissible={!isMobile} // Only dismissible on desktop
/>
```

---

## 🔧 Implementation Checklist (UPDATED)

### When Creating New Components

- [ ] Use only semantic color tokens
- [ ] Implement proper focus states with `focus:ring-border-focus`
- [ ] Add hover states with appropriate elevation/color changes
- [ ] Include loading states with skeleton components (NEW)
- [ ] Support disabled states with proper opacity/colors
- [ ] Test in all theme modes (light/dark/system)
- [ ] Follow consistent spacing patterns
- [ ] Use appropriate typography scales
- [ ] Add Framer Motion animations where appropriate (NEW)
- [ ] Ensure touch-friendly mobile interactions (NEW)
- [ ] Include haptic feedback for mobile (NEW)
- [ ] Test with screen readers and keyboard navigation

### When Modifying Existing Components

- [ ] Replace any hardcoded colors with semantic tokens
- [ ] Update shadows to use the professional elevation system
- [ ] Ensure animations use consistent duration/easing
- [ ] Verify theme switching works correctly
- [ ] Test accessibility (contrast, focus visibility)
- [ ] Add skeleton loading states where applicable (NEW)
- [ ] Implement contextual error handling (NEW)
- [ ] Add empty state components for data-driven UIs (NEW)
- [ ] Optimize for mobile touch interactions (NEW)
- [ ] Test animations on low-powered devices

---

## 📋 Common Patterns (UPDATED)

### Professional Card with Loading States

```tsx
{
  loading ? (
    <SkeletonCard hasHeader hasFooter contentLines={3} variant="elevated" />
  ) : (
    <Card variant="elevated" size="default">
      <CardHeader size="default">
        <CardTitle size="default">Professional Title</CardTitle>
        <CardDescription size="default">Supporting text</CardDescription>
      </CardHeader>
      <CardContent size="default">{/* Content */}</CardContent>
      <CardFooter size="default">
        <Button variant="default" ripple loading={isSubmitting}>
          Primary Action
        </Button>
        <Button variant="secondary">Cancel</Button>
      </CardFooter>
    </Card>
  );
}
```

### Enhanced Form with Error Handling

```tsx
<div className="space-y-6">
  {/* Error Alert */}
  <AnimatePresence>
    {error && (
      <ValidationErrorAlert
        title="Form Error"
        description={error.message}
        dismissible
        onDismiss={clearError}
        recoveryActions={[
          { label: "Reset form", action: "reset", icon: RefreshCw },
        ]}
      />
    )}
  </AnimatePresence>

  {/* Form Fields */}
  <Input label="Company Name" required placeholder="Enter company name" />
  <Input label="Email Address" type="email" leftIcon={Mail} />

  {/* Action Buttons */}
  <div className="flex gap-4">
    <Button
      type="submit"
      loading={isSubmitting}
      ripple
      haptic
      motionProps={{
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
      }}
    >
      Save Changes
    </Button>
    <Button variant="outline">Cancel</Button>
  </div>
</div>
```

### Data List with Empty States

```tsx
<div className="space-y-4">
  {loading ? (
    <SkeletonList items={5} showAvatar showActions />
  ) : data.length === 0 ? (
    <EstimatesEmptyState />
  ) : (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {data.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card variant="interactive">{/* Item content */}</Card>
        </motion.div>
      ))}
    </motion.div>
  )}
</div>
```

### Mobile-First Dashboard Layout

```tsx
<div className="space-y-6">
  {/* Mobile: Show skeleton, Desktop: Show table */}
  <div className="block md:hidden">
    {loading ? (
      <SkeletonList items={3} showActions />
    ) : (
      <div className="space-y-2">
        {items.map((item) => (
          <motion.div
            key={item.id}
            whileTap={{ scale: 0.98 }}
            className="touch-manipulation"
          >
            <Card variant="interactive">{/* Mobile card layout */}</Card>
          </motion.div>
        ))}
      </div>
    )}
  </div>

  <div className="hidden md:block">
    {loading ? (
      <SkeletonTable rows={5} columns={4} hasHeader />
    ) : (
      <Table>{/* Desktop table layout */}</Table>
    )}
  </div>
</div>
```

---

## 🚨 Emergency Theme Fixes

### Quick Audit Commands

```bash
# Find hardcoded colors
grep -r "bg-white\|bg-gray-\|text-gray-\|border-gray-" components/
grep -r "#[0-9a-fA-F]\{3,6\}" components/

# Find non-semantic color usage
grep -r "bg-blue-\|bg-red-\|bg-green-" components/
```

### Common Replacements

```css
/* Background fixes */
bg-white → bg-bg-base
bg-gray-50 → bg-bg-subtle
bg-gray-100 → bg-bg-elevated

/* Text fixes */
text-gray-600 → text-text-secondary
text-gray-500 → text-text-muted
text-black → text-text-primary

/* Border fixes */
border-gray-300 → border-border-primary
border-gray-200 → border-border-secondary
```

---

## 💡 Pro Tips for AI Assistants (UPDATED)

1. **Always prioritize semantic tokens** over generic Tailwind colors
2. **Check both light and dark themes** when making changes
3. **Use the component variants** instead of custom styling
4. **Follow the shadow elevation system** for depth hierarchy
5. **Maintain consistent spacing patterns** throughout the app
6. **Test theme switching** after any styling changes
7. **Preserve accessibility** by keeping focus states visible
8. **Add skeleton loading states** for better perceived performance (NEW)
9. **Implement contextual error handling** with recovery suggestions (NEW)
10. **Use empty states** to guide users through workflows (NEW)
11. **Optimize for mobile interactions** with haptic feedback and proper touch targets (NEW)
12. **Leverage Framer Motion** for professional micro-interactions (NEW)
13. **Test animations on low-powered devices** to ensure smooth performance (NEW)
14. **Consider progressive enhancement** - ensure functionality without JavaScript (NEW)
15. **Use staggered animations** for lists and grids to create engaging loading experiences (NEW)

---

**Remember**: This theme system creates a cohesive, professional experience that builds trust with building services contractors. Every styling decision should reinforce the platform's reliability and sophistication.

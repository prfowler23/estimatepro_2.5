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

### Button Components

```tsx
// ✅ CORRECT: Use semantic variants
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outline Style</Button>
<Button variant="success">Success Action</Button>
<Button variant="destructive">Delete Action</Button>

// ✅ CORRECT: Proper size variants
<Button size="xs">Small</Button>
<Button size="default">Normal</Button>
<Button size="lg">Large</Button>

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

### Professional Motion

```css
duration-normal     /* Standard 200ms transitions */
duration-fast       /* Quick 150ms transitions */
duration-slow       /* Smooth 300ms transitions */

ease-out           /* Smooth deceleration */
```

### Micro-Interactions

```tsx
// ✅ CORRECT: Subtle button feedback
<Button className="active:scale-[0.98]">Click me</Button>

// ✅ CORRECT: Hover elevations
<Card className="hover:shadow-md transition-all duration-normal">
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

---

## 🔧 Implementation Checklist

### When Creating New Components

- [ ] Use only semantic color tokens
- [ ] Implement proper focus states with `focus:ring-border-focus`
- [ ] Add hover states with appropriate elevation/color changes
- [ ] Include loading states where applicable
- [ ] Support disabled states with proper opacity/colors
- [ ] Test in all theme modes (light/dark/system)
- [ ] Follow consistent spacing patterns
- [ ] Use appropriate typography scales

### When Modifying Existing Components

- [ ] Replace any hardcoded colors with semantic tokens
- [ ] Update shadows to use the professional elevation system
- [ ] Ensure animations use consistent duration/easing
- [ ] Verify theme switching works correctly
- [ ] Test accessibility (contrast, focus visibility)

---

## 📋 Common Patterns

### Professional Card Layout

```tsx
<Card variant="elevated" size="default">
  <CardHeader size="default">
    <CardTitle size="default">Professional Title</CardTitle>
    <CardDescription size="default">Supporting text</CardDescription>
  </CardHeader>
  <CardContent size="default">{/* Content */}</CardContent>
  <CardFooter size="default">
    <Button variant="default">Primary Action</Button>
    <Button variant="secondary">Cancel</Button>
  </CardFooter>
</Card>
```

### Form Field Pattern

```tsx
<div className="space-y-6">
  <Input label="Company Name" required placeholder="Enter company name" />
  <Input label="Email Address" type="email" leftIcon={Mail} />
  <div className="flex gap-4">
    <Button type="submit" loading={isSubmitting}>
      Save Changes
    </Button>
    <Button variant="outline">Cancel</Button>
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

## 💡 Pro Tips for AI Assistants

1. **Always prioritize semantic tokens** over generic Tailwind colors
2. **Check both light and dark themes** when making changes
3. **Use the component variants** instead of custom styling
4. **Follow the shadow elevation system** for depth hierarchy
5. **Maintain consistent spacing patterns** throughout the app
6. **Test theme switching** after any styling changes
7. **Preserve accessibility** by keeping focus states visible

---

**Remember**: This theme system creates a cohesive, professional experience that builds trust with building services contractors. Every styling decision should reinforce the platform's reliability and sophistication.

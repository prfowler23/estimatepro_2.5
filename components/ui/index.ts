export { Button } from "./button";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
export { Input } from "./input";
export { Label } from "./label";
export { Textarea } from "./textarea";
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
export { Checkbox } from "./checkbox";
export { Badge } from "./badge";
export { Alert, AlertDescription, AlertTitle } from "./alert";
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
export { Switch } from "./switch";
export { Progress } from "./progress";
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
export { Separator } from "./separator";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
export { Slider } from "./slider";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
export { Breadcrumb, useBreadcrumbs } from "./breadcrumb";
export type { BreadcrumbItem, BreadcrumbProps } from "./breadcrumb";
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
} from "./skeleton";
export {
  ErrorAlert,
  NetworkErrorAlert,
  ValidationErrorAlert,
  ServerErrorAlert,
  PermissionErrorAlert,
} from "./error-alert";
export {
  EmptyState,
  EstimatesEmptyState,
  SearchEmptyState,
  CustomersEmptyState,
  PhotosEmptyState,
  AnalyticsEmptyState,
  InboxEmptyState,
  AIEmptyState,
  ErrorEmptyState,
} from "./empty-state";
export {
  FocusManager,
  useFocusManager,
  useFocusable,
  FocusIndicator,
  AccessibilityAnnouncer,
} from "./focus-management";
export {
  EnhancedProgressIndicator,
  MobileStepProgress,
  type ProgressStep,
} from "./enhanced-progress";
export {
  StandardizedNotification,
  NotificationProvider,
  useNotifications,
  useSuccessNotification,
  useErrorNotification,
  useWarningNotification,
  useInfoNotification,
  type NotificationData,
  type RecoveryAction,
  type NotificationType,
  type NotificationSeverity,
  type NotificationPosition,
} from "./standardized-notifications";

// Performance-optimized lazy-loaded components
// These components are automatically code-split for better bundle optimization
export {
  LazyFocusManager,
  LazyFocusIndicator,
  LazyAccessibilityAnnouncer,
  preloadFocusManagement,
  useProgressiveFocusManagement,
  type FocusManagerProps,
  type FocusIndicatorProps,
  type AccessibilityAnnouncerProps,
} from "./focus-management-lazy";
export {
  MobilePhotoCaptureWrapper as MobilePhotoCapture,
  MobilePhotoCapturePreload,
  type MobilePhotoCaptureProps,
  type CapturedPhoto,
} from "./mobile/MobilePhotoCaptureLazy";

// High-performance animation utilities with tree-shaking support
// Individual functions are exported for optimal bundle size
export {
  easings,
  durations,
  transitions,
  fadeVariants,
  slideVariants,
  scaleVariants,
  staggerContainer,
  interactionVariants,
  loadingVariants,
  pulseVariants,
  modalVariants,
  overlayVariants,
  listItemVariants,
  notificationVariants,
  presets,
  viewportOptions,
  getAnimationConfig,
  createResponsiveAnimation,
  createStaggerAnimation,
  createEntranceAnimation,
  createAnimationCleanup,
  type AnimationPreset,
  type EasingType,
  type DurationType,
  type TransitionType,
} from "./animation-utils";

// Error handling utilities for consistent error management
export {
  createUIError,
  handleError,
  registerErrorHandler,
  getRecentErrors,
  clearErrorHistory,
  EnhancedErrorBoundary,
  useErrorHandler,
  useErrorRecovery,
  withErrorHandling,
  createNetworkError,
  createValidationError,
  type UIError,
  type ErrorContext,
  type ErrorSeverity,
  type ErrorCategory,
  type ErrorHandler,
  type EnhancedErrorBoundaryProps,
} from "./error-handling-utils";

// Performance monitoring utilities for component optimization
export {
  recordMetric,
  measureTime,
  measureTimeAsync,
  usePerformanceMetrics,
  getMetrics,
  getPerformanceStats,
  clearMetrics,
  updateThresholds,
  setPerformanceMonitoring,
  recordMemoryUsage,
  recordNetworkMetric,
  createProfilerCallback,
  withPerformanceMonitoring,
  checkPerformanceBudget,
  DEFAULT_THRESHOLDS,
  DEFAULT_BUDGET,
  type PerformanceMetric,
  type PerformanceThresholds,
  type PerformanceBudget,
} from "./performance-utils";

// Accessibility utilities for WCAG AA compliance and screen reader support
export {
  useAriaDescription,
  useAnnouncer,
  useKeyboardNavigation,
  useFocusManagement,
  useReducedMotion,
  LiveRegion,
  SkipLink,
  accessibilityUtils,
  withAccessibility,
  type LiveRegionPoliteness,
  type AnnouncementOptions,
  type NavigationDirection,
  type FocusOptions,
  type LiveRegionProps,
  type SkipLinkProps,
} from "./accessibility-utils";

// Screen reader enhancements and specialized accessibility components
export {
  ScreenReaderProvider,
  useScreenReader,
  Landmark,
  ProgressAnnouncer,
  ContentAnnouncer,
  LoadingAnnouncer,
  FormFieldAnnouncer,
  NavigationAnnouncer,
  type ScreenReaderProviderProps,
  type LandmarkProps,
  type ProgressAnnouncerProps,
  type ContentAnnouncerProps,
  type LoadingAnnouncerProps,
  type FormFieldAnnouncerProps,
  type NavigationAnnouncerProps,
} from "./screen-reader-enhancements";

// Enhanced TypeScript utilities for better developer experience
export {
  isComponentSize,
  isComponentVariant,
  isComponentState,
  type ComponentSize,
  type ComponentVariant,
  type ComponentState,
  type AccessibilityProps,
  type PerformanceProps,
  type AnimationProps,
  type EnhancedComponentProps,
  type ExtractVariantProps,
  type CombineProps,
  type PolymorphicProps,
  type ForwardRefComponent,
  type CompoundComponent,
  type EnhancedEventHandlers,
  type ValidationProps,
  type LoadingProps,
  type IndustrialTheme,
} from "./types";

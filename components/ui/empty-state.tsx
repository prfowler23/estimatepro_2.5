import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Upload,
  Users,
  Settings,
  Lightbulb,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Inbox,
  Calendar,
  BarChart3,
  Camera,
  Bot,
  Zap,
  Target,
  BookOpen,
  MessageCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
  useKeyboardNavigation,
  useAnnouncer,
  accessibilityUtils,
} from "./accessibility-utils";

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center p-6 rounded-lg transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-bg-elevated border border-border-primary",
        minimal: "bg-transparent",
        elevated: "bg-bg-base border border-border-primary shadow-lg",
        feature: "bg-primary-50/30 border border-primary-200",
        subtle: "bg-bg-subtle/50 border border-border-primary/50",
      },
      size: {
        sm: "p-4 min-h-[200px]",
        default: "p-6 min-h-[300px]",
        lg: "p-8 min-h-[400px]",
        xl: "p-10 min-h-[500px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Common empty state configurations
const emptyStateConfigs = {
  estimates: {
    icon: FileText,
    title: "No estimates yet",
    description:
      "Create your first estimate to get started with project planning and pricing.",
    primaryAction: { label: "Create Estimate", icon: Plus },
    secondaryActions: [
      { label: "Import from template", icon: Upload },
      { label: "Watch tutorial", icon: BookOpen, variant: "ghost" as const },
    ],
  },
  searchResults: {
    icon: Search,
    title: "No results found",
    description:
      "Try adjusting your search terms or filters to find what you're looking for.",
    primaryAction: { label: "Clear filters", icon: Filter },
    secondaryActions: [
      { label: "Search help", icon: MessageCircle, variant: "ghost" as const },
    ],
  },
  customers: {
    icon: Users,
    title: "No customers yet",
    description:
      "Add your first customer to start managing relationships and projects.",
    primaryAction: { label: "Add Customer", icon: Plus },
    secondaryActions: [
      { label: "Import customers", icon: Upload },
      { label: "Customer guide", icon: BookOpen, variant: "ghost" as const },
    ],
  },
  photos: {
    icon: Camera,
    title: "No photos uploaded",
    description:
      "Upload project photos to enable AI-powered analysis and measurements.",
    primaryAction: { label: "Upload Photos", icon: Upload },
    secondaryActions: [
      { label: "Take photo", icon: Camera },
      { label: "Photo tips", icon: Lightbulb, variant: "ghost" as const },
    ],
  },
  analytics: {
    icon: BarChart3,
    title: "No data to display",
    description:
      "Complete some estimates and projects to see your analytics dashboard.",
    primaryAction: { label: "Create First Estimate", icon: Plus },
    secondaryActions: [
      { label: "Sample data", icon: Target },
      { label: "Analytics guide", icon: BookOpen, variant: "ghost" as const },
    ],
  },
  calendar: {
    icon: Calendar,
    title: "No scheduled appointments",
    description:
      "Schedule site visits and project meetings to keep your work organized.",
    primaryAction: { label: "Schedule Appointment", icon: Plus },
    secondaryActions: [
      { label: "Sync calendar", icon: Settings },
      { label: "Scheduling tips", icon: Lightbulb, variant: "ghost" as const },
    ],
  },
  inbox: {
    icon: Inbox,
    title: "All caught up!",
    description:
      "You're all set. New notifications and messages will appear here.",
    variant: "feature" as const,
    primaryAction: null,
    secondaryActions: [
      {
        label: "Notification settings",
        icon: Settings,
        variant: "ghost" as const,
      },
    ],
  },
  aiSuggestions: {
    icon: Bot,
    title: "AI analysis ready",
    description:
      "Upload project photos or documents to get AI-powered insights and recommendations.",
    primaryAction: { label: "Upload for Analysis", icon: Upload },
    secondaryActions: [
      { label: "Try sample", icon: Zap },
      { label: "AI features", icon: BookOpen, variant: "ghost" as const },
    ],
  },
  error: {
    icon: RefreshCw,
    title: "Something went wrong",
    description: "We're having trouble loading this content. Please try again.",
    primaryAction: { label: "Try Again", icon: RefreshCw },
    secondaryActions: [
      { label: "Report issue", icon: MessageCircle, variant: "ghost" as const },
    ],
  },
} as const;

/**
 * Props for the EmptyState component
 *
 * @interface EmptyStateProps
 * @extends React.HTMLAttributes<HTMLDivElement>
 * @extends VariantProps<typeof emptyStateVariants>
 */
export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  /** Predefined empty state type with default icon, title, and actions */
  type?: keyof typeof emptyStateConfigs;
  /** Custom icon component to display instead of the default */
  icon?: React.ComponentType<any>;
  /** Custom title text to display instead of the default */
  title?: string;
  /** Custom description text to display instead of the default */
  description?: string;
  /** Primary call-to-action button configuration */
  primaryAction?: {
    /** Button label text */
    label: string;
    /** Optional icon to display in the button */
    icon?: React.ComponentType<any>;
    /** Click handler for the button */
    onClick?: () => void;
    /** Optional href for link buttons */
    href?: string;
  } | null;
  /** Array of secondary action buttons */
  secondaryActions?: Array<{
    /** Button label text */
    label: string;
    /** Optional icon to display in the button */
    icon?: React.ComponentType<any>;
    /** Click handler for the button */
    onClick?: () => void;
    /** Optional href for link buttons */
    href?: string;
    /** Visual variant of the button */
    variant?: "default" | "outline" | "ghost";
  }>;
  /** Whether to enable entrance animations */
  animate?: boolean;
  /** Custom illustration to display instead of the default icon */
  illustration?: React.ReactNode;
  /** Whether to show the background container styling */
  showBackground?: boolean;
  /** Whether to announce the empty state to screen readers */
  announceToScreenReader?: boolean;
  /** Custom announcement message for screen readers */
  customAnnouncement?: string;
  /** Whether to enable keyboard navigation between actions */
  enableKeyboardNav?: boolean;
}

/**
 * A versatile empty state component for displaying when content is not available
 *
 * This component provides:
 * - Predefined configurations for common empty state scenarios
 * - Customizable icons, titles, descriptions, and actions
 * - Responsive design with mobile-optimized layouts
 * - Accessibility support with proper ARIA attributes
 * - Smooth entrance animations with reduced motion support
 * - Multiple visual variants and sizing options
 *
 * @example
 * ```tsx
 * // Using predefined type
 * <EmptyState
 *   type="estimates"
 *   primaryAction={{
 *     label: "Create Estimate",
 *     onClick: () => router.push('/estimates/new')
 *   }}
 * />
 *
 * // Custom empty state
 * <EmptyState
 *   icon={CustomIcon}
 *   title="Custom Empty State"
 *   description="This is a custom empty state with specific actions."
 *   primaryAction={{
 *     label: "Primary Action",
 *     onClick: handlePrimaryAction
 *   }}
 *   secondaryActions={[
 *     { label: "Secondary", onClick: handleSecondary, variant: "outline" }
 *   ]}
 * />
 *
 * // Minimal version without background
 * <EmptyState
 *   type="searchResults"
 *   showBackground={false}
 *   animate={false}
 * />
 * ```
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      variant,
      size,
      type,
      icon: CustomIcon,
      title: customTitle,
      description: customDescription,
      primaryAction: customPrimaryAction,
      secondaryActions: customSecondaryActions,
      animate = true,
      illustration,
      showBackground = true,
      announceToScreenReader = true,
      customAnnouncement,
      enableKeyboardNav = true,
      children,
      ...props
    },
    ref,
  ) => {
    // Accessibility integration
    const { announcePolite } = useAnnouncer();
    const containerRef = React.useRef<HTMLDivElement>(null);
    const actionButtonRefs = React.useRef<HTMLButtonElement[]>([]);
    // Get configuration from type or use custom props
    const config = type ? emptyStateConfigs[type] : null;
    const Icon = CustomIcon || config?.icon || FileText;
    const title = customTitle || config?.title || "No items found";
    const description =
      customDescription ||
      config?.description ||
      "There are no items to display at the moment.";
    const finalVariant = config?.variant || variant;
    const primaryAction =
      customPrimaryAction !== undefined
        ? customPrimaryAction
        : config?.primaryAction;
    const secondaryActions =
      customSecondaryActions || config?.secondaryActions || [];

    // Collect all action buttons for keyboard navigation
    const allActions = React.useMemo(() => {
      const actions = [];
      if (primaryAction) actions.push(primaryAction);
      actions.push(...secondaryActions);
      return actions;
    }, [primaryAction, secondaryActions]);

    // Keyboard navigation for action buttons
    const { handleKeyDown } = useKeyboardNavigation({
      elements: actionButtonRefs.current,
      orientation: "horizontal",
      wrap: true,
      enableArrowKeys: enableKeyboardNav,
    });

    // Screen reader announcement on mount
    React.useEffect(() => {
      if (announceToScreenReader) {
        const message =
          customAnnouncement || `Empty state: ${title}. ${description}`;
        announcePolite(message, 1000);
      }
    }, [
      announceToScreenReader,
      customAnnouncement,
      title,
      description,
      announcePolite,
    ]);

    // Generate accessible IDs
    const titleId = accessibilityUtils.generateId("empty-state-title");
    const descriptionId = accessibilityUtils.generateId(
      "empty-state-description",
    );

    const content = (
      <div
        ref={containerRef}
        className={cn(
          emptyStateVariants({ variant: finalVariant, size }),
          !showBackground && "bg-transparent border-none p-0",
          className,
        )}
        role="region"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={enableKeyboardNav ? handleKeyDown : undefined}
        {...props}
      >
        {/* Icon or illustration */}
        <div className="mb-4">
          {illustration ? (
            <div className="w-16 h-16 flex items-center justify-center">
              {illustration}
            </div>
          ) : (
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-bg-subtle/50 flex items-center justify-center mb-2">
                <Icon className="w-8 h-8 text-text-secondary" />
              </div>
              {/* Decorative ring */}
              <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-dashed border-border-primary/30" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto">
          <h3
            id={titleId}
            className="text-lg font-semibold text-text-primary mb-2"
          >
            {title}
          </h3>
          <p
            id={descriptionId}
            className="text-sm text-text-secondary leading-relaxed mb-6"
          >
            {description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Primary action */}
          {primaryAction && (
            <Button
              ref={(el) => {
                if (el) actionButtonRefs.current[0] = el;
              }}
              onClick={primaryAction.onClick}
              className="w-full sm:w-auto"
              ripple
              haptic
              ariaDescribedBy={`${descriptionId} primary-action-description`}
            >
              {primaryAction.icon && (
                <primaryAction.icon className="w-4 h-4 mr-2" />
              )}
              {primaryAction.label}
            </Button>
          )}

          {/* Secondary actions */}
          {secondaryActions.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {secondaryActions.map((action, index) => {
                const ActionIcon = action.icon;
                const buttonIndex = primaryAction ? index + 1 : index;
                return (
                  <Button
                    key={index}
                    ref={(el) => {
                      if (el) actionButtonRefs.current[buttonIndex] = el;
                    }}
                    variant={action.variant || "outline"}
                    size="sm"
                    onClick={action.onClick}
                    className="text-xs"
                    ariaDescribedBy={descriptionId}
                  >
                    {ActionIcon && <ActionIcon className="w-3 h-3 mr-1.5" />}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Additional content */}
        {children && <div className="mt-6 w-full">{children}</div>}
      </div>
    );

    if (!animate) return content;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25,
          delay: 0.1,
        }}
      >
        {content}
      </motion.div>
    );
  },
);
EmptyState.displayName = "EmptyState";

// Specialized empty state components
const EstimatesEmptyState = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, "type">
>((props, ref) => <EmptyState ref={ref} type="estimates" {...props} />);
EstimatesEmptyState.displayName = "EstimatesEmptyState";

const SearchEmptyState = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, "type">
>((props, ref) => <EmptyState ref={ref} type="searchResults" {...props} />);
SearchEmptyState.displayName = "SearchEmptyState";

const CustomersEmptyState = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, "type">
>((props, ref) => <EmptyState ref={ref} type="customers" {...props} />);
CustomersEmptyState.displayName = "CustomersEmptyState";

const PhotosEmptyState = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, "type">
>((props, ref) => <EmptyState ref={ref} type="photos" {...props} />);
PhotosEmptyState.displayName = "PhotosEmptyState";

const AnalyticsEmptyState = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, "type">
>((props, ref) => <EmptyState ref={ref} type="analytics" {...props} />);
AnalyticsEmptyState.displayName = "AnalyticsEmptyState";

const InboxEmptyState = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, "type">
>((props, ref) => <EmptyState ref={ref} type="inbox" {...props} />);
InboxEmptyState.displayName = "InboxEmptyState";

const AIEmptyState = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, "type">
>((props, ref) => <EmptyState ref={ref} type="aiSuggestions" {...props} />);
AIEmptyState.displayName = "AIEmptyState";

const ErrorEmptyState = React.forwardRef<
  HTMLDivElement,
  Omit<EmptyStateProps, "type">
>((props, ref) => <EmptyState ref={ref} type="error" {...props} />);
ErrorEmptyState.displayName = "ErrorEmptyState";

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
};

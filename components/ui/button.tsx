"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, MotionProps, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  useFocusable,
  useFocusManager,
  AccessibilityAnnouncer,
} from "./focus-management";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-normal ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary-action text-text-inverted shadow-sm hover:bg-primary-hover hover:shadow-md active:bg-primary-active active:scale-[0.98] active:shadow-sm disabled:bg-primary-disabled disabled:text-text-muted",
        destructive:
          "bg-error-600 text-text-inverted shadow-sm hover:bg-error-700 hover:shadow-md active:bg-error-700 active:scale-[0.98] active:shadow-sm disabled:bg-error-300 disabled:text-text-muted",
        outline:
          "border border-border-primary bg-bg-base text-text-primary shadow-xs hover:bg-bg-elevated hover:border-border-secondary hover:shadow-sm active:bg-bg-subtle active:scale-[0.98] disabled:bg-bg-base disabled:border-border-primary disabled:text-text-muted",
        secondary:
          "bg-secondary-action text-text-primary shadow-xs hover:bg-secondary-hover hover:shadow-sm active:bg-secondary-active active:scale-[0.98] active:shadow-xs disabled:bg-bg-muted disabled:text-text-muted",
        ghost:
          "text-text-primary hover:bg-bg-elevated hover:text-text-primary active:bg-bg-subtle active:scale-[0.98] disabled:text-text-muted",
        link: "text-primary-600 underline-offset-4 hover:text-primary-700 hover:underline active:text-primary-800 disabled:text-text-muted disabled:no-underline",
        success:
          "bg-success-600 text-text-inverted shadow-sm hover:bg-success-700 hover:shadow-md active:bg-success-700 active:scale-[0.98] active:shadow-sm disabled:bg-success-300 disabled:text-text-muted",
        warning:
          "bg-warning-600 text-text-inverted shadow-sm hover:bg-warning-700 hover:shadow-md active:bg-warning-700 active:scale-[0.98] active:shadow-sm disabled:bg-warning-300 disabled:text-text-muted",
      },
      size: {
        xs: "h-8 px-2.5 text-xs rounded-md",
        sm: "h-9 px-3 text-sm rounded-md",
        default: "h-10 px-4 text-sm rounded-md",
        lg: "h-11 px-6 text-base rounded-lg",
        xl: "h-12 px-8 text-base rounded-lg",
        icon: "h-10 w-10 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-12 w-12 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  motionProps?: Omit<MotionProps, "children">;
  ripple?: boolean;
  haptic?: boolean;
  // Enhanced accessibility props
  ariaLabel?: string;
  ariaDescribedBy?: string;
  focusId?: string;
  focusPriority?: number;
  announceChanges?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      children,
      disabled,
      motionProps,
      ripple = false,
      haptic = false,
      onClick,
      // Enhanced accessibility props
      ariaLabel,
      ariaDescribedBy,
      focusId,
      focusPriority = 0,
      announceChanges = false,
      ...props
    },
    ref,
  ) => {
    const [rippleArray, setRippleArray] = React.useState<
      Array<{ x: number; y: number; id: number }>
    >([]);

    const rippleIdRef = React.useRef(0);

    // Enhanced focus management integration
    const { announceToScreenReader } = useFocusManager();
    const generatedId = React.useId();
    const focusRef = useFocusable(
      focusId || `button-${generatedId}`,
      focusPriority,
      [disabled, loading],
    );

    // Merge refs for focus management
    const mergedRef = React.useCallback(
      (node: HTMLButtonElement) => {
        focusRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [focusRef, ref],
    );

    // State change announcements
    const [previousLoading, setPreviousLoading] = React.useState(loading);
    React.useEffect(() => {
      if (announceChanges && previousLoading !== loading) {
        if (loading) {
          announceToScreenReader("Button is loading");
        } else if (previousLoading) {
          announceToScreenReader("Button loading complete");
        }
        setPreviousLoading(loading);
      }
    }, [loading, previousLoading, announceToScreenReader, announceChanges]);

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        // Haptic feedback for mobile devices
        if (haptic && "vibrate" in navigator) {
          navigator.vibrate(10);
        }

        // Ripple effect
        if (ripple && !disabled && !loading) {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const id = rippleIdRef.current++;

          setRippleArray((prev) => [...prev, { x, y, id }]);
        }

        onClick?.(e);
      },
      [haptic, ripple, disabled, loading, onClick],
    );

    // Cleanup ripple animations on unmount or when ripples change
    React.useEffect(() => {
      if (rippleArray.length === 0) return;

      const timeouts: NodeJS.Timeout[] = [];

      rippleArray.forEach((rippleItem) => {
        const timeout = setTimeout(() => {
          setRippleArray((prev) => prev.filter((r) => r.id !== rippleItem.id));
        }, 600);
        timeouts.push(timeout);
      });

      // Cleanup function to clear all timeouts
      return () => {
        timeouts.forEach((timeout) => clearTimeout(timeout));
      };
    }, [rippleArray]);

    const defaultMotionProps: MotionProps = {
      whileHover: disabled || loading ? {} : { scale: 1.02 },
      whileTap: disabled || loading ? {} : { scale: 0.98 },
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 0.5,
      },
      ...motionProps,
    };

    const Comp = asChild ? Slot : motion.button;

    // Filter out button-specific props when using asChild to prevent prop conflicts
    if (asChild) {
      const {
        // Remove button-specific props that might conflict with child components
        type,
        value,
        onSubmit,
        form,
        formAction,
        formEncType,
        formMethod,
        formNoValidate,
        formTarget,
        ...filteredProps
      } = props;

      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          // Don't override child's onClick when using asChild - let Link handle navigation
          // {...(onClick ? { onClick: handleClick } : {})}
          {...filteredProps}
        >
          {children}
        </Slot>
      );
    }

    return (
      <>
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={mergedRef}
          disabled={disabled || loading}
          onClick={handleClick}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-busy={loading}
          {...defaultMotionProps}
          {...props}
        >
          {/* Loading spinner with enhanced animation */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="rounded-full h-4 w-4 border-2 border-current border-t-transparent"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ripple effects */}
          {ripple && (
            <AnimatePresence>
              {rippleArray.map((rippleItem) => (
                <motion.span
                  key={rippleItem.id}
                  className="absolute rounded-full bg-current opacity-20 pointer-events-none"
                  initial={{
                    width: 0,
                    height: 0,
                    x: rippleItem.x,
                    y: rippleItem.y,
                    opacity: 0.4,
                  }}
                  animate={{
                    width: 200,
                    height: 200,
                    x: rippleItem.x - 100,
                    y: rippleItem.y - 100,
                    opacity: 0,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              ))}
            </AnimatePresence>
          )}

          {/* Button content with loading state */}
          <motion.span
            animate={{ opacity: loading ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2"
          >
            {children}
          </motion.span>
        </Comp>

        {/* Accessibility announcements for state changes */}
        {announceChanges && loading && (
          <AccessibilityAnnouncer
            message="Button is loading"
            priority="polite"
          />
        )}
      </>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

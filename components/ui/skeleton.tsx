"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const skeletonVariants = cva(
  "animate-pulse rounded bg-border-primary/20 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-border-primary/20",
        elevated: "bg-border-primary/30",
        shimmer:
          "bg-gradient-to-r from-border-primary/10 via-border-primary/20 to-border-primary/10",
        pulse: "bg-border-primary/20",
        wave: "bg-border-primary/15",
      },
      size: {
        xs: "h-3",
        sm: "h-4",
        default: "h-5",
        lg: "h-6",
        xl: "h-8",
        "2xl": "h-10",
        "3xl": "h-12",
      },
      rounded: {
        none: "rounded-none",
        sm: "rounded-sm",
        default: "rounded",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
    },
  },
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  animate?: boolean;
  delay?: number;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = "default",
      size,
      rounded,
      animate = true,
      delay = 0,
      ...props
    },
    ref,
  ) => {
    const shimmerAnimation = {
      initial: { backgroundPosition: "-200% 0" },
      animate: { backgroundPosition: "200% 0" },
      transition: {
        duration: 2,
        ease: "linear",
        repeat: Infinity,
        delay,
      },
    };

    const pulseAnimation = {
      initial: { opacity: 0.4 },
      animate: { opacity: [0.4, 0.8, 0.4] },
      transition: {
        duration: 1.5,
        ease: "easeInOut",
        repeat: Infinity,
        delay,
      },
    };

    const waveAnimation = {
      initial: { transform: "translateX(-100%)" },
      animate: { transform: "translateX(100%)" },
      transition: {
        duration: 1.8,
        ease: "easeInOut",
        repeat: Infinity,
        delay,
      },
    };

    const getAnimation = () => {
      if (!animate) return {};

      switch (variant) {
        case "shimmer":
          return shimmerAnimation;
        case "pulse":
          return pulseAnimation;
        case "wave":
          return waveAnimation;
        default:
          return pulseAnimation;
      }
    };

    if (variant === "shimmer") {
      return (
        <motion.div
          ref={ref}
          className={cn(
            skeletonVariants({ variant: "default", size, rounded }),
            "bg-gradient-to-r from-border-primary/10 via-border-primary/20 to-border-primary/10 bg-[length:200%_100%]",
            className,
          )}
          {...(animate ? shimmerAnimation : {})}
          {...props}
        />
      );
    }

    if (variant === "wave") {
      return (
        <div
          ref={ref}
          className={cn(
            skeletonVariants({ variant: "default", size, rounded }),
            "relative overflow-hidden",
            className,
          )}
          {...props}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-bg-elevated/0 via-bg-elevated/50 to-bg-elevated/0"
            {...(animate ? waveAnimation : {})}
          />
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={cn(skeletonVariants({ variant, size, rounded }), className)}
        {...(animate ? getAnimation() : {})}
        {...props}
      />
    );
  },
);
Skeleton.displayName = "Skeleton";

// Composite skeleton components for common patterns
const SkeletonText = React.forwardRef<
  HTMLDivElement,
  Omit<SkeletonProps, "size"> & {
    lines?: number;
    lineHeight?: "tight" | "normal" | "relaxed";
    lastLineWidth?: "full" | "3/4" | "1/2" | "1/3";
  }
>(
  (
    {
      lines = 1,
      lineHeight = "normal",
      lastLineWidth = "3/4",
      className,
      delay = 0,
      ...props
    },
    ref,
  ) => {
    const lineHeightClasses = {
      tight: "mb-1",
      normal: "mb-2",
      relaxed: "mb-3",
    };

    const lastLineWidths = {
      full: "w-full",
      "3/4": "w-3/4",
      "1/2": "w-1/2",
      "1/3": "w-1/3",
    };

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn(
              "h-4",
              lineHeightClasses[lineHeight],
              index === lines - 1 && lines > 1
                ? lastLineWidths[lastLineWidth]
                : "w-full",
            )}
            delay={delay + index * 0.1}
            {...props}
          />
        ))}
      </div>
    );
  },
);
SkeletonText.displayName = "SkeletonText";

const SkeletonCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hasHeader?: boolean;
    hasFooter?: boolean;
    contentLines?: number;
    variant?: "default" | "elevated" | "outlined";
  }
>(
  (
    {
      hasHeader = true,
      hasFooter = false,
      contentLines = 3,
      variant = "default",
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border p-6 space-y-4",
          variant === "default" && "border-border-primary bg-bg-elevated",
          variant === "elevated" &&
            "border-border-primary bg-bg-base shadow-md",
          variant === "outlined" && "border-2 border-border-primary bg-bg-base",
          className,
        )}
        {...props}
      >
        {hasHeader && (
          <div className="space-y-2 pb-4 border-b border-border-primary/50">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" variant="shimmer" delay={0.1} />
          </div>
        )}

        <div className="space-y-3">
          <SkeletonText lines={contentLines} delay={0.2} />
        </div>

        {hasFooter && (
          <div className="pt-4 border-t border-border-primary/50 flex gap-2">
            <Skeleton className="h-9 w-20" rounded="md" delay={0.4} />
            <Skeleton className="h-9 w-24" rounded="md" delay={0.5} />
          </div>
        )}
      </div>
    );
  },
);
SkeletonCard.displayName = "SkeletonCard";

const SkeletonList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    items?: number;
    showAvatar?: boolean;
    showActions?: boolean;
  }
>(
  (
    { items = 3, showAvatar = false, showActions = false, className, ...props },
    ref,
  ) => {
    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {Array.from({ length: items }).map((_, index) => (
          <div
            key={index}
            className="flex items-center space-x-4 p-4 rounded-lg border border-border-primary bg-bg-elevated"
          >
            {showAvatar && (
              <Skeleton
                className="h-10 w-10"
                rounded="full"
                delay={index * 0.1}
              />
            )}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4" delay={index * 0.1} />
              <Skeleton
                className="h-3 w-3/4"
                variant="shimmer"
                delay={index * 0.1 + 0.05}
              />
            </div>
            {showActions && (
              <div className="flex space-x-2">
                <Skeleton
                  className="h-8 w-8"
                  rounded="md"
                  delay={index * 0.1 + 0.1}
                />
                <Skeleton
                  className="h-8 w-8"
                  rounded="md"
                  delay={index * 0.1 + 0.15}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  },
);
SkeletonList.displayName = "SkeletonList";

const SkeletonTable = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    rows?: number;
    columns?: number;
    hasHeader?: boolean;
  }
>(({ rows = 5, columns = 4, hasHeader = true, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border-primary overflow-hidden",
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div className="bg-bg-subtle border-b border-border-primary p-4">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-4 w-full"
                delay={index * 0.05}
              />
            ))}
          </div>
        </div>
      )}
      <div className="divide-y divide-border-primary">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className="h-4 w-full"
                  variant="shimmer"
                  delay={rowIndex * 0.1 + colIndex * 0.02}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
SkeletonTable.displayName = "SkeletonTable";

export { Skeleton, SkeletonText, SkeletonCard, SkeletonList, SkeletonTable };

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground transition-all duration-normal ease-out relative overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-border-primary bg-bg-elevated shadow-sm hover:shadow-md hover:border-border-secondary",
        elevated:
          "border-border-primary bg-bg-base shadow-md hover:shadow-lg hover:border-border-secondary",
        outlined:
          "border-2 border-border-primary bg-bg-base hover:border-border-focus hover:shadow-sm",
        ghost:
          "border-transparent bg-transparent hover:bg-bg-elevated hover:shadow-sm",
        interactive:
          "border-border-primary bg-bg-elevated shadow-sm hover:shadow-lg hover:border-border-focus hover:scale-[1.02] cursor-pointer active:scale-[0.98]",
        gradient:
          "border-border-primary bg-gradient-to-br from-bg-elevated to-bg-subtle shadow-md hover:shadow-lg hover:from-bg-base hover:to-bg-elevated",
        feature:
          "border-2 border-primary-200 bg-primary-50/30 shadow-sm hover:shadow-md hover:border-primary-300 hover:bg-primary-50/50",
        warning:
          "border-warning-200 bg-warning-50/30 shadow-sm hover:shadow-md hover:border-warning-300",
        success:
          "border-success-200 bg-success-50/30 shadow-sm hover:shadow-md hover:border-success-300",
        error:
          "border-error-200 bg-error-50/30 shadow-sm hover:shadow-md hover:border-error-300",
        glass:
          "border-border-primary/50 bg-bg-elevated/80 backdrop-blur-md shadow-lg hover:shadow-xl hover:bg-bg-elevated/90",
      },
      size: {
        xs: "p-3",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  loading?: boolean;
  disabled?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant, size, loading, disabled, children, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, size }),
        disabled && "opacity-60 pointer-events-none",
        loading && "pointer-events-none",
        className,
      )}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 bg-bg-base/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-border-primary border-t-primary-600" />
            Loading...
          </div>
        </div>
      )}
      {children}
    </div>
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: "xs" | "sm" | "default" | "lg" | "xl";
  }
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    xs: "p-3 pb-1",
    sm: "p-4 pb-2",
    default: "p-6 pb-4",
    lg: "p-8 pb-6",
    xl: "p-10 pb-8",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-2 border-b border-border-primary/50",
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: "xs" | "sm" | "default" | "lg" | "xl";
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";
  }
>(({ className, size = "default", as: Component = "div", ...props }, ref) => {
  const sizeClasses = {
    xs: "text-base font-medium",
    sm: "text-lg font-medium",
    default: "text-xl font-semibold",
    lg: "text-2xl font-bold",
    xl: "text-3xl font-bold",
  };

  return (
    <Component
      ref={ref}
      className={cn(
        "leading-tight tracking-tight text-text-primary",
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: "xs" | "sm" | "default" | "lg" | "xl";
  }
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-xs",
    default: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "text-text-secondary leading-relaxed",
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: "xs" | "sm" | "default" | "lg" | "xl";
  }
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    xs: "p-3 pt-1",
    sm: "p-4 pt-2",
    default: "p-6 pt-4",
    lg: "p-8 pt-6",
    xl: "p-10 pt-8",
  };

  return (
    <div ref={ref} className={cn(sizeClasses[size], className)} {...props} />
  );
});
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: "xs" | "sm" | "default" | "lg" | "xl";
  }
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    xs: "p-3 pt-1",
    sm: "p-4 pt-2",
    default: "p-6 pt-4",
    lg: "p-8 pt-6",
    xl: "p-10 pt-8",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center border-t border-border-primary/50 bg-bg-subtle/50",
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};

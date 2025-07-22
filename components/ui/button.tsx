import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-all duration-normal ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
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
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    // Filter out button-specific props when using asChild to prevent prop conflicts
    if (asChild) {
      const {
        // Remove button-specific props that might conflict with child components
        type,
        value,
        onClick,
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
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          // Only pass through safe props, let the child handle its own events
          {...filteredProps}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          </div>
        )}
        <span className={cn(loading && "opacity-0")}>{children}</span>
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

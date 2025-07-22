import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground transition-colors hover:border-border-primary",
  {
    variants: {
      variant: {
        default: "bg-bg-elevated text-text-primary border-border-primary",
        destructive:
          "border-feedback-error/50 text-feedback-error dark:border-feedback-error [&>svg]:text-feedback-error bg-feedback-error/5",
        warning:
          "border-feedback-warning/50 text-feedback-warning dark:border-feedback-warning [&>svg]:text-feedback-warning bg-feedback-warning/5",
        success:
          "border-feedback-success/50 text-feedback-success dark:border-feedback-success [&>svg]:text-feedback-success bg-feedback-success/5",
        info: "border-feedback-info/50 text-feedback-info dark:border-feedback-info [&>svg]:text-feedback-info bg-feedback-info/5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };

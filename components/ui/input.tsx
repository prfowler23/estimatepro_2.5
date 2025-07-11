import * as React from "react"

import { cn } from "@/lib/utils/index"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-border-primary bg-bg-base px-3 py-2 text-base text-text-primary ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:border-border-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-elevated md:text-sm transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <div className="h-full w-full overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    );
  },
);

ScrollArea.displayName = "ScrollArea";

export { ScrollArea };

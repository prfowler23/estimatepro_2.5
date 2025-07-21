import { Building } from "lucide-react";

export function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <Building className="h-12 w-12 text-primary animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function ComponentLoader({
  size = "md",
}: {
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`}
      />
    </div>
  );
}

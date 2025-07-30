"use client";

import React, { ReactNode } from "react";
import { sanitizeInput } from "@/lib/utils/calculator-security";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

interface CalculatorSecurityWrapperProps {
  children: ReactNode;
  componentName: string;
}

interface SecureTextProps {
  children: unknown;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

// Component to securely render text content
export function SecureText({
  children,
  className,
  as: Component = "span",
}: SecureTextProps) {
  const sanitized = sanitizeInput(children);

  return <Component className={className}>{sanitized}</Component>;
}

// Security wrapper with error boundary for calculator components
export function CalculatorSecurityWrapper({
  children,
  componentName,
}: CalculatorSecurityWrapperProps) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (
        event.message.includes("XSS") ||
        event.message.includes("injection")
      ) {
        setHasError(true);
        setError(new Error("Security violation detected"));
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError && error) {
    return (
      <Alert variant="destructive" className="my-4">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Security issue detected in {componentName}. Please refresh the page
          and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

// HOC to wrap calculator forms with security
export function withCalculatorSecurity<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
) {
  return function SecuredComponent(props: P) {
    return (
      <CalculatorSecurityWrapper componentName={componentName}>
        <Component {...props} />
      </CalculatorSecurityWrapper>
    );
  };
}

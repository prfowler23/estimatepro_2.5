// Export the toast hook from the toast provider
export { useToast, useToastActions } from "./toast/toast-provider";

// Export types for convenience
export type { Toast } from "./toast/toast-provider";

// Create a simplified toast function that works with the existing provider
export function toast({
  title,
  description,
  variant = "default",
}: {
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning";
}) {
  // This is a simplified interface that maps to our existing toast system
  // Components should preferably use useToastActions hook directly
  console.warn(
    "Using toast() function outside component context. Use useToastActions hook instead.",
  );

  const type =
    variant === "destructive"
      ? "error"
      : variant === "success"
        ? "success"
        : variant === "warning"
          ? "warning"
          : "info";

  console.log(
    `Toast: ${type.toUpperCase()} - ${title}${description ? ` - ${description}` : ""}`,
  );
}

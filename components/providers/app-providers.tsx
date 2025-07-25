"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { StartupValidationProvider } from "@/components/providers/startup-validation-provider";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { NotificationProvider } from "@/components/ui/standardized-notifications";
import { FocusManager } from "@/components/ui/focus-management";

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Composite provider that combines related providers to reduce nesting
 * in the main layout and improve maintainability
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="estimatepro-theme">
      <NotificationProvider
        maxNotifications={5}
        defaultPosition="top-right"
        defaultDuration={5000}
      >
        <FocusManager
          enableSkipLinks={true}
          skipLinks={[
            { href: "#main-content", label: "Skip to main content" },
            { href: "#navigation", label: "Skip to navigation" },
            { href: "#mobile-nav", label: "Skip to mobile navigation" },
          ]}
        >
          <StartupValidationProvider showValidationUI={false}>
            <AuthProvider>{children}</AuthProvider>
          </StartupValidationProvider>
        </FocusManager>
      </NotificationProvider>
    </ThemeProvider>
  );
}

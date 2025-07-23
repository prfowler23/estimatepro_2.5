import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/layout/navigation";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import EnterpriseEstimationBackground from "@/components/enterprise-estimation-background";
import { AuthProvider } from "@/contexts/auth-context";
import { StartupValidationProvider } from "@/components/providers/startup-validation-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { ErrorBoundary } from "@/components/error-handling/error-boundary";
import { ClientOnly } from "@/components/ui/client-only";
import { ClientErrorHandler } from "./error-handler";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PWAInitializer } from "@/components/pwa/pwa-initializer";
import { FocusManager } from "@/components/ui/focus-management";
import { NotificationProvider } from "@/components/ui/standardized-notifications";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EstimatePro - Building Services Estimating Platform",
  description:
    "Professional estimating software for building services contractors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EstimatePro" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <script src="/sw-register.js" defer></script>

        {/* Enhanced Accessibility Meta Tags */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta
          name="description"
          content="Professional estimating software for building services contractors with AI-powered analysis and real-time collaboration"
        />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="en-US" />
        <meta name="accessibility" content="WCAG 2.1 AA compliant" />
      </head>
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientErrorHandler />
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
              <PWAInitializer />
              <StartupValidationProvider>
                <AuthProvider>
                  <EnterpriseEstimationBackground>
                    <ErrorBoundary level="component">
                      <Navigation />
                    </ErrorBoundary>
                    <ErrorBoundary level="page">
                      <main
                        id="main-content"
                        role="main"
                        className="min-h-screen bg-background pb-16 md:pb-0"
                        tabIndex={-1}
                      >
                        {children}
                      </main>
                    </ErrorBoundary>
                    <ClientOnly>
                      <MobileBottomNav />
                      <InstallPrompt />
                      <OfflineIndicator />
                    </ClientOnly>
                  </EnterpriseEstimationBackground>
                </AuthProvider>
              </StartupValidationProvider>
            </FocusManager>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

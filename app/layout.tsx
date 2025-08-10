import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/layout/navigation";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import EnterpriseEstimationBackground from "@/components/enterprise-estimation-background";
import { UnifiedAppProviders } from "@/components/providers/unified-app-providers";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { ErrorBoundary } from "@/components/error-handling/error-boundary";
import { ClientOnly } from "@/components/ui/client-only";
import { ClientErrorHandler } from "./error-handler";
// Lazy load non-critical components for bundle optimization
import { lazy, Suspense } from "react";

const PWAInitializer = lazy(() =>
  import("@/components/pwa/pwa-initializer").then((m) => ({
    default: m.PWAInitializer,
  })),
);
const WebVitalsReporter = lazy(() =>
  import("@/components/performance/web-vitals-reporter").then((m) => ({
    default: m.WebVitalsReporter,
  })),
);
const RoutePreloader = lazy(() =>
  import("@/components/optimization/RoutePreloader").then((m) => ({
    default: m.RoutePreloader,
  })),
);

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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EstimatePro" />
        <link rel="apple-touch-icon" href="/icon-192x192.svg" />
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
        <Suspense fallback={null}>
          <PWAInitializer />
        </Suspense>
        <Suspense fallback={null}>
          <WebVitalsReporter />
        </Suspense>
        <Suspense fallback={null}>
          <RoutePreloader />
        </Suspense>
        <UnifiedAppProviders>
          <EnterpriseEstimationBackground>
            <ErrorBoundary>
              <Navigation />
            </ErrorBoundary>
            <ErrorBoundary>
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
        </UnifiedAppProviders>
      </body>
    </html>
  );
}

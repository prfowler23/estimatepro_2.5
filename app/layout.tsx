import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/layout/navigation";
import EnterpriseEstimationBackground from "@/components/enterprise-estimation-background";
import { AuthProvider } from "@/contexts/auth-context";
import { StartupValidationProvider } from "@/components/providers/startup-validation-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { ErrorBoundary } from "@/components/error-handling/error-boundary";

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
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EstimatePro" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <script src="/sw-register.js" defer></script>
      </head>
      <body className={`${inter.variable} ${robotoMono.variable} antialiased`}>
        <StartupValidationProvider>
          <AuthProvider>
            <EnterpriseEstimationBackground>
              <ErrorBoundary level="component">
                <Navigation />
              </ErrorBoundary>
              <ErrorBoundary level="page">
                <main className="min-h-screen bg-background">{children}</main>
              </ErrorBoundary>
              <InstallPrompt />
              <OfflineIndicator />
            </EnterpriseEstimationBackground>
          </AuthProvider>
        </StartupValidationProvider>
      </body>
    </html>
  );
}

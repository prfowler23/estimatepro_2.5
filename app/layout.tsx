import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/layout/navigation";
import EnterpriseEstimationBackground from "@/components/enterprise-estimation-background";
import { AuthProvider } from "@/contexts/auth-context";

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
  description: "Professional estimating software for building services contractors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased`}
      >
        <AuthProvider>
          <EnterpriseEstimationBackground>
            <Navigation />
            <main className="min-h-screen bg-background">
              {children}
            </main>
          </EnterpriseEstimationBackground>
        </AuthProvider>
      </body>
    </html>
  );
}
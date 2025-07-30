"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EnhancedDashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function EnhancedDashboardLayout({
  children,
  className,
}: EnhancedDashboardLayoutProps) {
  return (
    <div className={cn("relative min-h-screen", className)}>
      {/* Background pattern */}
      <div className="fixed inset-0 -z-10">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(to right, var(--color-primary-200) 1px, transparent 1px),
                             linear-gradient(to bottom, var(--color-primary-200) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />

        {/* Animated floating orbs */}
        <div className="absolute inset-0 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={cn(
                "absolute rounded-full blur-3xl",
                i === 0 && "h-96 w-96 bg-accent-sand/10 -top-48 -left-48",
                i === 1 && "h-64 w-64 bg-primary-400/10 top-1/3 right-1/4",
                i === 2 && "h-80 w-80 bg-accent-taupe/10 bottom-0 right-0",
              )}
              animate={{
                x: [0, 30, 0],
                y: [0, -30, 0],
              }}
              transition={{
                duration: 20 + i * 5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
      </div>

      {/* Main content with fade-in animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}

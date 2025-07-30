"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedDashboardHeaderProps {
  userName?: string;
  className?: string;
}

export function EnhancedDashboardHeader({
  userName = "there",
  className,
}: EnhancedDashboardHeaderProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className={cn("mb-8", className)}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-gradient">{getGreeting()}</span>{" "}
          <span className="text-text-primary">{userName}</span>
          <motion.span
            className="inline-block ml-2"
            animate={{ rotate: [0, 20, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Sparkles className="h-8 w-8 text-accent-sand" />
          </motion.span>
        </h1>

        <p className="text-text-secondary text-lg">
          Ready to create something amazing today?
        </p>

        {/* Performance indicators */}
        <div className="flex items-center gap-6 mt-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <div className="h-2 w-2 rounded-full bg-success-500 animate-pulse" />
            <span className="text-sm text-text-tertiary">
              All systems operational
            </span>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2"
          >
            <div className="h-2 w-2 rounded-full bg-primary-500" />
            <span className="text-sm text-text-tertiary">
              3 estimates in progress
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Decorative divider */}
      <motion.div
        className="mt-6 h-px bg-gradient-primary"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
    </div>
  );
}

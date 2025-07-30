"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: boolean;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  gradient = false,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("relative mb-8", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
            className="text-primary-500"
          >
            {icon}
          </motion.div>
        )}

        <div>
          <h2
            className={cn(
              "text-2xl font-bold",
              gradient ? "text-gradient" : "text-text-primary",
            )}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Decorative animated dots */}
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-accent-sand"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Animated underline */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-primary"
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
    </div>
  );
}

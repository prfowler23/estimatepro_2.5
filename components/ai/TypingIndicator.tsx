"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  isTyping: boolean;
  variant?: "dots" | "pulse" | "wave";
  className?: string;
  label?: string;
}

export function TypingIndicator({
  isTyping,
  variant = "dots",
  className,
  label = "AI is thinking",
}: TypingIndicatorProps) {
  return (
    <AnimatePresence>
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn("flex items-center gap-3", className)}
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-muted rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              {variant === "dots" && <DotIndicator />}
              {variant === "pulse" && <PulseIndicator />}
              {variant === "wave" && <WaveIndicator />}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DotIndicator() {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-primary/50 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

function PulseIndicator() {
  return (
    <div className="relative w-6 h-6">
      <motion.div
        className="absolute inset-0 bg-primary/30 rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      />
      <div className="absolute inset-2 bg-primary/50 rounded-full" />
    </div>
  );
}

function WaveIndicator() {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-1 bg-primary/50 rounded-full"
          animate={{
            height: ["8px", "16px", "8px"],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

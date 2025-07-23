"use client";

// PHASE 3 FIX: Visual swipe indicator component for mobile navigation
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { SwipeDirection } from "@/hooks/useSwipeGestures";

interface SwipeIndicatorProps {
  direction: SwipeDirection | null;
  isActive: boolean;
  progress?: number;
  className?: string;
  showHints?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "minimal" | "full" | "ghost";
}

export function SwipeIndicator({
  direction,
  isActive,
  progress = 0,
  className = "",
  showHints = true,
  size = "md",
  variant = "full",
}: SwipeIndicatorProps) {
  const getIcon = (dir: SwipeDirection) => {
    const iconProps = {
      className: `${
        size === "sm" ? "w-4 h-4" : size === "md" ? "w-5 h-5" : "w-6 h-6"
      }`,
    };

    switch (dir) {
      case "left":
        return <ChevronLeft {...iconProps} />;
      case "right":
        return <ChevronRight {...iconProps} />;
      case "up":
        return <ChevronUp {...iconProps} />;
      case "down":
        return <ChevronDown {...iconProps} />;
    }
  };

  const getDirectionStyles = (dir: SwipeDirection) => {
    switch (dir) {
      case "left":
        return {
          position: "left-4",
          bg: "bg-blue-500/20",
          border: "border-blue-500/40",
          text: "text-blue-600",
          arrow: "bg-blue-500",
        };
      case "right":
        return {
          position: "right-4",
          bg: "bg-green-500/20",
          border: "border-green-500/40",
          text: "text-green-600",
          arrow: "bg-green-500",
        };
      case "up":
        return {
          position: "top-4 left-1/2 -translate-x-1/2",
          bg: "bg-purple-500/20",
          border: "border-purple-500/40",
          text: "text-purple-600",
          arrow: "bg-purple-500",
        };
      case "down":
        return {
          position: "bottom-4 left-1/2 -translate-x-1/2",
          bg: "bg-orange-500/20",
          border: "border-orange-500/40",
          text: "text-orange-600",
          arrow: "bg-orange-500",
        };
    }
  };

  const getActionHint = (dir: SwipeDirection) => {
    switch (dir) {
      case "left":
        return "Next Step";
      case "right":
        return "Previous Step";
      case "up":
        return "Open Menu";
      case "down":
        return "Close Menu";
    }
  };

  if (!direction || !isActive) {
    return null;
  }

  const styles = getDirectionStyles(direction);
  const sizeClasses = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4",
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={`fixed ${styles.position} z-50 pointer-events-none ${className}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
          }}
        >
          {variant === "full" && (
            <motion.div
              className={`
                ${styles.bg} ${styles.border} ${styles.text}
                ${sizeClasses[size]}
                border-2 rounded-full backdrop-blur-sm
                flex flex-col items-center justify-center
                min-w-16 min-h-16
              `}
              animate={{
                scale: progress > 0.5 ? 1.1 : 1,
                rotate: progress * 5,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
            >
              <motion.div
                className={`${styles.arrow} p-2 rounded-full text-white`}
                animate={{
                  x:
                    direction === "left"
                      ? -progress * 8
                      : direction === "right"
                        ? progress * 8
                        : 0,
                  y:
                    direction === "up"
                      ? -progress * 8
                      : direction === "down"
                        ? progress * 8
                        : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              >
                {getIcon(direction)}
              </motion.div>

              {showHints && (
                <motion.span
                  className="text-xs font-medium mt-1 whitespace-nowrap"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {getActionHint(direction)}
                </motion.span>
              )}
            </motion.div>
          )}

          {variant === "minimal" && (
            <motion.div
              className={`
                ${styles.arrow} p-3 rounded-full text-white shadow-lg
              `}
              animate={{
                scale: progress > 0.3 ? 1.2 : 1,
                x:
                  direction === "left"
                    ? -progress * 10
                    : direction === "right"
                      ? progress * 10
                      : 0,
                y:
                  direction === "up"
                    ? -progress * 10
                    : direction === "down"
                      ? progress * 10
                      : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 20,
              }}
            >
              {getIcon(direction)}
            </motion.div>
          )}

          {variant === "ghost" && (
            <motion.div
              className={`
                ${styles.text} opacity-60
              `}
              animate={{
                x:
                  direction === "left"
                    ? -progress * 20
                    : direction === "right"
                      ? progress * 20
                      : 0,
                y:
                  direction === "up"
                    ? -progress * 20
                    : direction === "down"
                      ? progress * 20
                      : 0,
                opacity: 0.6 + progress * 0.4,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
            >
              {getIcon(direction)}
            </motion.div>
          )}

          {/* Progress ring for full variant */}
          {variant === "full" && progress > 0 && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, ${styles.arrow.replace("bg-", "").replace("-500", "")} ${progress * 360}deg, transparent ${progress * 360}deg)`,
                mask: "radial-gradient(circle, transparent 70%, black 72%)",
                WebkitMask:
                  "radial-gradient(circle, transparent 70%, black 72%)",
              }}
              animate={{
                rotate: progress * 360,
              }}
              transition={{
                type: "tween",
                duration: 0.1,
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Component for showing permanent swipe hints
export function SwipeHints({
  showLeft = true,
  showRight = true,
  className = "",
  variant = "ghost",
}: {
  showLeft?: boolean;
  showRight?: boolean;
  className?: string;
  variant?: "ghost" | "minimal";
}) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <AnimatePresence>
        {showLeft && (
          <motion.div
            className="fixed left-4 top-1/2 -translate-y-1/2 z-40"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 0.4, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 1,
            }}
          >
            {variant === "ghost" ? (
              <motion.div
                className="text-gray-400"
                animate={{
                  x: [-5, 0, -5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "loop",
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                className="bg-gray-500/20 border border-gray-500/30 p-2 rounded-full backdrop-blur-sm"
                animate={{
                  x: [-5, 0, -5],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "loop",
                }}
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </motion.div>
            )}
          </motion.div>
        )}

        {showRight && (
          <motion.div
            className="fixed right-4 top-1/2 -translate-y-1/2 z-40"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 0.4, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay: 1.2,
            }}
          >
            {variant === "ghost" ? (
              <motion.div
                className="text-gray-400"
                animate={{
                  x: [5, 0, 5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: 0.5,
                }}
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                className="bg-gray-500/20 border border-gray-500/30 p-2 rounded-full backdrop-blur-sm"
                animate={{
                  x: [5, 0, 5],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: 0.5,
                }}
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SwipeIndicator;

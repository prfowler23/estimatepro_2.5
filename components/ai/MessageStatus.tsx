"use client";

import { motion } from "framer-motion";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type MessageStatus = "sending" | "sent" | "delivered" | "error";

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  timestamp?: Date;
  className?: string;
}

export function MessageStatusIndicator({
  status,
  timestamp,
  className,
}: MessageStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "sending":
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Clock className="w-3 h-3 text-muted-foreground" />
          </motion.div>
        );
      case "sent":
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-primary" />;
      case "error":
        return <AlertCircle className="w-3 h-3 text-destructive" />;
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("flex items-center gap-1 text-xs", className)}
    >
      {timestamp && (
        <span className="text-muted-foreground">{formatTime(timestamp)}</span>
      )}
      {getStatusIcon()}
    </motion.div>
  );
}

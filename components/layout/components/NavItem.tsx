"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { NavItem as NavItemType } from "../config/navigation.config";

interface NavItemProps {
  item: NavItemType;
  isActive: boolean;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "mobile" | "compact";
  showBadge?: boolean;
  ariaLabel?: string;
}

export const NavItem = React.memo(function NavItem({
  item,
  isActive,
  className,
  onClick,
  variant = "default",
  showBadge = true,
  ariaLabel,
}: NavItemProps) {
  const Icon = item.icon;

  const content = (
    <>
      <Icon
        className={cn(
          "transition-transform duration-200",
          variant === "mobile" ? "h-5 w-5" : "h-4 w-4",
          isActive && "scale-110",
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          variant === "compact" && "sr-only",
          variant === "mobile" && "text-xs",
        )}
      >
        {item.title}
      </span>
      {showBadge && item.badge && (
        <Badge
          variant={typeof item.badge === "number" ? "destructive" : "outline"}
          className={cn(
            "ml-1",
            variant === "mobile" && "text-[10px] px-1 py-0",
          )}
        >
          {typeof item.badge === "number"
            ? item.badge > 9
              ? "9+"
              : item.badge
            : typeof item.badge === "string"
              ? item.badge
              : "•"}
        </Badge>
      )}
    </>
  );

  const linkClasses = cn(
    "flex items-center gap-2 transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    className,
  );

  return (
    <Link
      href={item.href}
      className={linkClasses}
      onClick={onClick}
      aria-label={ariaLabel || item.title}
      aria-current={isActive ? "page" : undefined}
    >
      {content}
    </Link>
  );
});

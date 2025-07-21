"use client";

import React, { useState, useRef, useEffect } from "react";
import { useHelp } from "./HelpProvider";
import { HelpContent } from "@/lib/help/help-context-engine";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  X,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Info,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface HelpTooltipProps {
  children: React.ReactNode;
  fieldId?: string;
  trigger?: "hover" | "click" | "focus" | "auto";
  position?: "top" | "bottom" | "left" | "right" | "auto";
  className?: string;
  disabled?: boolean;
  showIcon?: boolean;
  helpContent?: HelpContent; // Override for custom content
}

export function HelpTooltip({
  children,
  fieldId,
  trigger = "hover",
  position = "auto",
  className = "",
  disabled = false,
  showIcon = true,
  helpContent,
}: HelpTooltipProps) {
  const {
    state,
    getContextualHelp,
    markHelpful,
    markNotHelpful,
    trackBehavior,
  } = useHelp();

  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get relevant help content
  const relevantHelp =
    helpContent ||
    getContextualHelp().find(
      (help) => help.context.fieldId === fieldId || help.type === "tooltip",
    );

  useEffect(() => {
    if (isVisible && position === "auto") {
      calculateOptimalPosition();
    }
  }, [isVisible, position]);

  useEffect(() => {
    if (trigger === "auto" && state.currentContext && fieldId) {
      // Auto-trigger based on context
      const shouldShow = state.triggeredHelp.some(
        (help) => help.context.fieldId === fieldId,
      );
      setIsVisible(shouldShow);
    }
  }, [trigger, state.triggeredHelp, fieldId, state.currentContext]);

  // Don't render if no help content or disabled
  if (!relevantHelp || disabled) {
    return <>{children}</>;
  }

  const calculateOptimalPosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let optimalPosition = "top";

    // Check space above and below
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    // Prefer top/bottom first
    if (spaceBelow >= tooltipRect.height + 10) {
      optimalPosition = "bottom";
    } else if (spaceAbove >= tooltipRect.height + 10) {
      optimalPosition = "top";
    } else if (spaceRight >= tooltipRect.width + 10) {
      optimalPosition = "right";
    } else if (spaceLeft >= tooltipRect.width + 10) {
      optimalPosition = "left";
    }

    setActualPosition(optimalPosition as any);
  };

  const handleShow = () => {
    if (!isVisible) {
      setIsVisible(true);
      trackBehavior("tooltip_show", { fieldId, helpId: relevantHelp.id });
    }
  };

  const handleHide = () => {
    if (isVisible && trigger !== "auto") {
      setIsVisible(false);
      trackBehavior("tooltip_hide", { fieldId, helpId: relevantHelp.id });
    }
  };

  const handleToggle = () => {
    if (isVisible) {
      handleHide();
    } else {
      handleShow();
    }
  };

  const handleHelpful = () => {
    markHelpful(relevantHelp.id);
    trackBehavior("tooltip_helpful", { fieldId, helpId: relevantHelp.id });
  };

  const handleNotHelpful = () => {
    markNotHelpful(relevantHelp.id);
    trackBehavior("tooltip_not_helpful", { fieldId, helpId: relevantHelp.id });
  };

  const getPositionClasses = () => {
    const baseClasses = "absolute z-50 w-80 max-w-[90vw]";

    switch (actualPosition) {
      case "top":
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case "bottom":
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case "left":
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case "right":
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
    }
  };

  const getArrowClasses = () => {
    const baseClasses = "absolute w-3 h-3 transform rotate-45";

    switch (actualPosition) {
      case "top":
        return `${baseClasses} top-full left-1/2 -translate-x-1/2 -mt-1.5 bg-white border-r border-b border-gray-200`;
      case "bottom":
        return `${baseClasses} bottom-full left-1/2 -translate-x-1/2 -mb-1.5 bg-white border-l border-t border-gray-200`;
      case "left":
        return `${baseClasses} left-full top-1/2 -translate-y-1/2 -ml-1.5 bg-white border-t border-r border-gray-200`;
      case "right":
        return `${baseClasses} right-full top-1/2 -translate-y-1/2 -mr-1.5 bg-white border-b border-l border-gray-200`;
      default:
        return `${baseClasses} bottom-full left-1/2 -translate-x-1/2 -mb-1.5 bg-white border-l border-t border-gray-200`;
    }
  };

  const getPriorityIcon = () => {
    if (relevantHelp.priority >= 8) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    } else if (relevantHelp.priority >= 5) {
      return <Info className="w-4 h-4 text-blue-500" />;
    } else {
      return <HelpCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const triggerProps = {
    onMouseEnter: trigger === "hover" ? handleShow : undefined,
    onMouseLeave: trigger === "hover" ? handleHide : undefined,
    onClick: trigger === "click" ? handleToggle : undefined,
    onFocus: trigger === "focus" ? handleShow : undefined,
    onBlur: trigger === "focus" ? handleHide : undefined,
  };

  return (
    <div className={`relative inline-block ${className}`} ref={triggerRef}>
      {/* Trigger Element */}
      <div className="flex items-center gap-2" {...triggerProps}>
        {children}
        {showIcon && (
          <button
            type="button"
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
            onClick={trigger !== "click" ? handleToggle : undefined}
            aria-label="Show help"
          >
            {getPriorityIcon()}
          </button>
        )}
      </div>

      {/* Tooltip */}
      {isVisible && (
        <>
          {/* Backdrop for click-outside on mobile */}
          {trigger === "click" && (
            <div className="fixed inset-0 z-40" onClick={handleHide} />
          )}

          <div ref={tooltipRef} className={getPositionClasses()}>
            {/* Arrow */}
            <div className={getArrowClasses()} />

            {/* Content */}
            <Card className="bg-white border border-gray-200 shadow-lg">
              <div className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    {getPriorityIcon()}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {relevantHelp.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {relevantHelp.type}
                        </Badge>
                        {relevantHelp.priority >= 8 && (
                          <Badge variant="destructive" className="text-xs">
                            Important
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleHide}
                    className="h-6 w-6 p-0 flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                {/* Content */}
                <div className="text-sm text-gray-700 leading-relaxed">
                  {relevantHelp.content}
                </div>

                {/* Tags */}
                {relevantHelp.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {relevantHelp.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {relevantHelp.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{relevantHelp.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500">Was this helpful?</div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleHelpful}
                      className="h-6 px-2 text-xs"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNotHelpful}
                      className="h-6 px-2 text-xs"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// Convenience component for field-specific help
export function FieldHelpTooltip({
  children,
  fieldId,
  ...props
}: Omit<HelpTooltipProps, "fieldId"> & { fieldId: string }) {
  return (
    <HelpTooltip fieldId={fieldId} {...props}>
      {children}
    </HelpTooltip>
  );
}

export default HelpTooltip;

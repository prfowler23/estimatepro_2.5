"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import { useHelp } from "./HelpProvider";
import { TutorialStep } from "@/lib/help/help-types";
import { helpPerformanceMonitor } from "@/lib/help/help-performance";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  SkipForward,
  CheckCircle,
  Circle,
  Target,
  MousePointer,
} from "lucide-react";

interface InteractiveTutorialProps {
  className?: string;
}

const InteractiveTutorialComponent = ({
  className = "",
}: InteractiveTutorialProps) => {
  // Track tutorial performance
  useEffect(() => {
    helpPerformanceMonitor.startTiming("tutorial_render");
    return () => {
      helpPerformanceMonitor.endTiming("tutorial_render");
    };
  }, []);
  const {
    state,
    nextTutorialStep,
    previousTutorialStep,
    exitTutorial,
    trackBehavior,
  } = useHelp();

  const [isHighlighting, setIsHighlighting] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [overlayPosition, setOverlayPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  });
  const overlayRef = useRef<HTMLDivElement>(null);

  const { activeTutorial, tutorialStep } = state;

  const updateOverlayPosition = useCallback(
    (element?: HTMLElement) => {
      const target = element || targetElement;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const padding = 8;

      setOverlayPosition({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });
    },
    [targetElement],
  );

  const highlightElement = useCallback((element: HTMLElement) => {
    setIsHighlighting(true);

    // Add highlight class
    element.classList.add("tutorial-highlight");

    // Scroll element into view
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // Remove highlight after animation
    setTimeout(() => {
      element.classList.remove("tutorial-highlight");
    }, 2000);
  }, []);

  const updateTargetElement = useCallback(
    (step: TutorialStep) => {
      if (step.targetElement) {
        const element = document.querySelector(
          step.targetElement,
        ) as HTMLElement;
        if (element) {
          setTargetElement(element);
          updateOverlayPosition(element);
          highlightElement(element);
        }
      } else {
        setTargetElement(null);
        setIsHighlighting(false);
      }
    },
    [updateOverlayPosition, highlightElement],
  );

  useEffect(() => {
    if (activeTutorial && activeTutorial.steps[tutorialStep]) {
      const step = activeTutorial.steps[tutorialStep];
      updateTargetElement(step);
    }
  }, [activeTutorial, tutorialStep, updateTargetElement]);

  useEffect(() => {
    const handleResize = () => {
      if (targetElement) {
        updateOverlayPosition();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [targetElement, updateOverlayPosition]);

  if (!activeTutorial) return null;

  const currentStep = activeTutorial.steps[tutorialStep];
  const isFirstStep = tutorialStep === 0;
  const isLastStep = tutorialStep === activeTutorial.steps.length - 1;
  const progress = ((tutorialStep + 1) / activeTutorial.steps.length) * 100;

  const handleNext = () => {
    // Track step completion time
    helpPerformanceMonitor.startTiming("tutorial_step_transition");

    if (currentStep.action && targetElement) {
      // Simulate or validate the required action
      validateStepAction(currentStep, targetElement);
    }

    nextTutorialStep();
    trackBehavior("tutorial_step_complete", {
      tutorialId: activeTutorial.id,
      stepId: currentStep.id,
      stepNumber: tutorialStep + 1,
    });

    helpPerformanceMonitor.endTiming("tutorial_step_transition");
  };

  const handlePrevious = () => {
    previousTutorialStep();
    trackBehavior("tutorial_step_back", {
      tutorialId: activeTutorial.id,
      stepId: currentStep.id,
      stepNumber: tutorialStep + 1,
    });
  };

  const handleExit = () => {
    exitTutorial();
    setIsHighlighting(false);
    trackBehavior("tutorial_exit", {
      tutorialId: activeTutorial.id,
      completedSteps: tutorialStep + 1,
      totalSteps: activeTutorial.steps.length,
    });
  };

  const handleSkip = () => {
    // Skip to the end
    for (let i = tutorialStep; i < activeTutorial.steps.length - 1; i++) {
      nextTutorialStep();
    }
    trackBehavior("tutorial_skip", {
      tutorialId: activeTutorial.id,
      skippedFromStep: tutorialStep + 1,
    });
  };

  const validateStepAction = (step: TutorialStep, element: HTMLElement) => {
    // This would contain validation logic for different action types
    switch (step.action) {
      case "click":
        // Simulate click or wait for actual click
        element.click();
        break;
      case "type":
        // Focus the input element
        if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
          element.focus();
        }
        break;
      case "scroll":
        // Ensure element is in view
        element.scrollIntoView({ behavior: "smooth" });
        break;
      default:
        // No action required
        break;
    }
  };

  const getStepIcon = (step: TutorialStep, index: number) => {
    if (index < tutorialStep) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (index === tutorialStep) {
      return <Target className="w-4 h-4 text-blue-500" />;
    } else {
      return <Circle className="w-4 h-4 text-gray-300" />;
    }
  };

  const getPositionClasses = () => {
    if (!targetElement) {
      return "fixed bottom-4 right-4 w-80";
    }

    const rect = targetElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Position the tutorial card relative to the target element
    if (rect.bottom + 200 < viewportHeight) {
      // Show below if there's space
      return "fixed w-80";
    } else if (rect.top - 200 > 0) {
      // Show above if there's space
      return "fixed w-80";
    } else {
      // Show to the side
      return "fixed w-80";
    }
  };

  const getTutorialCardStyle = () => {
    if (!targetElement) {
      return { bottom: "1rem", right: "1rem" };
    }

    const rect = targetElement.getBoundingClientRect();
    const cardWidth = 320; // w-80
    const cardHeight = 200; // estimated
    const padding = 16;

    let top, left;

    // Try to position below the target
    if (rect.bottom + cardHeight + padding < window.innerHeight) {
      top = rect.bottom + padding;
      left = Math.max(
        padding,
        Math.min(rect.left, window.innerWidth - cardWidth - padding),
      );
    }
    // Try to position above the target
    else if (rect.top - cardHeight - padding > 0) {
      top = rect.top - cardHeight - padding;
      left = Math.max(
        padding,
        Math.min(rect.left, window.innerWidth - cardWidth - padding),
      );
    }
    // Position to the side
    else if (rect.right + cardWidth + padding < window.innerWidth) {
      top = Math.max(
        padding,
        Math.min(rect.top, window.innerHeight - cardHeight - padding),
      );
      left = rect.right + padding;
    } else {
      top = Math.max(
        padding,
        Math.min(rect.top, window.innerHeight - cardHeight - padding),
      );
      left = Math.max(padding, rect.left - cardWidth - padding);
    }

    return { top, left };
  };

  return (
    <>
      {/* Overlay backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />

      {/* Target element spotlight */}
      {isHighlighting && targetElement && (
        <div
          className="fixed border-2 border-blue-500 bg-blue-500 bg-opacity-10 rounded z-50 pointer-events-none transition-all duration-300"
          style={{
            top: overlayPosition.top,
            left: overlayPosition.left,
            width: overlayPosition.width,
            height: overlayPosition.height,
          }}
        />
      )}

      {/* Tutorial card */}
      <div
        className={`${getPositionClasses()} z-50 ${className}`}
        style={getTutorialCardStyle()}
      >
        <Card className="bg-white shadow-xl border-2 border-blue-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">
                    {activeTutorial.title}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {tutorialStep + 1} of {activeTutorial.steps.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExit}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-blue-700 mt-1">
                <span>Step {tutorialStep + 1}</span>
                <span>{Math.round(progress)}% complete</span>
              </div>
            </div>
          </div>

          {/* Step content */}
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">
                {currentStep.title}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {currentStep.content}
              </p>
            </div>

            {/* Action indicator */}
            {currentStep.action && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <MousePointer className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-yellow-800 capitalize">
                  {currentStep.action} the highlighted element
                </span>
              </div>
            )}

            {/* Step navigator */}
            <div className="flex items-center justify-center gap-1 py-2">
              {activeTutorial.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-center"
                  title={step.title}
                >
                  {getStepIcon(step, index)}
                  {index < activeTutorial.steps.length - 1 && (
                    <div
                      className={`w-4 h-0.5 mx-1 ${
                        index < tutorialStep ? "bg-green-300" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                  className="text-xs"
                >
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-xs text-gray-500"
                >
                  <SkipForward className="w-3 h-3 mr-1" />
                  Skip
                </Button>
              </div>

              <Button onClick={handleNext} size="sm" className="text-xs">
                {isLastStep ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Complete
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Tutorial highlight styles */}
      <style jsx global>{`
        .tutorial-highlight {
          animation: tutorialPulse 2s ease-in-out;
          position: relative;
          z-index: 51;
        }

        @keyframes tutorialPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0.3);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
      `}</style>
    </>
  );
};

export const InteractiveTutorial = memo(InteractiveTutorialComponent);
export default InteractiveTutorial;

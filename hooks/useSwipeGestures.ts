"use client";

// PHASE 3 FIX: Swipe gesture navigation hook for mobile step navigation
import { useCallback, useRef, useEffect } from "react";

interface SwipeGestureConfig {
  threshold: number; // Minimum distance for swipe (px)
  velocity: number; // Minimum velocity for swipe (px/ms)
  restraint: number; // Maximum perpendicular distance (px)
  allowTime: number; // Maximum time for gesture (ms)
  preventScroll: boolean; // Prevent default scroll behavior
}

interface SwipeGestureCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (direction: SwipeDirection | null) => void;
  onSwipeEnd?: () => void;
}

export type SwipeDirection = "left" | "right" | "up" | "down";

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  isActive: boolean;
}

const DEFAULT_CONFIG: SwipeGestureConfig = {
  threshold: 50,
  velocity: 0.3,
  restraint: 100,
  allowTime: 300,
  preventScroll: false,
};

export function useSwipeGestures(
  callbacks: SwipeGestureCallbacks,
  config: Partial<SwipeGestureConfig> = {},
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const touchData = useRef<TouchData>({
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
    isActive: false,
  });

  const swipeDirection = useRef<SwipeDirection | null>(null);

  // Calculate swipe direction and strength
  const calculateSwipe = useCallback(
    (endX: number, endY: number, endTime: number): SwipeDirection | null => {
      const { startX, startY, startTime } = touchData.current;

      const distanceX = endX - startX;
      const distanceY = endY - startY;
      const elapsedTime = endTime - startTime;

      // Check if gesture is within time limit
      if (elapsedTime > finalConfig.allowTime) {
        return null;
      }

      const absDistanceX = Math.abs(distanceX);
      const absDistanceY = Math.abs(distanceY);

      // Determine primary direction
      if (absDistanceX >= absDistanceY) {
        // Horizontal swipe
        if (
          absDistanceX >= finalConfig.threshold &&
          absDistanceY <= finalConfig.restraint
        ) {
          const velocity = absDistanceX / elapsedTime;
          if (velocity >= finalConfig.velocity) {
            return distanceX > 0 ? "right" : "left";
          }
        }
      } else {
        // Vertical swipe
        if (
          absDistanceY >= finalConfig.threshold &&
          absDistanceX <= finalConfig.restraint
        ) {
          const velocity = absDistanceY / elapsedTime;
          if (velocity >= finalConfig.velocity) {
            return distanceY > 0 ? "down" : "up";
          }
        }
      }

      return null;
    },
    [finalConfig],
  );

  // Handle touch start
  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      touchData.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        currentX: touch.clientX,
        currentY: touch.clientY,
        isActive: true,
      };

      swipeDirection.current = null;
      callbacks.onSwipeStart?.(null);

      if (finalConfig.preventScroll) {
        event.preventDefault();
      }
    },
    [callbacks, finalConfig.preventScroll],
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!touchData.current.isActive || event.touches.length !== 1) return;

      const touch = event.touches[0];
      touchData.current.currentX = touch.clientX;
      touchData.current.currentY = touch.clientY;

      // Calculate potential swipe direction for early feedback
      const potentialDirection = calculateSwipe(
        touch.clientX,
        touch.clientY,
        Date.now(),
      );

      if (potentialDirection && potentialDirection !== swipeDirection.current) {
        swipeDirection.current = potentialDirection;
        callbacks.onSwipeStart?.(potentialDirection);
      }

      if (finalConfig.preventScroll && swipeDirection.current) {
        event.preventDefault();
      }
    },
    [callbacks, calculateSwipe, finalConfig.preventScroll],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!touchData.current.isActive) return;

      const touch = event.changedTouches[0];
      const direction = calculateSwipe(
        touch.clientX,
        touch.clientY,
        Date.now(),
      );

      touchData.current.isActive = false;

      if (direction) {
        switch (direction) {
          case "left":
            callbacks.onSwipeLeft?.();
            break;
          case "right":
            callbacks.onSwipeRight?.();
            break;
          case "up":
            callbacks.onSwipeUp?.();
            break;
          case "down":
            callbacks.onSwipeDown?.();
            break;
        }
      }

      callbacks.onSwipeEnd?.();
      swipeDirection.current = null;

      if (finalConfig.preventScroll) {
        event.preventDefault();
      }
    },
    [callbacks, calculateSwipe, finalConfig.preventScroll],
  );

  // Handle touch cancel
  const handleTouchCancel = useCallback(() => {
    touchData.current.isActive = false;
    callbacks.onSwipeEnd?.();
    swipeDirection.current = null;
  }, [callbacks]);

  // DOM event handlers for addEventListener (different from React handlers)
  const handleDOMTouchStart = useCallback(
    (event: TouchEvent) => {
      const reactEvent = {
        ...event,
        touches: event.touches,
        changedTouches: event.changedTouches,
        targetTouches: event.targetTouches,
      } as React.TouchEvent<HTMLElement>;
      handleTouchStart(reactEvent);
    },
    [handleTouchStart],
  );

  const handleDOMTouchMove = useCallback(
    (event: TouchEvent) => {
      const reactEvent = {
        ...event,
        touches: event.touches,
        changedTouches: event.changedTouches,
        targetTouches: event.targetTouches,
      } as React.TouchEvent<HTMLElement>;
      handleTouchMove(reactEvent);
    },
    [handleTouchMove],
  );

  const handleDOMTouchEnd = useCallback(
    (event: TouchEvent) => {
      const reactEvent = {
        ...event,
        touches: event.touches,
        changedTouches: event.changedTouches,
        targetTouches: event.targetTouches,
      } as React.TouchEvent<HTMLElement>;
      handleTouchEnd(reactEvent);
    },
    [handleTouchEnd],
  );

  // Get gesture handlers for binding to element
  const getSwipeHandlers = useCallback(() => {
    return {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  // Bind gestures to a ref element
  const bindSwipeGestures = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return () => {};

      element.addEventListener("touchstart", handleDOMTouchStart, {
        passive: !finalConfig.preventScroll,
      });
      element.addEventListener("touchmove", handleDOMTouchMove, {
        passive: !finalConfig.preventScroll,
      });
      element.addEventListener("touchend", handleDOMTouchEnd, {
        passive: !finalConfig.preventScroll,
      });
      element.addEventListener("touchcancel", handleTouchCancel, {
        passive: true,
      });

      return () => {
        element.removeEventListener("touchstart", handleDOMTouchStart);
        element.removeEventListener("touchmove", handleDOMTouchMove);
        element.removeEventListener("touchend", handleDOMTouchEnd);
        element.removeEventListener("touchcancel", handleTouchCancel);
      };
    },
    [
      handleDOMTouchStart,
      handleDOMTouchMove,
      handleDOMTouchEnd,
      handleTouchCancel,
      finalConfig.preventScroll,
    ],
  );

  return {
    getSwipeHandlers,
    bindSwipeGestures,
    isActive: touchData.current.isActive,
    currentDirection: swipeDirection.current,
  };
}

// Hook for step navigation specific swipe gestures
export function useStepSwipeNavigation(
  onNext: () => void,
  onBack: () => void,
  options: {
    enableVerticalSwipe?: boolean;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    hapticFeedback?: boolean;
  } = {},
) {
  const { enableVerticalSwipe = false, hapticFeedback = true } = options;

  // Haptic feedback helper
  const triggerHaptic = useCallback(
    (intensity: "light" | "medium" | "strong" = "medium") => {
      if (
        !hapticFeedback ||
        typeof window === "undefined" ||
        !("vibrate" in navigator)
      )
        return;

      const patterns = {
        light: 5,
        medium: 10,
        strong: 15,
      };
      navigator.vibrate(patterns[intensity]);
    },
    [hapticFeedback],
  );

  const swipeCallbacks: SwipeGestureCallbacks = {
    onSwipeLeft: useCallback(() => {
      triggerHaptic("medium");
      onNext();
    }, [onNext, triggerHaptic]),

    onSwipeRight: useCallback(() => {
      triggerHaptic("medium");
      onBack();
    }, [onBack, triggerHaptic]),

    onSwipeUp: enableVerticalSwipe
      ? useCallback(() => {
          triggerHaptic("light");
          options.onSwipeUp?.();
        }, [triggerHaptic, options])
      : undefined,

    onSwipeDown: enableVerticalSwipe
      ? useCallback(() => {
          triggerHaptic("light");
          options.onSwipeDown?.();
        }, [triggerHaptic, options])
      : undefined,

    onSwipeStart: useCallback(
      (direction: SwipeDirection | null) => {
        if (direction === "left" || direction === "right") {
          triggerHaptic("light");
        }
      },
      [triggerHaptic],
    ),
  };

  const swipeConfig: Partial<SwipeGestureConfig> = {
    threshold: 60,
    velocity: 0.4,
    restraint: 80,
    allowTime: 250,
    preventScroll: false,
  };

  return useSwipeGestures(swipeCallbacks, swipeConfig);
}

// Hook for enhanced swipe feedback with visual indicators
export function useSwipeWithFeedback(
  callbacks: SwipeGestureCallbacks,
  config?: Partial<SwipeGestureConfig>,
) {
  const swipeProgress = useRef<number>(0);
  const swipeIndicatorDirection = useRef<SwipeDirection | null>(null);

  const enhancedCallbacks: SwipeGestureCallbacks = {
    ...callbacks,
    onSwipeStart: useCallback(
      (direction: SwipeDirection | null) => {
        swipeIndicatorDirection.current = direction;
        callbacks.onSwipeStart?.(direction);
      },
      [callbacks],
    ),

    onSwipeEnd: useCallback(() => {
      swipeProgress.current = 0;
      swipeIndicatorDirection.current = null;
      callbacks.onSwipeEnd?.();
    }, [callbacks]),
  };

  const swipeGestures = useSwipeGestures(enhancedCallbacks, config);

  return {
    ...swipeGestures,
    swipeProgress: swipeProgress.current,
    indicatorDirection: swipeIndicatorDirection.current,
  };
}

export default useSwipeGestures;

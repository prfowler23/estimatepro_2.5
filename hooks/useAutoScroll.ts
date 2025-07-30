import { useEffect, useRef, useCallback, useState } from "react";

interface UseAutoScrollOptions {
  dependency?: any[];
  behavior?: ScrollBehavior;
  delay?: number;
  threshold?: number;
  enabled?: boolean;
}

export function useAutoScroll({
  dependency = [],
  behavior = "smooth",
  delay = 100,
  threshold = 100,
  enabled = true,
}: UseAutoScrollOptions = {}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Check if user is at bottom of scroll
  const checkIfAtBottom = useCallback(() => {
    if (!scrollRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, [threshold]);

  // Scroll to bottom
  const scrollToBottom = useCallback(
    (immediate = false) => {
      if (!scrollRef.current || !enabled) return;

      const scrollBehavior = immediate ? "instant" : behavior;

      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: scrollBehavior as ScrollBehavior,
      });
    },
    [behavior, enabled],
  );

  // Handle scroll event
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const atBottom = checkIfAtBottom();
    setIsAtBottom(atBottom);

    // If user scrolls up, disable auto-scroll
    if (!atBottom) {
      setIsAutoScrolling(false);
    }
  }, [checkIfAtBottom]);

  // Re-enable auto-scroll when user scrolls to bottom
  useEffect(() => {
    if (isAtBottom && !isAutoScrolling) {
      setIsAutoScrolling(true);
    }
  }, [isAtBottom, isAutoScrolling]);

  // Auto-scroll on dependency change
  useEffect(() => {
    if (!isAutoScrolling || !enabled) return;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Delay scroll to allow DOM updates
    scrollTimeoutRef.current = setTimeout(() => {
      scrollToBottom();
    }, delay);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [...dependency, isAutoScrolling, enabled, scrollToBottom, delay]);

  // Add scroll listener
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener("scroll", handleScroll, { passive: true });

    // Check initial position
    handleScroll();

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  // Manual controls
  const pauseAutoScroll = useCallback(() => {
    setIsAutoScrolling(false);
  }, []);

  const resumeAutoScroll = useCallback(() => {
    setIsAutoScrolling(true);
    scrollToBottom();
  }, [scrollToBottom]);

  const scrollToTop = useCallback(() => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollTo({
      top: 0,
      behavior: behavior as ScrollBehavior,
    });
    setIsAutoScrolling(false);
  }, [behavior]);

  return {
    scrollRef,
    isAutoScrolling,
    isAtBottom,
    scrollToBottom,
    scrollToTop,
    pauseAutoScroll,
    resumeAutoScroll,
  };
}

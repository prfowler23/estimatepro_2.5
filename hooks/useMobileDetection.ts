"use client";

import { useState, useEffect } from "react";

interface MobileDetectionResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: "portrait" | "landscape";
  touchDevice: boolean;
  platform: string;
  userAgent: string;
}

export function useMobileDetection(): MobileDetectionResult {
  const [detection, setDetection] = useState<MobileDetectionResult>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 1024,
    screenHeight: 768,
    orientation: "landscape",
    touchDevice: false,
    platform: "unknown",
    userAgent: "",
  });

  useEffect(() => {
    const updateDetection = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const userAgent = navigator.userAgent;

      // Mobile detection
      const isMobile = screenWidth < 768;
      const isTablet = screenWidth >= 768 && screenWidth < 1024;
      const isDesktop = screenWidth >= 1024;

      // Orientation
      const orientation = screenWidth < screenHeight ? "portrait" : "landscape";

      // Touch device detection
      const touchDevice =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

      // Platform detection
      let platform = "unknown";
      if (/Android/i.test(userAgent)) platform = "android";
      else if (/iPhone|iPad|iPod/i.test(userAgent)) platform = "ios";
      else if (/Windows/i.test(userAgent)) platform = "windows";
      else if (/Macintosh/i.test(userAgent)) platform = "macos";
      else if (/Linux/i.test(userAgent)) platform = "linux";

      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth,
        screenHeight,
        orientation,
        touchDevice,
        platform,
        userAgent,
      });
    };

    // Initial detection
    updateDetection();

    // Listen for resize and orientation changes
    window.addEventListener("resize", updateDetection);
    window.addEventListener("orientationchange", updateDetection);

    return () => {
      window.removeEventListener("resize", updateDetection);
      window.removeEventListener("orientationchange", updateDetection);
    };
  }, []);

  return detection;
}

// Additional mobile-specific utilities
export function useMobileViewport() {
  const detection = useMobileDetection();

  const setViewportHeight = () => {
    if (detection.isMobile) {
      // Set CSS custom property for mobile viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    }
  };

  useEffect(() => {
    setViewportHeight();
    window.addEventListener("resize", setViewportHeight);
    window.addEventListener("orientationchange", setViewportHeight);

    return () => {
      window.removeEventListener("resize", setViewportHeight);
      window.removeEventListener("orientationchange", setViewportHeight);
    };
  }, [detection.isMobile]);

  return detection;
}

// Mobile navigation helpers
export function useMobileNavigation() {
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = () => setIsNavigating(true);
  const endNavigation = () => setIsNavigating(false);

  // Prevent page bounce on iOS during navigation
  useEffect(() => {
    if (isNavigating) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [isNavigating]);

  return {
    isNavigating,
    startNavigation,
    endNavigation,
  };
}

// Mobile input helpers
export function useMobileInput() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const detection = useMobileDetection();

  useEffect(() => {
    if (!detection.isMobile) return;

    const initialHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialHeight - currentHeight;

      // Keyboard is likely open if height decreased by more than 150px
      setIsKeyboardOpen(heightDifference > 150);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [detection.isMobile]);

  return {
    isKeyboardOpen,
    isMobile: detection.isMobile,
  };
}

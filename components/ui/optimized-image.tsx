"use client";

import React, { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";
import {
  IMAGE_CONFIGS,
  generateSizesAttribute,
  generateBlurPlaceholder,
  imagePerformanceMonitor,
  type ImageOptimizationConfig,
} from "@/lib/optimization/image-optimization";

export interface OptimizedImageProps extends Omit<ImageProps, "src" | "alt"> {
  src: string;
  alt: string;

  // Optimization type
  variant?: keyof typeof IMAGE_CONFIGS;

  // Responsive configuration
  responsive?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
    wide?: string;
  };

  // Performance options
  enableMonitoring?: boolean;
  showLoadingState?: boolean;
  fallbackSrc?: string;

  // Container props
  containerClassName?: string;
  aspectRatio?: "square" | "video" | "portrait" | "wide" | number;
}

const ASPECT_RATIOS = {
  square: 1,
  video: 16 / 9,
  portrait: 3 / 4,
  wide: 21 / 9,
} as const;

export function OptimizedImage({
  src,
  alt,
  variant = "gallery",
  responsive,
  enableMonitoring = true,
  showLoadingState = true,
  fallbackSrc,
  containerClassName,
  aspectRatio,
  className,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadStartTime] = useState(Date.now());

  const config = IMAGE_CONFIGS[variant];

  // Generate responsive sizes if provided
  const sizes = responsive ? generateSizesAttribute(responsive) : props.sizes;

  // Generate blur placeholder if enabled
  const blurDataURL = config.blurPlaceholder
    ? generateBlurPlaceholder()
    : undefined;

  // Calculate aspect ratio styles
  const aspectRatioStyle = aspectRatio
    ? {
        aspectRatio:
          typeof aspectRatio === "number"
            ? aspectRatio
            : ASPECT_RATIOS[aspectRatio],
      }
    : undefined;

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const loadTime = Date.now() - loadStartTime;
    setIsLoading(false);

    // Record performance metrics
    if (enableMonitoring) {
      const img = e.currentTarget;
      const format = src.split(".").pop()?.toLowerCase() || "unknown";

      // Estimate size based on naturalWidth/Height (rough approximation)
      const estimatedSize = (img.naturalWidth * img.naturalHeight * 3) / 8; // Rough JPEG estimate

      imagePerformanceMonitor.recordImageLoad(
        src,
        loadTime,
        estimatedSize,
        format,
        false, // We can't reliably detect cache hits from React
      );
    }

    onLoad?.(e);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    setIsLoading(false);
    onError?.(e);
  };

  // Fallback component for error state
  if (hasError && fallbackSrc) {
    return (
      <OptimizedImage
        {...props}
        src={fallbackSrc}
        alt={`${alt} (fallback)`}
        variant={variant}
        responsive={responsive}
        enableMonitoring={false}
        showLoadingState={false}
        fallbackSrc={undefined}
        containerClassName={containerClassName}
        aspectRatio={aspectRatio}
        className={className}
      />
    );
  }

  if (hasError) {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center text-muted-foreground",
          aspectRatioStyle && "relative",
          containerClassName,
        )}
        style={aspectRatioStyle}
      >
        <div className="text-center p-4">
          <div className="text-2xl mb-2">📷</div>
          <div className="text-sm">Image unavailable</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        aspectRatioStyle && "w-full",
        containerClassName,
      )}
      style={aspectRatioStyle}
    >
      {/* Loading skeleton */}
      {isLoading && showLoadingState && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-border border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <Image
        src={src}
        alt={alt}
        fill={!!aspectRatioStyle}
        quality={config.quality}
        priority={config.priority}
        placeholder={blurDataURL ? "blur" : "empty"}
        blurDataURL={blurDataURL}
        sizes={sizes}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          aspectRatioStyle ? "object-cover" : "",
          className,
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
}

// Specialized variants for common use cases
export function GalleryImage(props: Omit<OptimizedImageProps, "variant">) {
  return <OptimizedImage {...props} variant="gallery" />;
}

export function ThumbnailImage(props: Omit<OptimizedImageProps, "variant">) {
  return <OptimizedImage {...props} variant="thumbnail" />;
}

export function HeroImage(props: Omit<OptimizedImageProps, "variant">) {
  return <OptimizedImage {...props} variant="hero" />;
}

export function AvatarImage(props: Omit<OptimizedImageProps, "variant">) {
  return <OptimizedImage {...props} variant="avatar" aspectRatio="square" />;
}

export function IconImage(props: Omit<OptimizedImageProps, "variant">) {
  return <OptimizedImage {...props} variant="icon" showLoadingState={false} />;
}

// Hook for image performance metrics
export function useImagePerformanceMetrics() {
  const [metrics, setMetrics] = useState(
    imagePerformanceMonitor.getMetricsReport(),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(imagePerformanceMonitor.getMetricsReport());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    clearMetrics: () => {
      imagePerformanceMonitor.clearMetrics();
      setMetrics(imagePerformanceMonitor.getMetricsReport());
    },
  };
}

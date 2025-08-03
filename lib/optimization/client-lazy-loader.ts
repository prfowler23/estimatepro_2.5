"use client";

import React, { lazy, ComponentType } from "react";

// Client-safe version of OptimizedLazyLoader without server-side dependencies
export class OptimizedLazyLoader {
  private static loadingCache = new Map<string, Promise<any>>();
  private static retryAttempts = new Map<string, number>();
  private static maxRetries = 3;

  static createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    fallback?: ComponentType,
    componentName?: string,
  ): ComponentType<React.ComponentProps<T>> {
    const cacheKey = componentName || importFn.toString();

    const LazyComponent = lazy(() => {
      // Check if already loading
      if (this.loadingCache.has(cacheKey)) {
        return this.loadingCache.get(cacheKey)!;
      }

      const loadPromise = importFn()
        .catch((error) => {
          const attempts = this.retryAttempts.get(cacheKey) || 0;

          if (attempts < this.maxRetries) {
            this.retryAttempts.set(cacheKey, attempts + 1);
            console.warn(
              `Retry ${attempts + 1}/${this.maxRetries} for ${componentName}:`,
              error,
            );

            // Exponential backoff
            return new Promise((resolve) => {
              setTimeout(
                () => {
                  resolve(importFn());
                },
                Math.pow(2, attempts) * 1000,
              );
            });
          }

          console.error(
            `Failed to load ${componentName} after ${this.maxRetries} attempts:`,
            error,
          );

          // Return fallback component
          return {
            default: (fallback ||
              ((props: any) => {
                return React.createElement(
                  "div",
                  {
                    className: "p-4 border border-red-200 bg-red-50 rounded-md",
                  },
                  [
                    React.createElement(
                      "p",
                      {
                        key: "error-message",
                        className: "text-red-800 text-sm",
                      },
                      `Failed to load ${componentName || "component"}`,
                    ),
                    React.createElement(
                      "button",
                      {
                        key: "retry-button",
                        onClick: () => {
                          this.loadingCache.delete(cacheKey);
                          this.retryAttempts.delete(cacheKey);
                          window.location.reload();
                        },
                        className:
                          "mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700",
                      },
                      "Retry",
                    ),
                  ],
                );
              })) as T,
          };
        })
        .finally(() => {
          this.loadingCache.delete(cacheKey);
          this.retryAttempts.delete(cacheKey);
        });

      this.loadingCache.set(cacheKey, loadPromise);
      return loadPromise;
    });

    return LazyComponent;
  }

  static preloadComponent(importFn: () => Promise<any>): void {
    // Preload during idle time
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        importFn().catch(() => {
          // Silent failure for preloading
        });
      });
    } else {
      setTimeout(() => {
        importFn().catch(() => {
          // Silent failure for preloading
        });
      }, 0);
    }
  }
}

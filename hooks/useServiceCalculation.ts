import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { calculationError } from "@/lib/utils/logger";
import {
  sanitizeCalculatorData,
  checkRateLimit,
} from "@/lib/utils/calculator-security";
import {
  getCalculatorPerformanceConfig,
  validateCalculatorData,
  type CalculatorConfig,
} from "@/lib/config/calculator-config";

interface UseServiceCalculationOptions<T> {
  form: UseFormReturn<T>;
  Calculator: new () => { calculate: (data: T) => any };
  schema: z.ZodSchema<T>;
  calculatorId: string; // Required for configuration lookup
  requiredFields?: (keyof T)[]; // Now optional, can be derived from config
  debounceMs?: number; // Optional, can be derived from config
}

interface PerformanceMetrics {
  calculationTime: number;
  validationTime: number;
  totalTime: number;
  timestamp: number;
  errorCount: number;
  cacheHit: boolean;
}

interface CalculationResult<T> {
  data: T | null;
  isValid: boolean;
  errors: string[];
  performance: PerformanceMetrics;
}

export function useServiceCalculation<T extends Record<string, any>>({
  form,
  Calculator,
  schema,
  calculatorId,
  requiredFields,
  debounceMs,
}: UseServiceCalculationOptions<T>) {
  const [calculation, setCalculation] = useState<CalculationResult<any> | null>(
    null,
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [performanceHistory, setPerformanceHistory] = useState<
    PerformanceMetrics[]
  >([]);
  const calculatorRef = useRef<InstanceType<typeof Calculator>>();
  const cacheRef = useRef<Map<string, { result: any; timestamp: number }>>(
    new Map(),
  );

  // Get performance configuration
  const performanceConfig = useMemo(
    () => getCalculatorPerformanceConfig(calculatorId),
    [calculatorId],
  );

  // Use config values or fallback to options
  const effectiveDebounceMs = debounceMs ?? performanceConfig.debounceMs;

  // Memoize calculator instance
  const calculator = useMemo(() => {
    if (!calculatorRef.current) {
      calculatorRef.current = new Calculator();
    }
    return calculatorRef.current;
  }, [Calculator]);

  // Performance tracking
  const trackPerformance = useCallback(
    (metrics: PerformanceMetrics) => {
      if (performanceConfig.enableAnalytics) {
        setPerformanceHistory((prev) => [...prev.slice(-19), metrics]); // Keep last 20 entries

        // Log performance issues
        if (metrics.totalTime > 1000) {
          // > 1 second
          calculationError(
            new Error(`Slow calculation detected for ${calculatorId}`),
            { metrics, calculatorId },
          );
        }
      }
    },
    [calculatorId, performanceConfig.enableAnalytics],
  );

  // Cache management
  const getCacheKey = useCallback((data: T): string => {
    return JSON.stringify(data);
  }, []);

  const getCachedResult = useCallback(
    (data: T) => {
      if (!performanceConfig.enableCaching) return null;

      const key = getCacheKey(data);
      const cached = cacheRef.current.get(key);

      if (
        cached &&
        Date.now() - cached.timestamp < performanceConfig.cacheTimeoutMs
      ) {
        return cached.result;
      }

      // Clean expired entries
      if (
        cached &&
        Date.now() - cached.timestamp >= performanceConfig.cacheTimeoutMs
      ) {
        cacheRef.current.delete(key);
      }

      return null;
    },
    [
      performanceConfig.enableCaching,
      performanceConfig.cacheTimeoutMs,
      getCacheKey,
    ],
  );

  const setCachedResult = useCallback(
    (data: T, result: any) => {
      if (!performanceConfig.enableCaching) return;

      const key = getCacheKey(data);
      cacheRef.current.set(key, {
        result,
        timestamp: Date.now(),
      });
    },
    [performanceConfig.enableCaching, getCacheKey],
  );

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const subscription = form.watch((values) => {
      // Clear any pending calculations
      clearTimeout(timeoutId);

      // Rate limiting check
      if (!checkRateLimit(`calculator-${calculatorId}`)) {
        setCalculation({
          data: null,
          isValid: false,
          errors: ["Rate limit exceeded. Please wait before trying again."],
          performance: {
            calculationTime: 0,
            validationTime: 0,
            totalTime: 0,
            timestamp: Date.now(),
            errorCount: 1,
            cacheHit: false,
          },
        });
        return;
      }

      // Use centralized validation if no requiredFields specified
      const validation = validateCalculatorData(calculatorId, values);

      if (validation.isValid) {
        setIsCalculating(true);
        timeoutId = setTimeout(async () => {
          const startTime = performance.now();
          let validationTime = 0;
          let calculationTime = 0;
          let errorCount = 0;
          let cacheHit = false;

          try {
            // Check cache first
            const cachedResult = getCachedResult(values as T);
            if (cachedResult) {
              cacheHit = true;
              const totalTime = performance.now() - startTime;

              setCalculation({
                data: cachedResult,
                isValid: true,
                errors: [],
                performance: {
                  calculationTime: 0,
                  validationTime: 0,
                  totalTime,
                  timestamp: Date.now(),
                  errorCount: 0,
                  cacheHit: true,
                },
              });

              trackPerformance({
                calculationTime: 0,
                validationTime: 0,
                totalTime,
                timestamp: Date.now(),
                errorCount: 0,
                cacheHit: true,
              });

              return;
            }

            // Validation timing
            const validationStart = performance.now();
            const sanitizedData = sanitizeCalculatorData(values as T, schema);
            validationTime = performance.now() - validationStart;

            if (sanitizedData) {
              // Calculation timing
              const calculationStart = performance.now();
              const result = calculator.calculate(sanitizedData);
              calculationTime = performance.now() - calculationStart;

              // Cache the result
              setCachedResult(values as T, result);

              const totalTime = performance.now() - startTime;
              const performanceMetrics: PerformanceMetrics = {
                calculationTime,
                validationTime,
                totalTime,
                timestamp: Date.now(),
                errorCount,
                cacheHit,
              };

              setCalculation({
                data: result,
                isValid: true,
                errors: [],
                performance: performanceMetrics,
              });

              trackPerformance(performanceMetrics);
            } else {
              errorCount++;
              setCalculation({
                data: null,
                isValid: false,
                errors: ["Data validation failed"],
                performance: {
                  calculationTime: 0,
                  validationTime,
                  totalTime: performance.now() - startTime,
                  timestamp: Date.now(),
                  errorCount,
                  cacheHit,
                },
              });
            }
          } catch (error) {
            errorCount++;
            const totalTime = performance.now() - startTime;

            calculationError(
              new Error(`${Calculator.name} calculation failed`),
              {
                error,
                formData: values,
                calculatorId,
                performance: { calculationTime, validationTime, totalTime },
              },
            );

            const performanceMetrics: PerformanceMetrics = {
              calculationTime,
              validationTime,
              totalTime,
              timestamp: Date.now(),
              errorCount,
              cacheHit,
            };

            setCalculation({
              data: null,
              isValid: false,
              errors: [
                error instanceof Error ? error.message : "Calculation failed",
              ],
              performance: performanceMetrics,
            });

            trackPerformance(performanceMetrics);
          } finally {
            setIsCalculating(false);
          }
        }, effectiveDebounceMs);
      } else {
        setCalculation({
          data: null,
          isValid: false,
          errors: validation.errors,
          performance: {
            calculationTime: 0,
            validationTime: 0,
            totalTime: 0,
            timestamp: Date.now(),
            errorCount: validation.errors.length,
            cacheHit: false,
          },
        });
        setIsCalculating(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [
    form,
    calculator,
    schema,
    calculatorId,
    effectiveDebounceMs,
    Calculator.name,
    getCachedResult,
    setCachedResult,
    trackPerformance,
  ]);

  // Calculate average performance metrics
  const calculateAverageMetrics = useCallback(
    (metrics: PerformanceMetrics[]) => {
      if (metrics.length === 0) return null;

      const totals = metrics.reduce(
        (acc, metric) => ({
          calculationTime: acc.calculationTime + metric.calculationTime,
          validationTime: acc.validationTime + metric.validationTime,
          totalTime: acc.totalTime + metric.totalTime,
          errorCount: acc.errorCount + metric.errorCount,
          cacheHits: acc.cacheHits + (metric.cacheHit ? 1 : 0),
        }),
        {
          calculationTime: 0,
          validationTime: 0,
          totalTime: 0,
          errorCount: 0,
          cacheHits: 0,
        },
      );

      return {
        averageCalculationTime: totals.calculationTime / metrics.length,
        averageValidationTime: totals.validationTime / metrics.length,
        averageTotalTime: totals.totalTime / metrics.length,
        errorRate: totals.errorCount / metrics.length,
        cacheHitRate: totals.cacheHits / metrics.length,
        totalCalculations: metrics.length,
      };
    },
    [],
  );

  return {
    calculation,
    isCalculating,
    performanceHistory,
    clearCache: useCallback(() => cacheRef.current.clear(), []),
    getAveragePerformance: useCallback(
      () => calculateAverageMetrics(performanceHistory),
      [calculateAverageMetrics, performanceHistory],
    ),
    cacheSize: cacheRef.current.size,
    config: performanceConfig,
  };
}

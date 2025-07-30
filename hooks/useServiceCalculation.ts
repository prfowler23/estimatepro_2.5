import { useState, useEffect, useMemo, useRef } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { calculationError } from "@/lib/utils/logger";
import { sanitizeCalculatorData } from "@/lib/utils/calculator-security";

interface UseServiceCalculationOptions<T> {
  form: UseFormReturn<T>;
  Calculator: new () => { calculate: (data: T) => any };
  schema: z.ZodSchema<T>;
  requiredFields: (keyof T)[];
  debounceMs?: number;
}

export function useServiceCalculation<T extends Record<string, any>>({
  form,
  Calculator,
  schema,
  requiredFields,
  debounceMs = 300,
}: UseServiceCalculationOptions<T>) {
  const [calculation, setCalculation] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const calculatorRef = useRef<InstanceType<typeof Calculator>>();

  // Memoize calculator instance
  const calculator = useMemo(() => {
    if (!calculatorRef.current) {
      calculatorRef.current = new Calculator();
    }
    return calculatorRef.current;
  }, [Calculator]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const subscription = form.watch((values) => {
      // Clear any pending calculations
      clearTimeout(timeoutId);

      // Check if all required fields are present
      const hasAllRequired = requiredFields.every((field) => {
        const value = values[field];
        return value !== undefined && value !== null && value !== "";
      });

      if (hasAllRequired) {
        setIsCalculating(true);
        timeoutId = setTimeout(() => {
          try {
            // Sanitize and validate data before calculation
            const sanitizedData = sanitizeCalculatorData(values as T, schema);
            if (sanitizedData) {
              const result = calculator.calculate(sanitizedData);
              setCalculation(result);
            }
          } catch (error) {
            calculationError(
              new Error(`${Calculator.name} calculation failed`),
              {
                error,
                formData: values,
              },
            );
            setCalculation(null);
          } finally {
            setIsCalculating(false);
          }
        }, debounceMs);
      } else {
        setCalculation(null);
        setIsCalculating(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [form, calculator, schema, requiredFields, debounceMs, Calculator.name]);

  return {
    calculation,
    isCalculating,
  };
}

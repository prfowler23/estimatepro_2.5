/**
 * Enhanced Mobile Input Component
 *
 * Mobile-first input components with advanced touch interactions,
 * haptic feedback, and responsive validation.
 *
 * Features:
 * - Touch-optimized input controls
 * - Haptic feedback on interactions
 * - Voice input support
 * - Progressive validation
 * - Accessibility compliance
 * - Camera integration for specific inputs
 *
 * Part of Phase 4 Priority 2: Advanced Touch Gestures & Haptic Feedback
 */

"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAdvancedTouchGestures } from "@/hooks/useAdvancedTouchGestures";
import {
  Mic,
  MicOff,
  Camera,
  Eye,
  EyeOff,
  X,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
} from "lucide-react";

interface EnhancedMobileInputProps {
  /**
   * Input type
   */
  type?: "text" | "email" | "tel" | "password" | "number" | "search" | "url";

  /**
   * Input label
   */
  label?: string;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Current value
   */
  value?: string | number;

  /**
   * Default value
   */
  defaultValue?: string | number;

  /**
   * Change handler
   */
  onChange?: (value: string | number) => void;

  /**
   * Blur handler
   */
  onBlur?: () => void;

  /**
   * Focus handler
   */
  onFocus?: () => void;

  /**
   * Validation error message
   */
  error?: string;

  /**
   * Help text
   */
  helpText?: string;

  /**
   * Required field
   */
  required?: boolean;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Enable voice input
   */
  enableVoiceInput?: boolean;

  /**
   * Enable camera input (for text recognition)
   */
  enableCameraInput?: boolean;

  /**
   * Enable haptic feedback
   */
  enableHaptics?: boolean;

  /**
   * Auto-focus on mount
   */
  autoFocus?: boolean;

  /**
   * Input mode for mobile keyboards
   */
  inputMode?:
    | "text"
    | "numeric"
    | "decimal"
    | "tel"
    | "email"
    | "url"
    | "search";

  /**
   * Custom className
   */
  className?: string;

  /**
   * Minimum value (for number inputs)
   */
  min?: number;

  /**
   * Maximum value (for number inputs)
   */
  max?: number;

  /**
   * Step value (for number inputs)
   */
  step?: number;

  /**
   * Custom validation function
   */
  validate?: (value: string | number) => string | undefined;

  /**
   * Debounce delay for onChange (ms)
   */
  debounceMs?: number;
}

/**
 * Enhanced mobile input with gestures and voice support
 */
export function EnhancedMobileInput({
  type = "text",
  label,
  placeholder,
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  error,
  helpText,
  required = false,
  disabled = false,
  loading = false,
  enableVoiceInput = false,
  enableCameraInput = false,
  enableHaptics = true,
  autoFocus = false,
  inputMode,
  className,
  min,
  max,
  step = 1,
  validate,
  debounceMs = 300,
}: EnhancedMobileInputProps) {
  const [internalValue, setInternalValue] = useState(
    value ?? defaultValue ?? "",
  );
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [validationError, setValidationError] = useState<string>();

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Voice recognition setup
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null,
  );

  useEffect(() => {
    if (
      enableVoiceInput &&
      typeof window !== "undefined" &&
      "webkitSpeechRecognition" in window
    ) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = "en-US";
        setRecognition(recognitionInstance);
      }
    }
  }, [enableVoiceInput]);

  // Haptic feedback
  const { triggerHapticFeedback } = useAdvancedTouchGestures(
    {},
    {
      enableHapticFeedback: enableHaptics,
    },
  );

  // Controlled vs uncontrolled
  const currentValue = value !== undefined ? value : internalValue;
  const displayValue =
    typeof currentValue === "number" ? currentValue.toString() : currentValue;

  // Debounced change handler
  const handleChange = useCallback(
    (newValue: string | number) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }

      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce the onChange call
      debounceRef.current = setTimeout(() => {
        onChange?.(newValue);

        // Run validation
        if (validate) {
          const validationResult = validate(newValue);
          setValidationError(validationResult);
        }
      }, debounceMs);
    },
    [value, onChange, validate, debounceMs],
  );

  // Handle input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue =
        type === "number"
          ? parseFloat(event.target.value) || 0
          : event.target.value;
      handleChange(newValue);
    },
    [type, handleChange],
  );

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    triggerHapticFeedback("selection");
    onFocus?.();
  }, [onFocus, triggerHapticFeedback]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  // Voice input handlers
  const startListening = useCallback(() => {
    if (!recognition || disabled) return;

    setIsListening(true);
    triggerHapticFeedback("impact", "light");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleChange(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [recognition, disabled, handleChange, triggerHapticFeedback]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    recognition.stop();
    setIsListening(false);
  }, [recognition]);

  // Number input handlers
  const incrementValue = useCallback(() => {
    if (type !== "number" || disabled) return;

    const numValue =
      typeof currentValue === "number"
        ? currentValue
        : parseFloat(displayValue) || 0;
    const newValue = Math.min(max ?? Infinity, numValue + step);
    handleChange(newValue);
    triggerHapticFeedback("impact", "light");
  }, [
    type,
    disabled,
    currentValue,
    displayValue,
    max,
    step,
    handleChange,
    triggerHapticFeedback,
  ]);

  const decrementValue = useCallback(() => {
    if (type !== "number" || disabled) return;

    const numValue =
      typeof currentValue === "number"
        ? currentValue
        : parseFloat(displayValue) || 0;
    const newValue = Math.max(min ?? -Infinity, numValue - step);
    handleChange(newValue);
    triggerHapticFeedback("impact", "light");
  }, [
    type,
    disabled,
    currentValue,
    displayValue,
    min,
    step,
    handleChange,
    triggerHapticFeedback,
  ]);

  // Clear input
  const clearInput = useCallback(() => {
    handleChange("");
    triggerHapticFeedback("impact", "light");
    inputRef.current?.focus();
  }, [handleChange, triggerHapticFeedback]);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
    triggerHapticFeedback("selection");
  }, [triggerHapticFeedback]);

  // Camera input (placeholder for future implementation)
  const handleCameraInput = useCallback(() => {
    triggerHapticFeedback("impact", "medium");
    // TODO: Implement camera OCR functionality
    console.log("Camera input not yet implemented");
  }, [triggerHapticFeedback]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const hasError = error || validationError;
  const showClearButton = displayValue && !disabled && !loading;
  const inputType = type === "password" && showPassword ? "text" : type;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      {label && (
        <Label
          htmlFor={`enhanced-input-${label}`}
          className="text-sm font-medium"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {/* Input Container */}
      <div className="relative">
        <div
          className={cn(
            "relative flex items-center transition-all duration-200",
            isFocused && "ring-2 ring-blue-500 ring-offset-2",
            hasError && "ring-2 ring-red-500 ring-offset-2",
            disabled && "opacity-60",
          )}
        >
          <Input
            ref={inputRef}
            id={`enhanced-input-${label}`}
            type={inputType}
            inputMode={inputMode}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled || loading}
            autoFocus={autoFocus}
            min={min}
            max={max}
            step={step}
            required={required}
            className={cn(
              "pr-12 text-base md:text-sm min-h-[48px] touch-manipulation",
              type === "number" && "pr-20",
              hasError && "border-red-500 focus-visible:ring-red-500",
              "focus-visible:ring-2 focus-visible:ring-offset-2",
            )}
          />

          {/* Input Actions */}
          <div className="absolute right-2 flex items-center gap-1">
            {/* Number Input Controls */}
            {type === "number" && !disabled && (
              <div className="flex flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={incrementValue}
                  disabled={loading}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  onClick={decrementValue}
                  disabled={loading}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Voice Input */}
            {enableVoiceInput && recognition && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  isListening && "text-red-500 animate-pulse",
                )}
                onClick={isListening ? stopListening : startListening}
                disabled={disabled || loading}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Camera Input */}
            {enableCameraInput && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleCameraInput}
                disabled={disabled || loading}
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}

            {/* Password Toggle */}
            {type === "password" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={togglePasswordVisibility}
                disabled={disabled || loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            )}

            {/* Clear Button */}
            {showClearButton && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                onClick={clearInput}
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="h-8 w-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
              </div>
            )}

            {/* Validation Status */}
            {!loading && displayValue && validate && (
              <div className="h-8 w-8 flex items-center justify-center">
                {validationError ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Voice Input Indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-sm text-red-700"
            >
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              Listening... Speak now
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help Text and Error */}
      <div className="min-h-[20px]">
        {hasError && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-600 flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {hasError}
          </motion.p>
        )}

        {!hasError && helpText && (
          <p className="text-sm text-gray-500">{helpText}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Mobile-optimized number stepper component
 */
interface MobileStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  enableHaptics?: boolean;
  className?: string;
}

export function MobileStepper({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled = false,
  enableHaptics = true,
  className,
}: MobileStepperProps) {
  const { triggerHapticFeedback } = useAdvancedTouchGestures(
    {},
    {
      enableHapticFeedback: enableHaptics,
    },
  );

  const increment = useCallback(() => {
    if (disabled) return;
    const newValue = Math.min(max, value + step);
    if (newValue !== value) {
      onChange(newValue);
      triggerHapticFeedback("impact", "light");
    }
  }, [disabled, max, value, step, onChange, triggerHapticFeedback]);

  const decrement = useCallback(() => {
    if (disabled) return;
    const newValue = Math.max(min, value - step);
    if (newValue !== value) {
      onChange(newValue);
      triggerHapticFeedback("impact", "light");
    }
  }, [disabled, min, value, step, onChange, triggerHapticFeedback]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}

      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-1">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="h-12 w-12 rounded-lg"
          onClick={decrement}
          disabled={disabled || value <= min}
        >
          <Minus className="h-5 w-5" />
        </Button>

        <div className="flex-1 text-center">
          <span className="text-lg font-semibold">{value}</span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="h-12 w-12 rounded-lg"
          onClick={increment}
          disabled={disabled || value >= max}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export default EnhancedMobileInput;

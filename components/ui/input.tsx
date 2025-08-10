import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full rounded-md border bg-transparent text-text-primary transition-all duration-normal ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-border-primary hover:border-border-secondary focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/20",
        filled:
          "border-transparent bg-bg-elevated hover:bg-bg-subtle focus-visible:bg-bg-base focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/20",
        outlined:
          "border-2 border-border-primary hover:border-border-secondary focus-visible:border-border-focus",
        ghost:
          "border-transparent hover:bg-bg-subtle focus-visible:bg-bg-elevated focus-visible:border-border-focus",
        search:
          "border-border-primary hover:border-border-secondary focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/20 rounded-full",
      },
      size: {
        xs: "h-8 px-2 text-xs",
        sm: "h-9 px-3 text-sm",
        default: "h-10 px-3 text-sm md:text-base",
        lg: "h-12 px-4 text-base",
        xl: "h-14 px-5 text-lg",
      },
      state: {
        default: "",
        error:
          "border-error-500 focus-visible:border-error-600 focus-visible:ring-error-500/20",
        success:
          "border-success-500 focus-visible:border-success-600 focus-visible:ring-success-500/20",
        warning:
          "border-warning-500 focus-visible:border-warning-600 focus-visible:ring-warning-500/20",
        loading:
          "border-border-primary focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/20",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
    },
  },
);

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  warning?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
  clearable?: boolean;
  onClear?: () => void;
  /** Enhanced accessibility: Custom ARIA label for screen readers */
  ariaLabel?: string;
  /** Enhanced accessibility: ARIA description for additional context */
  ariaDescribedBy?: string;
  /** Enhanced accessibility: Announce validation changes */
  announceValidation?: boolean;
  /** Performance: Debounce onChange events (ms) */
  debounceMs?: number;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      variant,
      size,
      state,
      label,
      description,
      error,
      success,
      warning,
      leftIcon,
      rightIcon,
      prefix,
      suffix,
      loading,
      clearable,
      onClear,
      placeholder,
      value,
      ariaLabel,
      ariaDescribedBy,
      announceValidation = false,
      debounceMs = 0,
      onChange,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(Boolean(value));
    const inputRef = React.useRef<HTMLInputElement>(null);
    const debounceTimer = React.useRef<NodeJS.Timeout>();
    const generatedId = React.useId();

    React.useImperativeHandle(ref, () => inputRef.current!);

    // Enhanced debounced change handler for performance
    const debouncedOnChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (debounceMs > 0) {
          clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => {
            onChange?.(e);
          }, debounceMs);
        } else {
          onChange?.(e);
        }
      },
      [onChange, debounceMs],
    );

    // Cleanup debounce timer on unmount
    React.useEffect(() => {
      return () => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
      };
    }, []);

    React.useEffect(() => {
      setHasValue(Boolean(value));
    }, [value]);

    // Determine state based on props
    const computedState = error
      ? "error"
      : success
        ? "success"
        : warning
          ? "warning"
          : loading
            ? "loading"
            : state;

    // Floating label logic
    const isFloating =
      isFocused || hasValue || type === "date" || type === "time";

    const inputElement = (
      <input
        ref={inputRef}
        type={type}
        className={cn(
          inputVariants({ variant, size, state: computedState }),
          leftIcon && "pl-10",
          prefix && "pl-12",
          (rightIcon || loading || (clearable && hasValue) || suffix) &&
            "pr-10",
          suffix && "pr-12",
          (rightIcon || loading || (clearable && hasValue)) &&
            suffix &&
            "pr-20",
          label && "placeholder-transparent",
          className,
        )}
        placeholder={label ? " " : placeholder}
        value={value}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          setHasValue(Boolean(e.target.value));
          props.onBlur?.(e);
        }}
        onChange={(e) => {
          setHasValue(Boolean(e.target.value));
          debouncedOnChange(e);
        }}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={computedState === "error" ? "true" : "false"}
        {...props}
      />
    );

    if (
      !label &&
      !leftIcon &&
      !rightIcon &&
      !prefix &&
      !suffix &&
      !loading &&
      !clearable &&
      !description &&
      !error &&
      !success &&
      !warning
    ) {
      // Simple input without wrapper
      return inputElement;
    }

    return (
      <div className="space-y-1">
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Prefix */}
          {prefix && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm pointer-events-none select-none">
              {prefix}
            </div>
          )}

          {/* Input */}
          {inputElement}

          {/* Floating Label */}
          {label && (
            <label
              className={cn(
                "absolute left-3 transition-all duration-normal ease-out pointer-events-none select-none",
                leftIcon && "left-10",
                isFloating
                  ? "top-0 -translate-y-1/2 text-xs font-medium bg-bg-base px-2"
                  : "top-1/2 -translate-y-1/2 text-text-secondary",
                computedState === "error" && isFloating && "text-error-600",
                computedState === "success" && isFloating && "text-success-600",
                computedState === "warning" && isFloating && "text-warning-600",
                (isFocused || computedState === "default") &&
                  isFloating &&
                  "text-primary-600",
              )}
            >
              {label}
            </label>
          )}

          {/* Right Side Elements */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Loading Spinner */}
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-border-primary border-t-primary-600" />
            )}

            {/* Clear Button */}
            {clearable && hasValue && !loading && (
              <button
                type="button"
                onClick={onClear}
                className="h-4 w-4 text-text-secondary hover:text-text-primary transition-colors"
              >
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {/* Right Icon */}
            {rightIcon && !loading && (
              <div className="text-text-secondary">{rightIcon}</div>
            )}

            {/* Suffix */}
            {suffix && (
              <div className="text-text-secondary text-sm pointer-events-none select-none">
                {suffix}
              </div>
            )}
          </div>
        </div>

        {/* Description/Helper Text */}
        {description && !error && !success && !warning && (
          <p className="text-xs text-text-secondary">{description}</p>
        )}

        {/* Error Message */}
        {error && (
          <p className="text-xs text-error-600 flex items-center gap-1">
            <svg
              className="w-3 h-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}

        {/* Success Message */}
        {success && (
          <p className="text-xs text-success-600 flex items-center gap-1">
            <svg
              className="w-3 h-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {success}
          </p>
        )}

        {/* Warning Message */}
        {warning && (
          <p className="text-xs text-warning-600 flex items-center gap-1">
            <svg
              className="w-3 h-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {warning}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };

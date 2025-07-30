import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        primary: {
          "50": "var(--color-primary-50)",
          "100": "var(--color-primary-100)",
          "200": "var(--color-primary-200)",
          "300": "var(--color-primary-300)",
          "400": "var(--color-primary-400)",
          "500": "var(--color-primary-500)",
          "600": "var(--color-primary-600)",
          "700": "var(--color-primary-700)",
          "800": "var(--color-primary-800)",
          "900": "var(--color-primary-900)",
          "950": "var(--color-primary-950)",
          action: "var(--color-primary-action)",
          hover: "var(--color-primary-hover)",
          active: "var(--color-primary-active)",
          disabled: "var(--color-primary-disabled)",
          DEFAULT: "var(--color-primary-action)",
          foreground: "var(--color-text-inverted)",
        },
        gray: {
          "50": "var(--color-gray-50)",
          "100": "var(--color-gray-100)",
          "200": "var(--color-gray-200)",
          "300": "var(--color-gray-300)",
          "400": "var(--color-gray-400)",
          "500": "var(--color-gray-500)",
          "600": "var(--color-gray-600)",
          "700": "var(--color-gray-700)",
          "800": "var(--color-gray-800)",
          "900": "var(--color-gray-900)",
          "950": "var(--color-gray-950)",
        },
        success: {
          "50": "var(--color-success-50)",
          "100": "var(--color-success-100)",
          "200": "var(--color-success-200)",
          "300": "var(--color-success-300)",
          "400": "var(--color-success-400)",
          "500": "var(--color-success-500)",
          "600": "var(--color-success-600)",
          "700": "var(--color-success-700)",
          "800": "var(--color-success-800)",
          "900": "var(--color-success-900)",
          DEFAULT: "var(--color-success-600)",
        },
        error: {
          "50": "var(--color-error-50)",
          "100": "var(--color-error-100)",
          "200": "var(--color-error-200)",
          "300": "var(--color-error-300)",
          "400": "var(--color-error-400)",
          "500": "var(--color-error-500)",
          "600": "var(--color-error-600)",
          "700": "var(--color-error-700)",
          "800": "var(--color-error-800)",
          "900": "var(--color-error-900)",
          DEFAULT: "var(--color-error-600)",
        },
        warning: {
          "50": "var(--color-warning-50)",
          "100": "var(--color-warning-100)",
          "200": "var(--color-warning-200)",
          "300": "var(--color-warning-300)",
          "400": "var(--color-warning-400)",
          "500": "var(--color-warning-500)",
          "600": "var(--color-warning-600)",
          "700": "var(--color-warning-700)",
          "800": "var(--color-warning-800)",
          "900": "var(--color-warning-900)",
          DEFAULT: "var(--color-warning-600)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          tertiary: "var(--color-text-tertiary)",
          inverted: "var(--color-text-inverted)",
          muted: "var(--color-text-muted)",
        },
        bg: {
          base: "var(--color-bg-base)",
          elevated: "var(--color-bg-elevated)",
          subtle: "var(--color-bg-subtle)",
          muted: "var(--color-bg-muted)",
        },
        border: {
          primary: "var(--color-border-primary)",
          secondary: "var(--color-border-secondary)",
          focus: "var(--color-border-focus)",
          error: "var(--color-border-error)",
          DEFAULT: "var(--color-border-primary)",
        },
        feedback: {
          success: "var(--color-feedback-success)",
          error: "var(--color-feedback-error)",
          warning: "var(--color-feedback-warning)",
          info: "var(--color-feedback-info)",
        },
        secondary: {
          action: "var(--color-secondary-action)",
          hover: "var(--color-secondary-hover)",
          active: "var(--color-secondary-active)",
          DEFAULT: "var(--color-secondary-action)",
          foreground: "var(--color-text-primary)",
        },
        background: "var(--color-bg-base)",
        foreground: "var(--color-text-primary)",
        card: {
          DEFAULT: "var(--color-bg-elevated)",
          foreground: "var(--color-text-primary)",
        },
        popover: {
          DEFAULT: "var(--color-bg-elevated)",
          foreground: "var(--color-text-primary)",
        },
        muted: {
          DEFAULT: "var(--color-bg-subtle)",
          foreground: "var(--color-text-secondary)",
        },
        accent: {
          DEFAULT: "var(--color-primary-action)",
          foreground: "var(--color-text-inverted)",
          // Industrial Palette additions
          sand: "var(--color-accent-sand)",
          "sand-light": "var(--color-accent-sand-light)",
          "sand-dark": "var(--color-accent-sand-dark)",
          taupe: "var(--color-accent-taupe)",
          "taupe-light": "var(--color-accent-taupe-light)",
          "taupe-dark": "var(--color-accent-taupe-dark)",
          charcoal: "var(--color-accent-charcoal)",
          "charcoal-light": "var(--color-accent-charcoal-light)",
          "charcoal-dark": "var(--color-accent-charcoal-dark)",
        },
        destructive: {
          DEFAULT: "var(--color-feedback-error)",
          foreground: "var(--color-text-inverted)",
        },
        input: "var(--color-bg-elevated)",
        ring: "var(--color-border-focus)",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-secondary": "var(--gradient-secondary)",
        "gradient-warm": "var(--gradient-warm)",
        "gradient-cool": "var(--gradient-cool)",
        "gradient-subtle": "var(--gradient-subtle)",
        "gradient-glass": "var(--gradient-glass)",
        "gradient-mesh": "var(--gradient-mesh)",
      },
      fontSize: {
        xs: [
          "var(--font-size-xs)",
          {
            lineHeight: "var(--line-height-normal)",
          },
        ],
        sm: [
          "var(--font-size-sm)",
          {
            lineHeight: "var(--line-height-normal)",
          },
        ],
        base: [
          "var(--font-size-base)",
          {
            lineHeight: "var(--line-height-normal)",
          },
        ],
        lg: [
          "var(--font-size-lg)",
          {
            lineHeight: "var(--line-height-normal)",
          },
        ],
        xl: [
          "var(--font-size-xl)",
          {
            lineHeight: "var(--line-height-tight)",
          },
        ],
        "2xl": [
          "var(--font-size-2xl)",
          {
            lineHeight: "var(--line-height-tight)",
          },
        ],
        "3xl": [
          "var(--font-size-3xl)",
          {
            lineHeight: "var(--line-height-tight)",
          },
        ],
        "4xl": [
          "var(--font-size-4xl)",
          {
            lineHeight: "var(--line-height-tight)",
          },
        ],
      },
      fontWeight: {
        normal: "var(--font-weight-normal)",
        medium: "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
        bold: "var(--font-weight-bold)",
      },
      lineHeight: {
        tight: "var(--line-height-tight)",
        normal: "var(--line-height-normal)",
        relaxed: "var(--line-height-relaxed)",
      },
      spacing: {
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
        xl: "var(--spacing-xl)",
        "2xl": "var(--spacing-2xl)",
        "3xl": "var(--spacing-3xl)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        focus: "var(--shadow-focus)",
        "focus-ring": "var(--shadow-focus-ring)",
        "focus-accent": "var(--shadow-focus-accent)",
        primary: "var(--shadow-primary)",
        accent: "var(--shadow-accent)",
        success: "var(--shadow-success)",
        glow: "var(--shadow-glow)",
        none: "none",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
        DEFAULT: "var(--radius)",
      },
      transitionDuration: {
        instant: "var(--duration-instant)",
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
        slower: "var(--duration-slower)",
        DEFAULT: "var(--duration-normal)",
      },
      transitionTimingFunction: {
        "ease-out": "var(--ease-out)",
        "ease-in-out": "var(--ease-in-out)",
        "ease-bounce": "var(--ease-bounce)",
        "ease-smooth": "var(--ease-smooth)",
        DEFAULT: "var(--ease-out)",
      },
      backdropBlur: {
        xs: "var(--blur-sm)",
        sm: "var(--blur-md)",
        DEFAULT: "var(--blur-md)",
        md: "var(--blur-md)",
        lg: "var(--blur-lg)",
        xl: "var(--blur-xl)",
      },
      animation: {
        "fade-in": "fadeIn var(--duration-normal) var(--ease-out)",
        "slide-in": "slideIn var(--duration-normal) var(--ease-out)",
        "scale-in": "scaleIn var(--duration-normal) var(--ease-out)",
        shimmer: "shimmer 2s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        float: "float 6s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "gradient-shift": "gradient-shift 15s ease infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
        slideIn: {
          "0%": {
            transform: "translateY(10px)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        scaleIn: {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        shimmer: {
          "0%": {
            backgroundPosition: "-200% 0",
          },
          "100%": {
            backgroundPosition: "200% 0",
          },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow:
              "0 0 20px rgba(205, 188, 168, 0.4), 0 4px 14px 0 rgba(205, 188, 168, 0.2)",
          },
          "50%": {
            boxShadow:
              "0 0 30px rgba(205, 188, 168, 0.6), 0 4px 14px 0 rgba(205, 188, 168, 0.4)",
          },
        },
        "bounce-subtle": {
          "0%, 100%": {
            transform: "translateY(0px)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)",
          },
          "50%": {
            transform: "translateY(-5px)",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
          },
        },
      },
    },
  },
  plugins: [],
};
export default config;

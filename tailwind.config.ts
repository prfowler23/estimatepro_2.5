import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Custom color system
        primary: {
          action: 'var(--color-primary-action)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          disabled: 'var(--color-primary-disabled)',
          DEFAULT: 'var(--color-primary-action)',
          foreground: 'var(--color-text-inverted)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          inverted: 'var(--color-text-inverted)',
        },
        bg: {
          base: 'var(--color-bg-base)',
          elevated: 'var(--color-bg-elevated)',
        },
        border: {
          primary: 'var(--color-border-primary)',
          focus: 'var(--color-border-focus)',
          DEFAULT: 'var(--color-border-primary)',
        },
        feedback: {
          success: 'var(--color-feedback-success)',
          error: 'var(--color-feedback-error)',
          warning: 'var(--color-feedback-warning)',
          info: 'var(--color-feedback-info)',
        },
        secondary: {
          action: 'var(--color-secondary-action)',
          hover: 'var(--color-secondary-hover)',
          active: 'var(--color-secondary-active)',
          DEFAULT: 'var(--color-secondary-action)',
          foreground: 'var(--color-text-inverted)',
        },
        // Default Tailwind classes for compatibility
        background: 'var(--color-bg-base)',
        foreground: 'var(--color-text-primary)',
        muted: {
          DEFAULT: 'var(--color-bg-elevated)',
          foreground: 'var(--color-text-secondary)',
        },
        accent: {
          DEFAULT: 'var(--color-primary-action)',
          foreground: 'var(--color-text-inverted)',
        },
        destructive: {
          DEFAULT: 'var(--color-feedback-error)',
          foreground: 'var(--color-text-inverted)',
        },
        input: 'var(--color-bg-elevated)',
        ring: 'var(--color-border-focus)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    }
  },
  plugins: [],
}
export default config
/**
 * Sentry type definitions for error tracking and monitoring
 * @see https://docs.sentry.io/platforms/javascript/
 */
interface Window {
  Sentry?: {
    /**
     * Capture an exception and send it to Sentry
     * @param error The error to capture
     * @param captureContext Additional context for the error
     */
    captureException: (
      error: Error,
      captureContext?: {
        contexts?: {
          react?: {
            componentStack?: string;
          };
          chart?: {
            title?: string;
          };
          [key: string]: unknown;
        };
        tags?: Record<string, string>;
        extra?: Record<string, unknown>;
      },
    ) => void;

    /**
     * Capture a message and send it to Sentry
     * @param message The message to capture
     * @param level The severity level (e.g., 'info', 'warning', 'error')
     */
    captureMessage: (message: string, level?: string) => void;

    /**
     * Set the current user context
     * @param user User information
     */
    setUser: (user: { email?: string; id?: string }) => void;

    /**
     * Configure the Sentry scope
     * @param callback Function to configure the scope
     */
    configureScope: (callback: (scope: unknown) => void) => void;
  };
}

"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console
    console.error("Global error caught:", error);

    // Check if this is a webpack module loading error
    if (
      error.message?.includes("Cannot read properties of undefined") ||
      error.message?.includes("call") ||
      error.stack?.includes("webpack") ||
      error.stack?.includes("requireModule")
    ) {
      console.log(
        "Detected webpack module loading error, attempting recovery...",
      );

      // Try to recover after a short delay
      setTimeout(() => {
        reset();
      }, 1000);
    }
  }, [error, reset]);

  return (
    <html>
      <head>
        <title>Application Error - EstimatePro</title>
      </head>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "20px",
            fontFamily: "system-ui, sans-serif",
            backgroundColor: "#f8fafc",
            color: "#334155",
          }}
        >
          <div
            style={{
              maxWidth: "500px",
              textAlign: "center",
              backgroundColor: "white",
              padding: "32px",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                marginBottom: "16px",
              }}
            >
              Application Error
            </h1>
            <p style={{ marginBottom: "24px", color: "#64748b" }}>
              The application encountered an unexpected error. This might be a
              temporary issue.
            </p>

            {process.env.NODE_ENV === "development" && (
              <details
                style={{
                  marginBottom: "24px",
                  textAlign: "left",
                  backgroundColor: "#fee2e2",
                  padding: "12px",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    marginTop: "8px",
                    whiteSpace: "pre-wrap",
                    fontSize: "11px",
                    overflow: "auto",
                  }}
                >
                  {error.message}
                  {error.stack && "\n\nStack:\n" + error.stack}
                </pre>
              </details>
            )}

            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                onClick={reset}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                style={{
                  backgroundColor: "#6b7280",
                  color: "white",
                  padding: "8px 16px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

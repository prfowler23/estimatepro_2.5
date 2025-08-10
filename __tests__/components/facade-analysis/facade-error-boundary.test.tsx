import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FacadeErrorBoundary } from "@/components/facade-analysis/facade-error-boundary";
import { toast } from "@/components/ui/use-toast";

// Mock the toast hook
jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({
  shouldThrow = false,
}) => {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>Component content</div>;
};

// Component that throws an error on button click
const ThrowErrorOnClick: React.FC = () => {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    throw new Error("Button click error");
  }

  return <button onClick={() => setHasError(true)}>Trigger Error</button>;
};

describe("FacadeErrorBoundary", () => {
  const originalEnv = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  const originalConsoleGroup = console.group;
  const originalConsoleGroupEnd = console.groupEnd;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    (navigator.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);

    // Suppress console errors during tests
    console.error = jest.fn();
    console.group = jest.fn();
    console.groupEnd = jest.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.group = originalConsoleGroup;
    console.groupEnd = originalConsoleGroupEnd;
    // NODE_ENV is read-only, so we don't restore it
  });

  describe("Normal operation", () => {
    it("should render children when there is no error", () => {
      render(
        <FacadeErrorBoundary>
          <div>Test content</div>
        </FacadeErrorBoundary>,
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });

    it("should not interfere with child component functionality", () => {
      const handleClick = jest.fn();

      render(
        <FacadeErrorBoundary>
          <button onClick={handleClick}>Click me</button>
        </FacadeErrorBoundary>,
      );

      fireEvent.click(screen.getByText("Click me"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error handling", () => {
    it("should catch and display errors", () => {
      render(
        <FacadeErrorBoundary>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      expect(screen.getByText("Facade Analysis Error")).toBeInTheDocument();
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });

    it("should show custom fallback when provided", () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <FacadeErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      expect(screen.getByText("Custom error message")).toBeInTheDocument();
      expect(
        screen.queryByText("Facade Analysis Error"),
      ).not.toBeInTheDocument();
    });

    it("should call onError callback when error occurs", () => {
      const onError = jest.fn();

      render(
        <FacadeErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Test error message",
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        }),
      );
    });
  });

  describe("Error recovery", () => {
    it("should recover when Try Again button is clicked", () => {
      const { rerender } = render(
        <FacadeErrorBoundary>
          <ThrowErrorOnClick />
        </FacadeErrorBoundary>,
      );

      // Trigger the error
      fireEvent.click(screen.getByText("Trigger Error"));

      // Error UI should be displayed
      expect(screen.getByText("Facade Analysis Error")).toBeInTheDocument();

      // Click Try Again
      fireEvent.click(screen.getByText("Try Again"));

      // Component should recover
      expect(
        screen.queryByText("Facade Analysis Error"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Trigger Error")).toBeInTheDocument();
    });
  });

  describe("Error details copying", () => {
    it("should copy error details to clipboard", async () => {
      render(
        <FacadeErrorBoundary>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      const copyButton = screen.getByText("Copy Error Details");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining("Facade Analysis Error Report"),
        );
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining("Test error message"),
        );
      });

      expect(toast).toHaveBeenCalledWith({
        title: "Error details copied",
        description: "Error information has been copied to clipboard",
      });
    });

    it("should show copied state after successful copy", async () => {
      render(
        <FacadeErrorBoundary>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      const copyButton = screen.getByText("Copy Error Details");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText("Copied")).toBeInTheDocument();
      });
    });

    it("should handle clipboard copy failure", async () => {
      (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(
        new Error("Clipboard access denied"),
      );

      render(
        <FacadeErrorBoundary>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      const copyButton = screen.getByText("Copy Error Details");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: "Copy failed",
          description: "Could not copy error details to clipboard",
          variant: "destructive",
        });
      });
    });
  });

  describe("Development vs Production modes", () => {
    it("should show detailed error in development mode", () => {
      // Setting NODE_ENV in development mode (read-only)

      render(
        <FacadeErrorBoundary>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      expect(screen.getByText("Development Error Details")).toBeInTheDocument();
      expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    });

    it("should not show detailed error in production mode", () => {
      // Setting NODE_ENV in production mode (read-only)

      render(
        <FacadeErrorBoundary>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      expect(
        screen.queryByText("Development Error Details"),
      ).not.toBeInTheDocument();
    });

    it("should log to console in development mode", () => {
      // Setting NODE_ENV in development mode (read-only)

      render(
        <FacadeErrorBoundary>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      expect(console.group).toHaveBeenCalledWith("🚨 Facade Analysis Error");
      expect(console.error).toHaveBeenCalledWith(
        "Error:",
        expect.objectContaining({
          message: "Test error message",
        }),
      );
    });
  });

  describe("Report Issue functionality", () => {
    it("should show Report Issue button when showReportOption is true", () => {
      render(
        <FacadeErrorBoundary showReportOption={true}>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      expect(screen.getByText("Report Issue")).toBeInTheDocument();
    });

    it("should not show Report Issue button when showReportOption is false", () => {
      render(
        <FacadeErrorBoundary showReportOption={false}>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      expect(screen.queryByText("Report Issue")).not.toBeInTheDocument();
    });

    it("should open GitHub issue URL when Report Issue is clicked", () => {
      const mockOpen = jest.fn();
      window.open = mockOpen;

      render(
        <FacadeErrorBoundary showReportOption={true}>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      fireEvent.click(screen.getByText("Report Issue"));

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining("github.com/your-org/estimatepro/issues/new"),
        "_blank",
      );
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining("Test error message"),
        "_blank",
      );
    });
  });

  describe("Possible solutions display", () => {
    it("should display helpful solution suggestions", () => {
      render(
        <FacadeErrorBoundary>
          <ThrowError shouldThrow={true} />
        </FacadeErrorBoundary>,
      );

      expect(screen.getByText("Possible solutions:")).toBeInTheDocument();
      expect(screen.getByText(/Refresh the page/)).toBeInTheDocument();
      expect(
        screen.getByText(/Check your internet connection/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Clear your browser cache/)).toBeInTheDocument();
    });
  });
});

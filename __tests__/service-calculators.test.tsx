import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ServiceCalculator from "@/components/calculator/service-calculator";

// Mock calculator context
const mockCalculatorStore = {
  selectedService: "window-cleaning",
  setSelectedService: jest.fn(),
  calculations: {},
  updateCalculation: jest.fn(),
  resetCalculations: jest.fn(),
  saveCalculation: jest.fn(),
};

jest.mock("@/contexts/calculator-context", () => ({
  useCalculator: () => mockCalculatorStore,
}));

// Mock lazy form loading
jest.mock("@/components/calculator/lazy-forms", () => ({
  WindowCleaningForm: () => (
    <div data-testid="window-cleaning-form">Window Cleaning Calculator</div>
  ),
  PressureWashingForm: () => (
    <div data-testid="pressure-washing-form">Pressure Washing Calculator</div>
  ),
  SoftWashingForm: () => (
    <div data-testid="soft-washing-form">Soft Washing Calculator</div>
  ),
  BiofilmRemovalForm: () => (
    <div data-testid="biofilm-removal-form">Biofilm Removal Calculator</div>
  ),
  GlassRestorationForm: () => (
    <div data-testid="glass-restoration-form">Glass Restoration Calculator</div>
  ),
  FrameRestorationForm: () => (
    <div data-testid="frame-restoration-form">Frame Restoration Calculator</div>
  ),
  HighDustingForm: () => (
    <div data-testid="high-dusting-form">High Dusting Calculator</div>
  ),
  FinalCleanForm: () => (
    <div data-testid="final-clean-form">Final Clean Calculator</div>
  ),
  GraniteReconditioningForm: () => (
    <div data-testid="granite-reconditioning-form">
      Granite Reconditioning Calculator
    </div>
  ),
  PressureWashSealForm: () => (
    <div data-testid="pressure-wash-seal-form">
      Pressure Wash & Seal Calculator
    </div>
  ),
  ParkingDeckForm: () => (
    <div data-testid="parking-deck-form">Parking Deck Calculator</div>
  ),
}));

describe("Service Calculator Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Service Selection Grid", () => {
    test("renders all 11 service cards", () => {
      render(<ServiceCalculator />);

      // Check for all service types
      expect(screen.getByText("Window Cleaning")).toBeInTheDocument();
      expect(screen.getByText("Pressure Washing")).toBeInTheDocument();
      expect(screen.getByText("Soft Washing")).toBeInTheDocument();
      expect(screen.getByText("Biofilm Removal")).toBeInTheDocument();
      expect(screen.getByText("Glass Restoration")).toBeInTheDocument();
      expect(screen.getByText("Frame Restoration")).toBeInTheDocument();
      expect(screen.getByText("High Dusting")).toBeInTheDocument();
      expect(screen.getByText("Final Clean")).toBeInTheDocument();
      expect(screen.getByText("Granite Reconditioning")).toBeInTheDocument();
      expect(screen.getByText("Pressure Wash & Seal")).toBeInTheDocument();
      expect(screen.getByText("Parking Deck")).toBeInTheDocument();
    });

    test("service cards have proper styling and layout", () => {
      render(<ServiceCalculator />);

      const serviceCards = screen.getAllByRole("button", {
        name: /select.*calculator/i,
      });
      expect(serviceCards).toHaveLength(11);

      serviceCards.forEach((card) => {
        expect(card).toHaveClass("cursor-pointer");
        expect(card).toHaveAttribute("role", "button");
      });
    });

    test("clicking service card selects the service", async () => {
      const user = userEvent.setup();
      render(<ServiceCalculator />);

      const windowCleaningCard = screen.getByRole("button", {
        name: /window cleaning/i,
      });
      await user.click(windowCleaningCard);

      expect(mockCalculatorStore.setSelectedService).toHaveBeenCalledWith(
        "window-cleaning",
      );
    });

    test("selected service card has active styling", () => {
      mockCalculatorStore.selectedService = "pressure-washing";
      render(<ServiceCalculator />);

      const pressureWashingCard = screen.getByRole("button", {
        name: /pressure washing/i,
      });
      expect(pressureWashingCard).toHaveClass("ring-2", "ring-blue-500");
    });

    test("service cards show descriptions on hover", async () => {
      const user = userEvent.setup();
      render(<ServiceCalculator />);

      const windowCleaningCard = screen.getByRole("button", {
        name: /window cleaning/i,
      });
      await user.hover(windowCleaningCard);

      await waitFor(() => {
        expect(
          screen.getByText(/interior and exterior window cleaning/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Calculator Form Loading", () => {
    test("loads window cleaning form when selected", () => {
      mockCalculatorStore.selectedService = "window-cleaning";
      render(<ServiceCalculator />);

      expect(screen.getByTestId("window-cleaning-form")).toBeInTheDocument();
      expect(
        screen.getByText("Window Cleaning Calculator"),
      ).toBeInTheDocument();
    });

    test("loads pressure washing form when selected", () => {
      mockCalculatorStore.selectedService = "pressure-washing";
      render(<ServiceCalculator />);

      expect(screen.getByTestId("pressure-washing-form")).toBeInTheDocument();
      expect(
        screen.getByText("Pressure Washing Calculator"),
      ).toBeInTheDocument();
    });

    test("lazy loads forms only when needed", () => {
      mockCalculatorStore.selectedService = "window-cleaning";
      render(<ServiceCalculator />);

      // Should only show the selected form
      expect(screen.getByTestId("window-cleaning-form")).toBeInTheDocument();
      expect(
        screen.queryByTestId("pressure-washing-form"),
      ).not.toBeInTheDocument();
    });

    test("shows loading state while form is loading", async () => {
      mockCalculatorStore.selectedService = "window-cleaning";

      // Mock lazy loading delay
      jest.mock("@/components/calculator/lazy-forms", () => ({
        WindowCleaningForm: () => {
          return new Promise((resolve) => {
            setTimeout(
              () =>
                resolve(
                  <div data-testid="window-cleaning-form">
                    Window Cleaning Calculator
                  </div>,
                ),
              100,
            );
          });
        },
      }));

      render(<ServiceCalculator />);

      expect(screen.getByText("Loading calculator...")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId("window-cleaning-form")).toBeInTheDocument();
      });
    });
  });

  describe("Calculator Controls", () => {
    beforeEach(() => {
      mockCalculatorStore.selectedService = "window-cleaning";
    });

    test("shows calculator header with service name", () => {
      render(<ServiceCalculator />);

      expect(
        screen.getByRole("heading", { name: /window cleaning calculator/i }),
      ).toBeInTheDocument();
    });

    test("shows back to services button", () => {
      render(<ServiceCalculator />);

      const backButton = screen.getByRole("button", {
        name: /back to services/i,
      });
      expect(backButton).toBeInTheDocument();
    });

    test("back button returns to service grid", async () => {
      const user = userEvent.setup();
      render(<ServiceCalculator />);

      const backButton = screen.getByRole("button", {
        name: /back to services/i,
      });
      await user.click(backButton);

      expect(mockCalculatorStore.setSelectedService).toHaveBeenCalledWith(null);
    });

    test("shows save calculation button", () => {
      render(<ServiceCalculator />);

      const saveButton = screen.getByRole("button", {
        name: /save calculation/i,
      });
      expect(saveButton).toBeInTheDocument();
    });

    test("shows reset form button", () => {
      render(<ServiceCalculator />);

      const resetButton = screen.getByRole("button", { name: /reset form/i });
      expect(resetButton).toBeInTheDocument();
    });

    test("reset button clears all form data", async () => {
      const user = userEvent.setup();
      render(<ServiceCalculator />);

      const resetButton = screen.getByRole("button", { name: /reset form/i });
      await user.click(resetButton);

      expect(mockCalculatorStore.resetCalculations).toHaveBeenCalled();
    });
  });

  describe("Calculation Results Display", () => {
    beforeEach(() => {
      mockCalculatorStore.selectedService = "window-cleaning";
      mockCalculatorStore.calculations = {
        "window-cleaning": {
          basePrice: 250,
          laborCost: 150,
          materialCost: 50,
          totalPrice: 400,
          estimatedTime: 4,
        },
      };
    });

    test("displays calculation results summary", () => {
      render(<ServiceCalculator />);

      expect(screen.getByText("Calculation Summary")).toBeInTheDocument();
      expect(screen.getByText("$400.00")).toBeInTheDocument(); // Total price
      expect(screen.getByText("4 hours")).toBeInTheDocument(); // Estimated time
    });

    test("shows detailed cost breakdown", () => {
      render(<ServiceCalculator />);

      expect(screen.getByText("Cost Breakdown")).toBeInTheDocument();
      expect(screen.getByText("Base Price: $250.00")).toBeInTheDocument();
      expect(screen.getByText("Labor: $150.00")).toBeInTheDocument();
      expect(screen.getByText("Materials: $50.00")).toBeInTheDocument();
    });

    test("updates results when calculations change", () => {
      const { rerender } = render(<ServiceCalculator />);

      // Update calculations
      mockCalculatorStore.calculations = {
        "window-cleaning": {
          basePrice: 300,
          laborCost: 180,
          materialCost: 60,
          totalPrice: 540,
          estimatedTime: 5,
        },
      };

      rerender(<ServiceCalculator />);

      expect(screen.getByText("$540.00")).toBeInTheDocument();
      expect(screen.getByText("5 hours")).toBeInTheDocument();
    });

    test("shows add to estimate button when results available", () => {
      render(<ServiceCalculator />);

      const addToEstimateButton = screen.getByRole("button", {
        name: /add to estimate/i,
      });
      expect(addToEstimateButton).toBeInTheDocument();
    });
  });

  describe("Form Interactions", () => {
    beforeEach(() => {
      mockCalculatorStore.selectedService = "window-cleaning";
    });

    test("form inputs trigger calculations", async () => {
      const user = userEvent.setup();

      // Mock the actual form with inputs
      jest.mock("@/components/calculator/lazy-forms", () => ({
        WindowCleaningForm: () => (
          <div data-testid="window-cleaning-form">
            <input
              type="number"
              placeholder="Number of windows"
              onChange={(e) =>
                mockCalculatorStore.updateCalculation("windows", e.target.value)
              }
            />
            <input
              type="number"
              placeholder="Height factor"
              onChange={(e) =>
                mockCalculatorStore.updateCalculation("height", e.target.value)
              }
            />
          </div>
        ),
      }));

      render(<ServiceCalculator />);

      const windowsInput = screen.getByPlaceholderText("Number of windows");
      await user.type(windowsInput, "10");

      expect(mockCalculatorStore.updateCalculation).toHaveBeenCalledWith(
        "windows",
        "10",
      );
    });

    test("form validation prevents invalid inputs", async () => {
      const user = userEvent.setup();

      // Mock form with validation
      jest.mock("@/components/calculator/lazy-forms", () => ({
        WindowCleaningForm: () => (
          <div data-testid="window-cleaning-form">
            <input
              type="number"
              placeholder="Number of windows"
              min="1"
              max="1000"
            />
          </div>
        ),
      }));

      render(<ServiceCalculator />);

      const windowsInput = screen.getByPlaceholderText("Number of windows");
      await user.type(windowsInput, "-5");

      expect(windowsInput).toBeInvalid();
    });

    test("real-time calculations update display", async () => {
      const user = userEvent.setup();

      render(<ServiceCalculator />);

      // Simulate input change that triggers calculation
      fireEvent.change(screen.getByPlaceholderText("Number of windows"), {
        target: { value: "20" },
      });

      await waitFor(() => {
        expect(mockCalculatorStore.updateCalculation).toHaveBeenCalled();
      });
    });
  });

  describe("Service-Specific Calculators", () => {
    test("window cleaning calculator loads with correct inputs", () => {
      mockCalculatorStore.selectedService = "window-cleaning";
      render(<ServiceCalculator />);

      expect(screen.getByTestId("window-cleaning-form")).toBeInTheDocument();
    });

    test("pressure washing calculator loads with correct inputs", () => {
      mockCalculatorStore.selectedService = "pressure-washing";
      render(<ServiceCalculator />);

      expect(screen.getByTestId("pressure-washing-form")).toBeInTheDocument();
    });

    test("soft washing calculator loads with correct inputs", () => {
      mockCalculatorStore.selectedService = "soft-washing";
      render(<ServiceCalculator />);

      expect(screen.getByTestId("soft-washing-form")).toBeInTheDocument();
    });

    test("all 11 calculators can be loaded", () => {
      const services = [
        "window-cleaning",
        "pressure-washing",
        "soft-washing",
        "biofilm-removal",
        "glass-restoration",
        "frame-restoration",
        "high-dusting",
        "final-clean",
        "granite-reconditioning",
        "pressure-wash-seal",
        "parking-deck",
      ];

      services.forEach((service) => {
        mockCalculatorStore.selectedService = service;
        const { unmount } = render(<ServiceCalculator />);

        expect(screen.getByTestId(`${service}-form`)).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe("Mobile Responsiveness", () => {
    test("service grid stacks on mobile", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ServiceCalculator />);

      const serviceGrid = screen.getByRole("grid");
      expect(serviceGrid).toHaveClass("grid-cols-1"); // Single column on mobile
    });

    test("calculator controls are thumb-friendly on mobile", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      mockCalculatorStore.selectedService = "window-cleaning";
      render(<ServiceCalculator />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        expect(minHeight).toBeGreaterThanOrEqual(44); // 44px minimum touch target
      });
    });
  });

  describe("Accessibility", () => {
    test("service cards have proper ARIA labels", () => {
      render(<ServiceCalculator />);

      const windowCleaningCard = screen.getByRole("button", {
        name: /window cleaning/i,
      });
      expect(windowCleaningCard).toHaveAttribute("aria-label");
    });

    test("calculator form has proper heading structure", () => {
      mockCalculatorStore.selectedService = "window-cleaning";
      render(<ServiceCalculator />);

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    test("form controls are keyboard accessible", async () => {
      const user = userEvent.setup();
      mockCalculatorStore.selectedService = "window-cleaning";
      render(<ServiceCalculator />);

      const backButton = screen.getByRole("button", {
        name: /back to services/i,
      });
      backButton.focus();

      expect(backButton).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(mockCalculatorStore.setSelectedService).toHaveBeenCalledWith(null);
    });

    test("calculation results are announced to screen readers", () => {
      mockCalculatorStore.selectedService = "window-cleaning";
      render(<ServiceCalculator />);

      const resultsRegion = screen.getByRole("region", {
        name: /calculation results/i,
      });
      expect(resultsRegion).toBeInTheDocument();
      expect(resultsRegion).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Error Handling", () => {
    test("handles calculator loading errors gracefully", async () => {
      // Mock loading error
      jest.mock("@/components/calculator/lazy-forms", () => ({
        WindowCleaningForm: () => {
          throw new Error("Failed to load calculator");
        },
      }));

      mockCalculatorStore.selectedService = "window-cleaning";
      render(<ServiceCalculator />);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load calculator/i),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /try again/i }),
        ).toBeInTheDocument();
      });
    });

    test("shows validation errors for invalid inputs", async () => {
      const user = userEvent.setup();
      mockCalculatorStore.selectedService = "window-cleaning";

      render(<ServiceCalculator />);

      // Try to save with invalid data
      const saveButton = screen.getByRole("button", {
        name: /save calculation/i,
      });
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please complete all required fields/i),
        ).toBeInTheDocument();
      });
    });

    test("handles calculation errors gracefully", () => {
      mockCalculatorStore.selectedService = "window-cleaning";
      mockCalculatorStore.calculations = {
        "window-cleaning": {
          error: "Invalid calculation parameters",
        },
      };

      render(<ServiceCalculator />);

      expect(
        screen.getByText(/invalid calculation parameters/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /recalculate/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    test("lazy loads calculator forms efficiently", async () => {
      const loadSpy = jest.fn();

      jest.mock("@/components/calculator/lazy-forms", () => ({
        WindowCleaningForm: () => {
          loadSpy();
          return (
            <div data-testid="window-cleaning-form">
              Window Cleaning Calculator
            </div>
          );
        },
      }));

      render(<ServiceCalculator />);

      // Form should not load initially
      expect(loadSpy).not.toHaveBeenCalled();

      // Select service to trigger loading
      mockCalculatorStore.selectedService = "window-cleaning";
      render(<ServiceCalculator />);

      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    test("debounces calculation updates", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup();

      mockCalculatorStore.selectedService = "window-cleaning";
      render(<ServiceCalculator />);

      const input = screen.getByPlaceholderText("Number of windows");

      // Rapid typing should be debounced
      await user.type(input, "123");

      // Should not call update immediately
      expect(mockCalculatorStore.updateCalculation).not.toHaveBeenCalled();

      // After debounce delay
      jest.advanceTimersByTime(300);

      expect(mockCalculatorStore.updateCalculation).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });
});

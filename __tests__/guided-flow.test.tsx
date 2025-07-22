import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuidedEstimationFlow as GuidedFlow } from "@/components/estimation/guided-flow";

// Mock router
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/estimates/new/guided",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock estimate store
const mockEstimateStore = {
  currentFlow: {
    id: "test-flow-123",
    currentStep: 1,
    isComplete: false,
    data: {},
  },
  updateFlow: jest.fn(),
  nextStep: jest.fn(),
  previousStep: jest.fn(),
  saveFlow: jest.fn(),
  resetFlow: jest.fn(),
};

jest.mock("@/lib/stores/estimate-store", () => ({
  useEstimateStore: () => mockEstimateStore,
}));

// Mock AI services
jest.mock("@/hooks/use-ai", () => ({
  useAI: () => ({
    analyzePhotos: jest.fn(),
    extractDocuments: jest.fn(),
    isLoading: false,
    error: null,
  }),
}));

describe("Guided Estimation Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEstimateStore.currentFlow.currentStep = 1;
  });

  describe("Flow Navigation", () => {
    test("renders step navigation correctly", () => {
      render(<GuidedFlow />);

      expect(screen.getByText("Step 1 of 9")).toBeInTheDocument();
      expect(screen.getByText("Initial Contact")).toBeInTheDocument();
    });

    test("shows all steps in progress indicator", () => {
      render(<GuidedFlow />);

      // Should show all 9 steps
      const stepIndicators = screen.getAllByRole("button", {
        name: /step \d/i,
      });
      expect(stepIndicators).toHaveLength(9);
    });

    test("current step is highlighted in progress indicator", () => {
      render(<GuidedFlow />);

      const currentStepIndicator = screen.getByRole("button", {
        name: /step 1/i,
      });
      expect(currentStepIndicator).toHaveClass("bg-blue-600"); // Active step styling
    });

    test("completed steps are marked visually", () => {
      mockEstimateStore.currentFlow.currentStep = 3;
      render(<GuidedFlow />);

      const completedStep = screen.getByRole("button", { name: /step 1/i });
      expect(completedStep).toHaveClass("bg-green-600"); // Completed step styling
    });

    test("next button advances to next step", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      expect(mockEstimateStore.nextStep).toHaveBeenCalled();
    });

    test("back button goes to previous step", async () => {
      mockEstimateStore.currentFlow.currentStep = 2;
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const backButton = screen.getByRole("button", { name: /back/i });
      await user.click(backButton);

      expect(mockEstimateStore.previousStep).toHaveBeenCalled();
    });

    test("back button is disabled on first step", () => {
      mockEstimateStore.currentFlow.currentStep = 1;
      render(<GuidedFlow />);

      const backButton = screen.getByRole("button", { name: /back/i });
      expect(backButton).toBeDisabled();
    });

    test("clicking step indicator navigates to that step", async () => {
      mockEstimateStore.currentFlow.currentStep = 1;
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const stepIndicator = screen.getByRole("button", { name: /step 3/i });
      await user.click(stepIndicator);

      expect(mockEstimateStore.updateFlow).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: 3 }),
      );
    });
  });

  describe("Step 1: Initial Contact", () => {
    beforeEach(() => {
      mockEstimateStore.currentFlow.currentStep = 1;
    });

    test("renders initial contact form", () => {
      render(<GuidedFlow />);

      expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    });

    test("validates required fields", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(
          screen.getByText(/customer name is required/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    test("saves form data when proceeding", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      await user.type(screen.getByLabelText(/customer name/i), "John Doe");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/phone/i), "(555) 123-4567");

      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      expect(mockEstimateStore.updateFlow).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerName: "John Doe",
            email: "john@example.com",
            phone: "(555) 123-4567",
          }),
        }),
      );
    });
  });

  describe("Step 2: Scope Details", () => {
    beforeEach(() => {
      mockEstimateStore.currentFlow.currentStep = 2;
    });

    test("renders scope details form", () => {
      render(<GuidedFlow />);

      expect(screen.getByText("Scope Details")).toBeInTheDocument();
      expect(screen.getByLabelText(/project description/i)).toBeInTheDocument();
      expect(screen.getByText(/select services/i)).toBeInTheDocument();
    });

    test("service selection works correctly", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const windowCleaningService = screen.getByLabelText(/window cleaning/i);
      await user.click(windowCleaningService);

      expect(windowCleaningService).toBeChecked();
    });

    test("shows service calculator when service is selected", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const pressureWashingService = screen.getByLabelText(/pressure washing/i);
      await user.click(pressureWashingService);

      await waitFor(() => {
        expect(
          screen.getByText(/pressure washing calculator/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Step 3: Files & Photos", () => {
    beforeEach(() => {
      mockEstimateStore.currentFlow.currentStep = 3;
    });

    test("renders photo upload interface", () => {
      render(<GuidedFlow />);

      expect(screen.getByText("Files & Photos")).toBeInTheDocument();
      expect(screen.getByText(/drag and drop photos/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /upload photos/i }),
      ).toBeInTheDocument();
    });

    test("file upload works correctly", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const file = new File(["photo"], "test.jpg", { type: "image/jpeg" });
      const uploadInput = screen.getByLabelText(/upload photos/i);

      await user.upload(uploadInput, file);

      await waitFor(() => {
        expect(screen.getByText("test.jpg")).toBeInTheDocument();
      });
    });

    test("AI analysis is triggered after photo upload", async () => {
      const mockAnalyzePhotos = jest.fn();
      jest.mock("@/hooks/use-ai", () => ({
        useAI: () => ({
          analyzePhotos: mockAnalyzePhotos,
          isLoading: false,
          error: null,
        }),
      }));

      const user = userEvent.setup();
      render(<GuidedFlow />);

      const file = new File(["photo"], "building.jpg", { type: "image/jpeg" });
      const uploadInput = screen.getByLabelText(/upload photos/i);

      await user.upload(uploadInput, file);

      expect(mockAnalyzePhotos).toHaveBeenCalledWith([file]);
    });

    test("shows AI analysis results", async () => {
      // Mock AI analysis results
      const mockResults = {
        buildingType: "Commercial Office",
        materials: ["Glass", "Concrete"],
        estimatedArea: "10,000 sq ft",
      };

      jest.mock("@/hooks/use-ai", () => ({
        useAI: () => ({
          analyzePhotos: jest.fn().mockResolvedValue(mockResults),
          isLoading: false,
          error: null,
          results: mockResults,
        }),
      }));

      render(<GuidedFlow />);

      expect(screen.getByText("Commercial Office")).toBeInTheDocument();
      expect(screen.getByText("10,000 sq ft")).toBeInTheDocument();
    });
  });

  describe("Step 4: Area of Work", () => {
    beforeEach(() => {
      mockEstimateStore.currentFlow.currentStep = 4;
    });

    test("renders 3D visualization when enabled", () => {
      process.env.NEXT_PUBLIC_ENABLE_3D = "true";
      render(<GuidedFlow />);

      expect(screen.getByText("Area of Work")).toBeInTheDocument();
      expect(screen.getByText(/3D visualization/i)).toBeInTheDocument();
    });

    test("renders fallback canvas when 3D disabled", () => {
      process.env.NEXT_PUBLIC_ENABLE_3D = "false";
      render(<GuidedFlow />);

      expect(screen.getByText("Area of Work")).toBeInTheDocument();
      expect(screen.getByText(/drawing canvas/i)).toBeInTheDocument();
    });

    test("measurement tools are available", () => {
      render(<GuidedFlow />);

      expect(
        screen.getByRole("button", { name: /measure/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /area/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /scale/i }),
      ).toBeInTheDocument();
    });

    test("scale setting works correctly", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const scaleButton = screen.getByRole("button", { name: /scale/i });
      await user.click(scaleButton);

      const scaleInput = screen.getByLabelText(/scale factor/i);
      await user.clear(scaleInput);
      await user.type(scaleInput, "1:100");

      expect(scaleInput).toHaveValue("1:100");
    });
  });

  describe("Step 5: Takeoff", () => {
    beforeEach(() => {
      mockEstimateStore.currentFlow.currentStep = 5;
    });

    test("renders takeoff measurements table", () => {
      render(<GuidedFlow />);

      expect(screen.getByText("Takeoff")).toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText(/add measurement/i)).toBeInTheDocument();
    });

    test("adding measurements works correctly", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const addButton = screen.getByRole("button", {
        name: /add measurement/i,
      });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/measurement type/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/length/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/width/i)).toBeInTheDocument();
      });
    });

    test("measurement calculations update in real-time", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const addButton = screen.getByRole("button", {
        name: /add measurement/i,
      });
      await user.click(addButton);

      await user.type(screen.getByLabelText(/length/i), "10");
      await user.type(screen.getByLabelText(/width/i), "20");

      await waitFor(() => {
        expect(screen.getByText("200 sq ft")).toBeInTheDocument();
      });
    });
  });

  describe("Step 6: Duration", () => {
    beforeEach(() => {
      mockEstimateStore.currentFlow.currentStep = 6;
    });

    test("renders duration planning interface", () => {
      render(<GuidedFlow />);

      expect(screen.getByText("Duration")).toBeInTheDocument();
      expect(screen.getByText(/project timeline/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    });

    test("weather integration is shown when enabled", () => {
      process.env.NEXT_PUBLIC_ENABLE_WEATHER = "true";
      render(<GuidedFlow />);

      expect(screen.getByText(/weather impact/i)).toBeInTheDocument();
    });

    test("timeline visualization updates with inputs", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const durationInput = screen.getByLabelText(/estimated duration/i);
      await user.clear(durationInput);
      await user.type(durationInput, "3");

      await waitFor(() => {
        expect(screen.getByText("3 days")).toBeInTheDocument();
      });
    });
  });

  describe("Step 7: Expenses", () => {
    beforeEach(() => {
      mockEstimateStore.currentFlow.currentStep = 7;
    });

    test("renders expense breakdown interface", () => {
      render(<GuidedFlow />);

      expect(screen.getByText("Expenses")).toBeInTheDocument();
      expect(screen.getByText(/cost breakdown/i)).toBeInTheDocument();
      expect(screen.getByText(/labor costs/i)).toBeInTheDocument();
      expect(screen.getByText(/material costs/i)).toBeInTheDocument();
    });

    test("expense categories are editable", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const laborCostInput = screen.getByLabelText(/labor cost per hour/i);
      await user.clear(laborCostInput);
      await user.type(laborCostInput, "25");

      expect(laborCostInput).toHaveValue("25");
    });

    test("margin adjustments update totals", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const marginSlider = screen.getByLabelText(/profit margin/i);
      fireEvent.change(marginSlider, { target: { value: "30" } });

      await waitFor(() => {
        expect(screen.getByText(/30% margin/i)).toBeInTheDocument();
      });
    });
  });

  describe("Step 8: Pricing", () => {
    beforeEach(() => {
      mockEstimateStore.currentFlow.currentStep = 8;
    });

    test("renders pricing strategy interface", () => {
      render(<GuidedFlow />);

      expect(screen.getByText("Pricing")).toBeInTheDocument();
      expect(screen.getByText(/pricing strategy/i)).toBeInTheDocument();
      expect(screen.getByText(/competitive analysis/i)).toBeInTheDocument();
    });

    test("pricing strategies can be selected", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const competitiveStrategy = screen.getByLabelText(/competitive pricing/i);
      await user.click(competitiveStrategy);

      expect(competitiveStrategy).toBeChecked();
    });

    test("risk factors affect pricing", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const riskFactorButton = screen.getByRole("button", {
        name: /add risk factor/i,
      });
      await user.click(riskFactorButton);

      await waitFor(() => {
        expect(screen.getByText(/weather risk/i)).toBeInTheDocument();
        expect(screen.getByText(/equipment availability/i)).toBeInTheDocument();
      });
    });
  });

  describe("Step 9: Summary", () => {
    beforeEach(() => {
      mockEstimateStore.currentFlow.currentStep = 9;
    });

    test("renders complete estimate summary", () => {
      render(<GuidedFlow />);

      expect(screen.getByText("Summary")).toBeInTheDocument();
      expect(screen.getByText(/estimate overview/i)).toBeInTheDocument();
      expect(screen.getByText(/total cost/i)).toBeInTheDocument();
    });

    test("generate estimate button works", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const generateButton = screen.getByRole("button", {
        name: /generate estimate/i,
      });
      await user.click(generateButton);

      expect(mockEstimateStore.saveFlow).toHaveBeenCalled();
    });

    test("PDF export functionality is available", () => {
      render(<GuidedFlow />);

      expect(
        screen.getByRole("button", { name: /download pdf/i }),
      ).toBeInTheDocument();
    });

    test("email estimate functionality is available", () => {
      render(<GuidedFlow />);

      expect(
        screen.getByRole("button", { name: /email estimate/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Mobile Navigation", () => {
    test("mobile step navigation works", async () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      const user = userEvent.setup();
      render(<GuidedFlow />);

      const mobileNavButton = screen.getByRole("button", {
        name: /step navigation/i,
      });
      await user.click(mobileNavButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    test("mobile next/back buttons are properly sized", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<GuidedFlow />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      expect(nextButton).toHaveClass("w-full"); // Full width on mobile
    });
  });

  describe("Auto-save Functionality", () => {
    test("auto-saves form data periodically", async () => {
      jest.useFakeTimers();
      render(<GuidedFlow />);

      const customerNameInput = screen.getByLabelText(/customer name/i);
      fireEvent.change(customerNameInput, { target: { value: "John Doe" } });

      // Fast-forward 5 seconds (auto-save interval)
      jest.advanceTimersByTime(5000);

      expect(mockEstimateStore.saveFlow).toHaveBeenCalled();

      jest.useRealTimers();
    });

    test("shows save indicator when auto-saving", async () => {
      jest.useFakeTimers();
      render(<GuidedFlow />);

      const customerNameInput = screen.getByLabelText(/customer name/i);
      fireEvent.change(customerNameInput, { target: { value: "John Doe" } });

      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe("Error Handling", () => {
    test("displays validation errors clearly", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        const errorMessages = screen.getAllByRole("alert");
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });

    test("handles network errors gracefully", async () => {
      mockEstimateStore.saveFlow.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      render(<GuidedFlow />);

      mockEstimateStore.currentFlow.currentStep = 9;
      const generateButton = screen.getByRole("button", {
        name: /generate estimate/i,
      });
      await user.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /try again/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    test("has proper heading hierarchy", () => {
      render(<GuidedFlow />);

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    test("step navigation is keyboard accessible", async () => {
      const user = userEvent.setup();
      render(<GuidedFlow />);

      const nextButton = screen.getByRole("button", { name: /next/i });
      nextButton.focus();

      expect(nextButton).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(mockEstimateStore.nextStep).toHaveBeenCalled();
    });

    test("form fields have proper labels", () => {
      render(<GuidedFlow />);

      const customerNameInput = screen.getByLabelText(/customer name/i);
      const emailInput = screen.getByLabelText(/email/i);

      expect(customerNameInput).toHaveAttribute("id");
      expect(emailInput).toHaveAttribute("id");
    });

    test("progress indicator has proper ARIA attributes", () => {
      render(<GuidedFlow />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toHaveAttribute("aria-valuenow", "1");
      expect(progressBar).toHaveAttribute("aria-valuemax", "9");
    });
  });
});

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FacadeAnalysisForm } from "@/components/calculator/forms/facade-analysis-form";
import { facadeAnalysisService } from "@/lib/services/facade-analysis-service";

jest.mock("@/lib/services/facade-analysis-service");

describe("FacadeAnalysisForm", () => {
  it("should handle image upload and analysis", async () => {
    const mockAnalysis = {
      total_facade_sqft: 10000,
      total_glass_sqft: 4000,
      net_facade_sqft: 6000,
      glass_to_facade_ratio: 40,
      confidence_level: 92,
      materials: [
        { type: "brick", sqft: 5000, percentage: 50, confidence: 95 },
        { type: "glass", sqft: 4000, percentage: 40, confidence: 98 },
        { type: "metal", sqft: 1000, percentage: 10, confidence: 90 },
      ],
    };

    (facadeAnalysisService.analyzeImage as jest.Mock).mockResolvedValue(
      mockAnalysis,
    );

    render(<FacadeAnalysisForm />);

    // Test image upload
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const input = screen.getByLabelText(/click to upload/i);

    await userEvent.upload(input, file);

    // Fill in building details
    await userEvent.type(
      screen.getByPlaceholderText(/building address/i),
      "123 Main St",
    );

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /analyze building/i,
    });
    await userEvent.click(submitButton);

    // Verify results
    await waitFor(() => {
      expect(screen.getByText(/10,000 sq ft/i)).toBeInTheDocument();
      expect(screen.getByText(/40.0%/i)).toBeInTheDocument();
      expect(screen.getByText(/92%/i)).toBeInTheDocument();
    });
  });

  it("should validate glass to facade ratio", async () => {
    const mockAnalysis = {
      total_facade_sqft: 10000,
      total_glass_sqft: 9500,
      glass_to_facade_ratio: 95,
    };

    (
      facadeAnalysisService.calculateMeasurements as jest.Mock
    ).mockResolvedValue({
      measurements: mockAnalysis,
      validation: {
        passed: false,
        errors: [
          "Glass area exceeds 90% of facade - requires manual verification",
        ],
        warnings: [],
      },
    });

    render(<FacadeAnalysisForm />);

    // ... perform analysis ...

    await waitFor(() => {
      expect(screen.getByText(/glass area exceeds 90%/i)).toBeInTheDocument();
    });
  });
});

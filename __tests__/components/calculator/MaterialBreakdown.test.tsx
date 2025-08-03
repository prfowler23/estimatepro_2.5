import React from "react";
import { render, screen } from "@/__tests__/test-utils";
import { MaterialBreakdown } from "@/components/calculator/material-breakdown";
import { FacadeMaterial } from "@/lib/types/facade-analysis-types";

describe("MaterialBreakdown", () => {
  const mockMaterials: FacadeMaterial[] = [
    {
      type: "brick",
      location: "Main Facade",
      sqft: 1000,
      percentage: 50,
      confidence: 90,
    },
    {
      type: "glass",
      location: "Windows",
      sqft: 500,
      percentage: 25,
      confidence: 85,
    },
    {
      type: "metal",
      location: "Trim",
      sqft: 500,
      percentage: 25,
      confidence: 80,
    },
  ];

  it("renders the title correctly", () => {
    render(<MaterialBreakdown materials={mockMaterials} />);
    expect(screen.getByText("Material Breakdown")).toBeInTheDocument();
  });

  it("displays all materials with correct information", () => {
    render(<MaterialBreakdown materials={mockMaterials} />);

    // Check brick material
    expect(screen.getByText("brick")).toBeInTheDocument();
    expect(screen.getByText("Main Facade")).toBeInTheDocument();
    expect(screen.getByText("1,000 sq ft")).toBeInTheDocument();

    // Check all percentage values exist (there will be multiple due to same values)
    const fiftyPercentElements = screen.getAllByText("50.0%");
    expect(fiftyPercentElements.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Confidence: 90%")).toBeInTheDocument();

    // Check glass material
    expect(screen.getByText("glass")).toBeInTheDocument();
    expect(screen.getByText("Windows")).toBeInTheDocument();

    // Since there are multiple "500 sq ft" elements, check within specific contexts
    const sqftElements = screen.getAllByText("500 sq ft");
    expect(sqftElements.length).toBeGreaterThanOrEqual(2);

    // Check for 25% values (will be multiple)
    const twentyFivePercentElements = screen.getAllByText("25.0%");
    expect(twentyFivePercentElements.length).toBeGreaterThanOrEqual(2);

    expect(screen.getByText("Confidence: 85%")).toBeInTheDocument();

    // Check metal material
    expect(screen.getByText("metal")).toBeInTheDocument();
    expect(screen.getByText("Trim")).toBeInTheDocument();
    expect(screen.getByText("Confidence: 80%")).toBeInTheDocument();
  });

  it("calculates and displays total area correctly", () => {
    render(<MaterialBreakdown materials={mockMaterials} />);

    expect(screen.getByText("Total Measured Area")).toBeInTheDocument();
    expect(screen.getByText("2,000 sq ft")).toBeInTheDocument();
  });

  it("calculates percentage of total correctly", () => {
    render(<MaterialBreakdown materials={mockMaterials} />);

    // Brick: 1000/2000 = 50%
    expect(screen.getByText("50.0% of total")).toBeInTheDocument();

    // Glass and Metal: 500/2000 = 25%
    const percentageTexts = screen.getAllByText("25.0% of total");
    expect(percentageTexts).toHaveLength(2);
  });

  it("handles empty materials array", () => {
    render(<MaterialBreakdown materials={[]} />);

    expect(screen.getByText("Material Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Total Measured Area")).toBeInTheDocument();
    expect(screen.getByText("0 sq ft")).toBeInTheDocument();
  });

  it("renders location badges when location is provided", () => {
    render(<MaterialBreakdown materials={mockMaterials} />);

    // Check that all location texts are rendered as badges
    expect(screen.getByText("Main Facade")).toBeInTheDocument();
    expect(screen.getByText("Windows")).toBeInTheDocument();
    expect(screen.getByText("Trim")).toBeInTheDocument();

    // Verify they are within badge elements
    const mainFacadeBadge = screen.getByText("Main Facade").closest("div");
    expect(mainFacadeBadge).toHaveClass(
      "inline-flex items-center rounded-full",
    );
  });

  it("applies correct color classes for materials", () => {
    const { container } = render(
      <MaterialBreakdown materials={mockMaterials} />,
    );

    // Check for color divs
    expect(container.querySelector(".bg-red-500")).toBeInTheDocument(); // brick
    expect(container.querySelector(".bg-cyan-500")).toBeInTheDocument(); // glass
    expect(container.querySelector(".bg-blue-500")).toBeInTheDocument(); // metal
  });

  it("handles unknown material types", () => {
    const unknownMaterials: FacadeMaterial[] = [
      {
        type: "unknown-material" as any,
        location: "Test",
        sqft: 100,
        percentage: 100,
        confidence: 75,
      },
    ];

    const { container } = render(
      <MaterialBreakdown materials={unknownMaterials} />,
    );

    // Should apply default gray color
    expect(container.querySelector(".bg-gray-500")).toBeInTheDocument();
  });

  it("formats large numbers correctly", () => {
    const largeMaterials: FacadeMaterial[] = [
      {
        type: "concrete",
        location: "Large Building",
        sqft: 10000,
        percentage: 100,
        confidence: 95,
      },
    ];

    render(<MaterialBreakdown materials={largeMaterials} />);

    // The component formats large numbers with commas
    // Use getAllByText since there are two instances (material and total)
    const formattedNumbers = screen.getAllByText((content, element) => {
      return element?.textContent === "10,000 sq ft";
    });

    expect(formattedNumbers).toHaveLength(2); // One in material, one in total
  });
});

import React from "react";
import { render, screen, fireEvent } from "@/__tests__/test-utils";
import { AICreateEstimateCard } from "@/components/dashboard/AICreateEstimateCard";

describe("AICreateEstimateCard", () => {
  const mockNavigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders main content correctly", () => {
    render(<AICreateEstimateCard navigateTo={mockNavigateTo} />);

    expect(screen.getByText("Create AI Estimate")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Drop email, photos, or describe your project - AI does the rest",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Start AI Estimation")).toBeInTheDocument();
  });

  it("renders all action buttons", () => {
    render(<AICreateEstimateCard navigateTo={mockNavigateTo} />);

    expect(screen.getByText("Photo Analysis")).toBeInTheDocument();
    expect(screen.getByText("Email Parse")).toBeInTheDocument();
    expect(screen.getByText("Voice Input")).toBeInTheDocument();
    expect(screen.getByText("Calculator")).toBeInTheDocument();
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("navigates to guided flow when main button is clicked", () => {
    render(<AICreateEstimateCard navigateTo={mockNavigateTo} />);

    const mainButton = screen.getByText("Start AI Estimation");
    fireEvent.click(mainButton);

    expect(mockNavigateTo).toHaveBeenCalledWith("/estimates/new/guided");
  });

  it("navigates to correct paths for each feature button", () => {
    render(<AICreateEstimateCard navigateTo={mockNavigateTo} />);

    const testCases = [
      { label: "Photo Analysis", path: "/estimates/new/guided?start=photos" },
      { label: "Email Parse", path: "/estimates/new/guided?start=email" },
      { label: "Voice Input", path: "/estimates/new/guided?start=voice" },
      { label: "Calculator", path: "/calculator" },
      { label: "AI Assistant", path: "/ai-assistant" },
    ];

    testCases.forEach(({ label, path }) => {
      const button = screen.getByText(label).closest("button");
      fireEvent.click(button!);
      expect(mockNavigateTo).toHaveBeenCalledWith(path);
    });
  });

  it("applies special styling to AI Assistant button", () => {
    render(<AICreateEstimateCard navigateTo={mockNavigateTo} />);

    const aiAssistantButton = screen
      .getByText("AI Assistant")
      .closest("button");

    expect(aiAssistantButton).toHaveClass(
      "border-accent-sand/30 bg-gradient-to-br from-accent-sand/10 to-transparent",
    );
  });

  it("renders icons for each feature", () => {
    const { container } = render(
      <AICreateEstimateCard navigateTo={mockNavigateTo} />,
    );

    // Check for SVG elements (icons)
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(5); // Main icon + feature icons
  });

  it("has proper accessibility attributes", () => {
    render(<AICreateEstimateCard navigateTo={mockNavigateTo} />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeVisible();
      expect(button).toBeEnabled();
    });
  });
});

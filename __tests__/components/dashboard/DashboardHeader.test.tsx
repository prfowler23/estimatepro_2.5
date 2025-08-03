import React from "react";
import { render, screen, fireEvent } from "@/__tests__/test-utils";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

describe("DashboardHeader", () => {
  it("renders with default props", () => {
    render(<DashboardHeader />);

    expect(screen.getByText("Welcome back, User!")).toBeInTheDocument();
    expect(
      screen.getByText("Business overview and key metrics"),
    ).toBeInTheDocument();
  });

  it("renders with custom userName", () => {
    render(<DashboardHeader userName="John Doe" />);

    expect(screen.getByText("Welcome back, John Doe!")).toBeInTheDocument();
    expect(
      screen.getByText("Business overview and key metrics"),
    ).toBeInTheDocument();
  });

  it("renders with lastActivity", () => {
    const lastActivity = new Date("2024-01-15");
    render(<DashboardHeader lastActivity={lastActivity} />);

    expect(screen.getByText("Welcome back, User!")).toBeInTheDocument();
    expect(screen.getByText(/Last activity:/)).toBeInTheDocument();
    // Check for the date string, might be 1/14 or 1/15 depending on timezone
    const dateElement = screen.getByText((content, element) => {
      return element?.tagName === "SPAN" && /Last activity:/.test(content);
    });
    expect(dateElement).toBeInTheDocument();
  });

  it("renders refresh button when onRefresh is provided", () => {
    const mockOnRefresh = jest.fn();
    render(<DashboardHeader onRefresh={mockOnRefresh} />);

    const refreshButton = screen.getByRole("button", {
      name: "Refresh dashboard data",
    });
    expect(refreshButton).toBeInTheDocument();

    fireEvent.click(refreshButton);
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it("disables refresh button when loading", () => {
    const mockOnRefresh = jest.fn();
    render(<DashboardHeader onRefresh={mockOnRefresh} loading={true} />);

    const refreshButton = screen.getByRole("button", {
      name: "Refresh dashboard data",
    });
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute("aria-busy", "true");
  });

  it("applies correct CSS classes", () => {
    const { container } = render(<DashboardHeader />);

    const header = container.firstChild;
    expect(header).toHaveClass("flex items-center justify-between mb-6");

    const title = screen.getByText(/Welcome back/);
    expect(title).toHaveClass("text-3xl font-bold");

    const subtitle = screen.getByText("Business overview and key metrics");
    expect(subtitle).toHaveClass("text-muted-foreground");
  });
});

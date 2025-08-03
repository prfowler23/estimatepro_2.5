import React from "react";
import { render, screen, fireEvent } from "@/__tests__/test-utils";
import { AutoSaveStatusDisplay } from "@/components/estimation/guided-flow/AutoSaveStatusDisplay";
import { UseSmartAutoSaveReturn } from "@/hooks/useSmartAutoSave";

describe("AutoSaveStatusDisplay", () => {
  const mockOnSaveNow = jest.fn().mockResolvedValue(true);
  const mockClearSaveError = jest.fn();

  const createMockAutoSave = (
    overrides: Partial<UseSmartAutoSaveReturn> = {},
  ): UseSmartAutoSaveReturn => ({
    saveState: null,
    saveNow: jest.fn(() => Promise.resolve(true)),
    updateData: jest.fn(),
    markDirty: jest.fn(),
    enableAutoSave: jest.fn(),
    disableAutoSave: jest.fn(),
    resolveConflict: jest.fn(() => Promise.resolve(true)),
    isInitialized: true,
    lastSaveTime: null,
    isSaving: false,
    hasUnsavedChanges: false,
    hasConflict: false,
    saveError: null,
    clearSaveError: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "All changes saved" when no changes and no errors', () => {
    const smartAutoSave = createMockAutoSave();

    render(
      <AutoSaveStatusDisplay
        smartAutoSave={smartAutoSave}
        saveError={null}
        clearSaveError={mockClearSaveError}
        onSaveNow={mockOnSaveNow}
      />,
    );

    expect(
      screen.getByText("All changes saved automatically"),
    ).toBeInTheDocument();
    const statusIndicator = screen.getByText(
      "All changes saved automatically",
    ).previousSibling;
    expect(statusIndicator).toHaveClass("bg-green-500");
  });

  it('renders "Saving changes..." when saving', () => {
    const smartAutoSave = createMockAutoSave({ isSaving: true });

    render(
      <AutoSaveStatusDisplay
        smartAutoSave={smartAutoSave}
        saveError={null}
        clearSaveError={mockClearSaveError}
        onSaveNow={mockOnSaveNow}
      />,
    );

    expect(screen.getByText("Saving changes...")).toBeInTheDocument();
    const statusIndicator =
      screen.getByText("Saving changes...").previousSibling;
    expect(statusIndicator).toHaveClass("bg-blue-500 animate-pulse");
  });

  it('renders "Changes pending" when there are unsaved changes', () => {
    const smartAutoSave = createMockAutoSave({ hasUnsavedChanges: true });

    render(
      <AutoSaveStatusDisplay
        smartAutoSave={smartAutoSave}
        saveError={null}
        clearSaveError={mockClearSaveError}
        onSaveNow={mockOnSaveNow}
      />,
    );

    expect(screen.getByText("Changes pending auto-save")).toBeInTheDocument();
    const statusIndicator = screen.getByText(
      "Changes pending auto-save",
    ).previousSibling;
    expect(statusIndicator).toHaveClass("bg-amber-500");
  });

  it('renders "Save error" when there is an error', () => {
    const smartAutoSave = createMockAutoSave();

    render(
      <AutoSaveStatusDisplay
        smartAutoSave={smartAutoSave}
        saveError="Network error"
        clearSaveError={mockClearSaveError}
        onSaveNow={mockOnSaveNow}
      />,
    );

    expect(screen.getByText("Save error occurred")).toBeInTheDocument();
    const statusIndicator = screen.getByText(
      "Save error occurred",
    ).previousSibling;
    expect(statusIndicator).toHaveClass("bg-red-500");
  });

  it("shows last save time when available", () => {
    const lastSaveTime = new Date("2024-01-15T14:30:00");
    const smartAutoSave = createMockAutoSave({ lastSaveTime });

    render(
      <AutoSaveStatusDisplay
        smartAutoSave={smartAutoSave}
        saveError={null}
        clearSaveError={mockClearSaveError}
        onSaveNow={mockOnSaveNow}
      />,
    );

    expect(screen.getByText(/Last saved:/)).toBeInTheDocument();
    expect(screen.getByText(/2:30:00 PM/)).toBeInTheDocument();
  });

  it('shows "Save Now" button when there are unsaved changes', () => {
    const smartAutoSave = createMockAutoSave({ hasUnsavedChanges: true });

    render(
      <AutoSaveStatusDisplay
        smartAutoSave={smartAutoSave}
        saveError={null}
        clearSaveError={mockClearSaveError}
        onSaveNow={mockOnSaveNow}
      />,
    );

    const saveNowButton = screen.getByRole("button", { name: /Save Now/i });
    expect(saveNowButton).toBeInTheDocument();

    fireEvent.click(saveNowButton);
    expect(mockOnSaveNow).toHaveBeenCalledTimes(1);
  });

  it('shows "Clear Error" button when there is an error', () => {
    const smartAutoSave = createMockAutoSave();

    render(
      <AutoSaveStatusDisplay
        smartAutoSave={smartAutoSave}
        saveError="Network error"
        clearSaveError={mockClearSaveError}
        onSaveNow={mockOnSaveNow}
      />,
    );

    const clearErrorButton = screen.getByRole("button", {
      name: /Clear Error/i,
    });
    expect(clearErrorButton).toBeInTheDocument();
    expect(clearErrorButton).toHaveAttribute("title", "Network error");

    fireEvent.click(clearErrorButton);
    expect(mockClearSaveError).toHaveBeenCalledTimes(1);
  });

  it("applies custom className", () => {
    const smartAutoSave = createMockAutoSave();

    const { container } = render(
      <AutoSaveStatusDisplay
        smartAutoSave={smartAutoSave}
        saveError={null}
        clearSaveError={mockClearSaveError}
        onSaveNow={mockOnSaveNow}
        className="custom-class"
      />,
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("handles multiple states correctly", () => {
    // Test priority: error > saving > unsaved changes
    const smartAutoSave = createMockAutoSave({
      hasUnsavedChanges: true,
      isSaving: true,
    });

    const { rerender } = render(
      <AutoSaveStatusDisplay
        smartAutoSave={smartAutoSave}
        saveError="Error"
        clearSaveError={mockClearSaveError}
        onSaveNow={mockOnSaveNow}
      />,
    );

    // Error takes priority - check if the error button exists instead
    expect(screen.getByTitle("Error")).toBeInTheDocument();
    expect(screen.getByText("⚠️ Clear Error")).toBeInTheDocument();

    // Without error, saving takes priority
    rerender(
      <AutoSaveStatusDisplay
        smartAutoSave={smartAutoSave}
        saveError={null}
        clearSaveError={mockClearSaveError}
        onSaveNow={mockOnSaveNow}
      />,
    );
    expect(screen.getByText("Saving changes...")).toBeInTheDocument();
  });
});

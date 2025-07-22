import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";

// Mock the navigation hook
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
  usePathname: () => "/",
}));

// Mock auth context
const mockAuthContext = {
  user: {
    id: "test-user",
    email: "test@example.com",
    user_metadata: { full_name: "Test User" },
  },
  signOut: jest.fn(),
  isLoading: false,
};

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => mockAuthContext,
}));

describe("Navigation Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Desktop Navigation Links", () => {
    test("renders all primary navigation links", () => {
      render(<Navigation />);

      // Test all main navigation links
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Create AI Estimate")).toBeInTheDocument();
      expect(screen.getByText("Estimates")).toBeInTheDocument();
      expect(screen.getByText("Calculator")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    test("Home link navigates to root path", () => {
      render(<Navigation />);

      const homeLink = screen.getByText("Home");
      fireEvent.click(homeLink);

      expect(mockPush).toHaveBeenCalledWith("/");
    });

    test("Dashboard link navigates correctly", () => {
      render(<Navigation />);

      const dashboardLink = screen.getByText("Dashboard");
      fireEvent.click(dashboardLink);

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    test("Create AI Estimate button has primary styling", () => {
      render(<Navigation />);

      const createButton = screen.getByText("Create AI Estimate");
      expect(createButton).toHaveClass("bg-blue-600"); // Primary button styling
    });

    test("Estimates link navigates correctly", () => {
      render(<Navigation />);

      const estimatesLink = screen.getByText("Estimates");
      fireEvent.click(estimatesLink);

      expect(mockPush).toHaveBeenCalledWith("/estimates");
    });

    test("Calculator link navigates correctly", () => {
      render(<Navigation />);

      const calculatorLink = screen.getByText("Calculator");
      fireEvent.click(calculatorLink);

      expect(mockPush).toHaveBeenCalledWith("/calculator");
    });

    test("Settings link navigates correctly", () => {
      render(<Navigation />);

      const settingsLink = screen.getByText("Settings");
      fireEvent.click(settingsLink);

      expect(mockPush).toHaveBeenCalledWith("/settings");
    });
  });

  describe("Mobile Navigation", () => {
    test("mobile menu toggle works correctly", async () => {
      render(<Navigation />);

      // Find mobile menu button (hamburger menu)
      const mobileMenuButton = screen.getByLabelText("Toggle navigation menu");
      expect(mobileMenuButton).toBeInTheDocument();

      // Click to open mobile menu
      fireEvent.click(mobileMenuButton);

      // Wait for mobile menu to appear
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    test("mobile menu contains all navigation links", async () => {
      render(<Navigation />);

      const mobileMenuButton = screen.getByLabelText("Toggle navigation menu");
      fireEvent.click(mobileMenuButton);

      await waitFor(() => {
        // Check that mobile menu contains navigation items
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        // Mobile navigation should contain the same links
        const mobileLinks = screen.getAllByText("Dashboard");
        expect(mobileLinks.length).toBeGreaterThan(0);
      });
    });
  });

  describe("User Authentication State", () => {
    test("displays user profile when authenticated", () => {
      render(<Navigation />);

      // Should show user's name or profile indicator
      expect(screen.getByText("TU")).toBeInTheDocument(); // User initials
    });

    test("sign out button works correctly", async () => {
      render(<Navigation />);

      // Find user dropdown trigger
      const userButton = screen.getByText("TU");
      fireEvent.click(userButton);

      // Wait for dropdown menu
      await waitFor(() => {
        const signOutButton = screen.getByText("Sign out");
        expect(signOutButton).toBeInTheDocument();

        fireEvent.click(signOutButton);
        expect(mockAuthContext.signOut).toHaveBeenCalled();
      });
    });
  });

  describe("Active Link Highlighting", () => {
    test("highlights active navigation link", () => {
      // Mock current pathname
      jest.mock("next/navigation", () => ({
        ...jest.requireActual("next/navigation"),
        usePathname: () => "/dashboard",
      }));

      render(<Navigation />);

      const dashboardLink = screen.getByText("Dashboard");
      expect(dashboardLink).toHaveClass("bg-gray-100"); // Active state styling
    });
  });

  describe("Responsive Behavior", () => {
    test("mobile menu is hidden on desktop", () => {
      // Mock desktop viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<Navigation />);

      // Mobile menu button should be hidden on desktop
      const mobileButton = screen.queryByLabelText("Toggle navigation menu");
      expect(mobileButton).not.toBeVisible();
    });
  });

  describe("Accessibility", () => {
    test("navigation has proper ARIA labels", () => {
      render(<Navigation />);

      const nav = screen.getByRole("navigation");
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute("aria-label", "Main navigation");
    });

    test("links have proper focus states", () => {
      render(<Navigation />);

      const homeLink = screen.getByText("Home");
      homeLink.focus();

      expect(homeLink).toHaveFocus();
      expect(homeLink).toHaveClass("focus:outline-none");
    });

    test("mobile menu button has proper ARIA attributes", () => {
      render(<Navigation />);

      const mobileButton = screen.getByLabelText("Toggle navigation menu");
      expect(mobileButton).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(mobileButton);

      expect(mobileButton).toHaveAttribute("aria-expanded", "true");
    });
  });
});

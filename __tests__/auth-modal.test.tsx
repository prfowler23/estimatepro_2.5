import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthModal } from "@/components/auth/auth-modal";

// Mock auth context
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    isLoading: false,
    error: null,
  }),
}));

// Mock toast notifications
jest.mock("@/components/ui/toast/toast-provider", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe("AuthModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Modal Behavior", () => {
    test("renders modal when isOpen is true", () => {
      render(<AuthModal {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Welcome to EstimatePro")).toBeInTheDocument();
    });

    test("does not render modal when isOpen is false", () => {
      render(<AuthModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test("closes modal when close button is clicked", () => {
      const mockOnClose = jest.fn();
      render(<AuthModal {...defaultProps} onClose={mockOnClose} />);

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test("closes modal when overlay is clicked", () => {
      const mockOnClose = jest.fn();
      render(<AuthModal {...defaultProps} onClose={mockOnClose} />);

      const overlay = screen.getByRole("dialog");
      fireEvent.click(overlay);

      expect(mockOnClose).toHaveBeenCalled();
    });

    test("closes modal when escape key is pressed", () => {
      const mockOnClose = jest.fn();
      render(<AuthModal {...defaultProps} onClose={mockOnClose} />);

      fireEvent.keyDown(document, { key: "Escape" });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe("Tab Navigation", () => {
    test("renders login tab by default", () => {
      render(<AuthModal {...defaultProps} />);

      expect(screen.getByText("Sign In")).toBeInTheDocument();
      expect(screen.getByText("Sign Up")).toBeInTheDocument();

      // Login tab should be active by default
      const loginTab = screen.getByRole("tab", { name: /sign in/i });
      expect(loginTab).toHaveAttribute("aria-selected", "true");
    });

    test("switches to signup tab when clicked", async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const signupTab = screen.getByRole("tab", { name: /sign up/i });
      await user.click(signupTab);

      expect(signupTab).toHaveAttribute("aria-selected", "true");
      expect(screen.getByText("Company Name")).toBeInTheDocument(); // Signup-specific field
    });

    test("tab navigation works with keyboard", async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const loginTab = screen.getByRole("tab", { name: /sign in/i });
      const signupTab = screen.getByRole("tab", { name: /sign up/i });

      // Focus first tab
      loginTab.focus();
      expect(loginTab).toHaveFocus();

      // Navigate to second tab with arrow key
      await user.keyboard("{ArrowRight}");
      expect(signupTab).toHaveFocus();

      // Navigate back with arrow key
      await user.keyboard("{ArrowLeft}");
      expect(loginTab).toHaveFocus();
    });
  });

  describe("Login Form", () => {
    test("renders login form fields", () => {
      render(<AuthModal {...defaultProps} />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument();
    });

    test("validates email field", async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      // Submit without email
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Enter invalid email
      await user.type(emailInput, "invalid-email");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email/i),
        ).toBeInTheDocument();
      });
    });

    test("validates password field", async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      // Enter valid email but no password
      await user.type(emailInput, "test@example.com");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    test("submits login form with valid data", async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /sign in/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    test("shows loading state during login", async () => {
      const user = userEvent.setup();

      // Mock loading state
      jest.mock("@/contexts/auth-context", () => ({
        useAuth: () => ({
          signIn: mockSignIn,
          signUp: mockSignUp,
          isLoading: true,
          error: null,
        }),
      }));

      render(<AuthModal {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });
  });

  describe("Signup Form", () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      // Switch to signup tab
      const signupTab = screen.getByRole("tab", { name: /sign up/i });
      await user.click(signupTab);
    });

    test("renders signup form fields", () => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create account/i }),
      ).toBeInTheDocument();
    });

    test("validates all signup fields", async () => {
      const user = userEvent.setup();
      const submitButton = screen.getByRole("button", {
        name: /create account/i,
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
        expect(
          screen.getByText(/company name is required/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    test("validates password strength", async () => {
      const user = userEvent.setup();
      const passwordInput = screen.getByLabelText(/password/i);

      // Enter weak password
      await user.type(passwordInput, "123");

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i),
        ).toBeInTheDocument();
      });
    });

    test("submits signup form with valid data", async () => {
      const user = userEvent.setup();

      await user.type(screen.getByLabelText(/full name/i), "John Doe");
      await user.type(screen.getByLabelText(/company name/i), "Acme Corp");
      await user.type(screen.getByLabelText(/email/i), "john@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");

      const submitButton = screen.getByRole("button", {
        name: /create account/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          fullName: "John Doe",
          companyName: "Acme Corp",
          email: "john@example.com",
          password: "password123",
        });
      });
    });
  });

  describe("Error Handling", () => {
    test("displays authentication errors", () => {
      const mockError = "Invalid email or password";

      jest.mock("@/contexts/auth-context", () => ({
        useAuth: () => ({
          signIn: mockSignIn,
          signUp: mockSignUp,
          isLoading: false,
          error: mockError,
        }),
      }));

      render(<AuthModal {...defaultProps} />);

      expect(screen.getByText(mockError)).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    test("clears error when switching tabs", async () => {
      const user = userEvent.setup();

      // Start with an error
      jest.mock("@/contexts/auth-context", () => ({
        useAuth: () => ({
          signIn: mockSignIn,
          signUp: mockSignUp,
          isLoading: false,
          error: "Some error",
        }),
      }));

      render(<AuthModal {...defaultProps} />);

      const signupTab = screen.getByRole("tab", { name: /sign up/i });
      await user.click(signupTab);

      // Error should be cleared when switching tabs
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("has proper ARIA attributes", () => {
      render(<AuthModal {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-labelledby");
      expect(dialog).toHaveAttribute("aria-describedby");
    });

    test("traps focus within modal", async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      const firstInput = screen.getByLabelText(/email/i);
      const lastButton = screen.getByRole("button", { name: /sign in/i });

      // Focus should be trapped within modal
      firstInput.focus();
      expect(firstInput).toHaveFocus();

      // Tab to last element
      await user.tab();
      await user.tab();
      expect(lastButton).toHaveFocus();

      // Tab should cycle back to first element
      await user.tab();
      expect(firstInput).toHaveFocus();
    });

    test("form labels are properly associated", () => {
      render(<AuthModal {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute("id");
      expect(passwordInput).toHaveAttribute("id");
    });
  });

  describe("Form State Management", () => {
    test("maintains form values when switching tabs", async () => {
      const user = userEvent.setup();
      render(<AuthModal {...defaultProps} />);

      // Enter data in login form
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "test@example.com");

      // Switch to signup tab
      const signupTab = screen.getByRole("tab", { name: /sign up/i });
      await user.click(signupTab);

      // Switch back to login tab
      const loginTab = screen.getByRole("tab", { name: /sign in/i });
      await user.click(loginTab);

      // Email should still be there
      expect(emailInput).toHaveValue("test@example.com");
    });

    test("resets form when modal is closed and reopened", () => {
      const { rerender } = render(<AuthModal {...defaultProps} />);

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      // Close modal
      rerender(<AuthModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<AuthModal {...defaultProps} isOpen={true} />);

      const newEmailInput = screen.getByLabelText(/email/i);
      expect(newEmailInput).toHaveValue("");
    });
  });
});

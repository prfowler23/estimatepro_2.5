import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FacadeImageUpload } from "@/components/facade-analysis/facade-image-upload";
import { toast } from "@/components/ui/use-toast";

// Mock the toast hook
jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

// Mock react-dropzone
jest.mock("react-dropzone", () => ({
  useDropzone: jest.fn((options) => ({
    getRootProps: jest.fn(() => ({
      onDrop: options.onDrop,
    })),
    getInputProps: jest.fn(() => ({
      type: "file",
      accept: options.accept,
    })),
    isDragActive: false,
  })),
}));

// Mock fetch
global.fetch = jest.fn();

describe("FacadeImageUpload", () => {
  const mockOnUploadComplete = jest.fn();
  const defaultProps = {
    facadeAnalysisId: "test-facade-id",
    onUploadComplete: mockOnUploadComplete,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  describe("Component rendering", () => {
    it("should render upload button", () => {
      render(<FacadeImageUpload {...defaultProps} />);
      expect(screen.getByText("Upload Image")).toBeInTheDocument();
    });

    it("should open dialog when button is clicked", () => {
      render(<FacadeImageUpload {...defaultProps} />);

      fireEvent.click(screen.getByText("Upload Image"));

      expect(screen.getByText("Upload Facade Image")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Add an image to the facade analysis for AI processing",
        ),
      ).toBeInTheDocument();
    });

    it("should render with custom className", () => {
      render(<FacadeImageUpload {...defaultProps} className="custom-class" />);

      const button = screen.getByText("Upload Image").closest("button");
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("Upload methods", () => {
    it("should switch between file and URL upload methods", () => {
      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      // Default should be file upload
      expect(
        screen.getByText("Drag & drop an image here, or click to select"),
      ).toBeInTheDocument();

      // Switch to URL
      fireEvent.click(screen.getByText("Image URL"));
      expect(screen.getByLabelText("Image URL")).toBeInTheDocument();

      // Switch back to file
      fireEvent.click(screen.getByText("Upload File"));
      expect(
        screen.getByText("Drag & drop an image here, or click to select"),
      ).toBeInTheDocument();
    });
  });

  describe("File upload validation", () => {
    it("should show error for missing file", async () => {
      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      // Try to upload without selecting a file
      const uploadButton = screen.getByRole("button", { name: /^Upload$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: "No file selected",
          description: "Please select an image to upload",
          variant: "destructive",
        });
      });
    });

    it("should validate file size", async () => {
      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      // Create a file that's too large
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)], // 11MB
        "large-image.jpg",
        { type: "image/jpeg" },
      );

      // Simulate file selection
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      Object.defineProperty(input, "files", {
        value: [largeFile],
        writable: false,
      });

      fireEvent.change(input);

      // Try to upload
      const uploadButton = screen.getByRole("button", { name: /^Upload$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
      });
    });

    it("should validate file type", async () => {
      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      // Create a file with invalid type
      const invalidFile = new File(["test content"], "document.pdf", {
        type: "application/pdf",
      });

      // Simulate file selection
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      Object.defineProperty(input, "files", {
        value: [invalidFile],
        writable: false,
      });

      fireEvent.change(input);

      // Try to upload
      const uploadButton = screen.getByRole("button", { name: /^Upload$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: "Invalid file type",
          description: "Please select a valid image file (JPG, PNG, GIF, WebP)",
          variant: "destructive",
        });
      });
    });
  });

  describe("URL upload validation", () => {
    it("should show error for missing URL", async () => {
      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      // Switch to URL mode
      fireEvent.click(screen.getByText("Image URL"));

      // Try to upload without entering URL
      const uploadButton = screen.getByRole("button", { name: /^Upload$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: "No URL provided",
          description: "Please enter an image URL",
          variant: "destructive",
        });
      });
    });
  });

  describe("Successful upload", () => {
    it("should upload file successfully", async () => {
      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      // Create a valid file
      const validFile = new File(["test image content"], "test-image.jpg", {
        type: "image/jpeg",
      });

      // Simulate file selection
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      Object.defineProperty(input, "files", {
        value: [validFile],
        writable: false,
      });

      fireEvent.change(input);

      // Select image type and view angle
      const imageTypeSelect = screen.getByLabelText("Image Type");
      fireEvent.click(imageTypeSelect);
      fireEvent.click(screen.getByText("Aerial"));

      const viewAngleSelect = screen.getByLabelText("View Angle");
      fireEvent.click(viewAngleSelect);
      fireEvent.click(screen.getByText("Front"));

      // Upload
      const uploadButton = screen.getByRole("button", { name: /^Upload$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/facade-analysis/test-facade-id/images",
          expect.objectContaining({
            method: "POST",
            body: expect.any(FormData),
          }),
        );
      });

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: "Image uploaded",
          description: "The image has been added to the facade analysis",
        });
      });

      expect(mockOnUploadComplete).toHaveBeenCalled();
    });

    it("should upload URL successfully", async () => {
      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      // Switch to URL mode
      fireEvent.click(screen.getByText("Image URL"));

      // Enter URL
      const urlInput = screen.getByLabelText("Image URL");
      fireEvent.change(urlInput, {
        target: { value: "https://example.com/image.jpg" },
      });

      // Upload
      const uploadButton = screen.getByRole("button", { name: /^Upload$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/facade-analysis/test-facade-id/images",
          expect.objectContaining({
            method: "POST",
            body: expect.any(FormData),
          }),
        );
      });

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: "Image uploaded",
          description: "The image has been added to the facade analysis",
        });
      });
    });
  });

  describe("Upload failure", () => {
    it("should handle upload API failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Server error occurred" }),
      });

      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      // Create a valid file
      const validFile = new File(["test image content"], "test-image.jpg", {
        type: "image/jpeg",
      });

      // Simulate file selection
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      Object.defineProperty(input, "files", {
        value: [validFile],
        writable: false,
      });

      fireEvent.change(input);

      // Upload
      const uploadButton = screen.getByRole("button", { name: /^Upload$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: "Upload failed",
          description: "Server error occurred",
          variant: "destructive",
        });
      });
    });

    it("should handle network errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      // Create a valid file
      const validFile = new File(["test image content"], "test-image.jpg", {
        type: "image/jpeg",
      });

      // Simulate file selection
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      Object.defineProperty(input, "files", {
        value: [validFile],
        writable: false,
      });

      fireEvent.change(input);

      // Upload
      const uploadButton = screen.getByRole("button", { name: /^Upload$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: "Upload failed",
          description: "Network error",
          variant: "destructive",
        });
      });
    });
  });

  describe("Loading states", () => {
    it("should show loading state during upload", async () => {
      // Make fetch take longer
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                }),
              100,
            ),
          ),
      );

      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      // Create a valid file
      const validFile = new File(["test image content"], "test-image.jpg", {
        type: "image/jpeg",
      });

      // Simulate file selection
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      Object.defineProperty(input, "files", {
        value: [validFile],
        writable: false,
      });

      fireEvent.change(input);

      // Upload
      const uploadButton = screen.getByRole("button", { name: /^Upload$/ });
      fireEvent.click(uploadButton);

      // Check for loading state
      expect(screen.getByText("Uploading...")).toBeInTheDocument();

      // Wait for upload to complete
      await waitFor(() => {
        expect(screen.queryByText("Uploading...")).not.toBeInTheDocument();
      });
    });
  });

  describe("Dialog behavior", () => {
    it("should close dialog on cancel", () => {
      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      expect(screen.getByText("Upload Facade Image")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel"));

      expect(screen.queryByText("Upload Facade Image")).not.toBeInTheDocument();
    });

    it("should close dialog after successful upload", async () => {
      render(<FacadeImageUpload {...defaultProps} />);
      fireEvent.click(screen.getByText("Upload Image"));

      // Create a valid file
      const validFile = new File(["test image content"], "test-image.jpg", {
        type: "image/jpeg",
      });

      // Simulate file selection
      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      Object.defineProperty(input, "files", {
        value: [validFile],
        writable: false,
      });

      fireEvent.change(input);

      // Upload
      const uploadButton = screen.getByRole("button", { name: /^Upload$/ });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(
          screen.queryByText("Upload Facade Image"),
        ).not.toBeInTheDocument();
      });
    });
  });
});

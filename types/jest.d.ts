import "@testing-library/jest-dom";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeDisabled(): R;
      toHaveAttribute(attribute: string, value?: string): R;
      toHaveFocus(): R;
    }
  }
}

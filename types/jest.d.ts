import "@testing-library/jest-dom";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(items: any[]): R;
    }
  }
}

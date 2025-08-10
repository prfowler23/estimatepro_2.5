import "@testing-library/jest-dom";

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Custom Jest matcher to check if a value is one of the provided items
       * @param items Array of values to check against
       */
      toBeOneOf(items: unknown[]): R;
    }
  }
}

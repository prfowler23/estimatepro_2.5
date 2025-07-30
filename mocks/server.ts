import { setupServer } from "msw/node";

export const server = setupServer();

// Enable request interception
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());

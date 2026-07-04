import { afterEach, beforeEach, vi } from "vitest";

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    throw new Error(`Unexpected console.error during test: ${args.map(String).join(" ")}`);
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

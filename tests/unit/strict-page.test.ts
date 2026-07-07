import { describe, expect, it } from "vitest";
import { isIgnorableRequestFailure } from "../e2e/strict-page";

describe("strict E2E page checks", () => {
  it("ignores only Next internal font aborts caused by fast navigations", () => {
    expect(
      isIgnorableRequestFailure({
        url: "http://localhost:3025/__nextjs_font/geist-latin.woff2",
        resourceType: "font",
        errorText: "net::ERR_ABORTED",
      }),
    ).toBe(true);
  });

  it("keeps app and asset request failures fatal", () => {
    expect(
      isIgnorableRequestFailure({
        url: "http://localhost:3025/api/cron/lead-imports",
        resourceType: "fetch",
        errorText: "net::ERR_FAILED",
      }),
    ).toBe(false);
    expect(
      isIgnorableRequestFailure({
        url: "http://localhost:3025/styles/app.css",
        resourceType: "stylesheet",
        errorText: "net::ERR_ABORTED",
      }),
    ).toBe(false);
    expect(
      isIgnorableRequestFailure({
        url: "http://localhost:3025/__nextjs_font/geist-latin.woff2",
        resourceType: "font",
        errorText: "net::ERR_FAILED",
      }),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { safeInternalRedirectPath } from "@/lib/crm/navigation";

describe("CRM navigation safety", () => {
  it("keeps valid internal redirect paths including query strings", () => {
    expect(safeInternalRedirectPath("/tasks?view=today")).toBe("/tasks?view=today");
    expect(safeInternalRedirectPath("  /deals?filter=%E5%8F%97%E6%B3%A8#stage  ")).toBe("/deals?filter=%E5%8F%97%E6%B3%A8#stage");
  });

  it("falls back for external or ambiguous redirect targets", () => {
    expect(safeInternalRedirectPath("https://example.test/phishing")).toBe("/dashboard");
    expect(safeInternalRedirectPath("//example.test/phishing")).toBe("/dashboard");
    expect(safeInternalRedirectPath("javascript:alert(1)")).toBe("/dashboard");
    expect(safeInternalRedirectPath("/\\example.test")).toBe("/dashboard");
    expect(safeInternalRedirectPath(undefined)).toBe("/dashboard");
  });

  it("uses a safe custom fallback and ignores unsafe fallback values", () => {
    expect(safeInternalRedirectPath("https://example.test", "/login")).toBe("/login");
    expect(safeInternalRedirectPath("https://example.test", "https://fallback.test")).toBe("/dashboard");
  });
});

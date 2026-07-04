import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatApiListResponse, normalizeApiError, withFallback } from "@/lib/crm/api";

const apiFixture = (name: string) => JSON.parse(readFileSync(path.join(process.cwd(), "tests", "fixtures", "api", name), "utf8"));

describe("API response shaping and fallback", () => {
  it("formats successful list responses and empty data", () => {
    expect(formatApiListResponse([{ id: "a" }])).toEqual({ ok: true, rows: [{ id: "a" }], error: null });
    expect(formatApiListResponse(null)).toEqual({ ok: true, rows: [], error: null });
  });

  it("normalizes API and Supabase style errors", () => {
    const errorFixture = apiFixture("supabase-insert-error.json");

    expect(normalizeApiError(errorFixture.error.message)).toContain("duplicate key");
    expect(formatApiListResponse(null, errorFixture.error.message)).toEqual({
      ok: false,
      rows: [],
      error: expect.stringContaining("duplicate key"),
    });
  });

  it("returns fallback data when external operations fail", async () => {
    const successFixture = apiFixture("supabase-insert-success.json");

    await expect(withFallback(async () => successFixture.data, { id: "fallback" })).resolves.toMatchObject({
      ok: true,
      fallback: false,
      data: { id: "lead-test-001" },
    });

    await expect(
      withFallback(async () => {
        throw new Error("network timeout");
      }, { id: "fallback" }),
    ).resolves.toMatchObject({
      ok: false,
      fallback: true,
      data: { id: "fallback" },
      error: "network timeout",
    });
  });
});

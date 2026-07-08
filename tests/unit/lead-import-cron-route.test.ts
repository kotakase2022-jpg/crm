import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/lead-imports/route";
import { runAllLeadImportsFromCron } from "@/lib/crm/lead-imports";

vi.mock("@/lib/crm/lead-imports", () => ({
  runAllLeadImportsFromCron: vi.fn(),
}));

const mockedRunAllLeadImportsFromCron = vi.mocked(runAllLeadImportsFromCron);

function requestWithAuth(token?: string) {
  return new Request("https://crm.example.test/api/cron/lead-imports", {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("lead import cron route", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  afterEach(() => {
    mockedRunAllLeadImportsFromCron.mockReset();

    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it("rejects requests when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(requestWithAuth("secret"));

    expect(response.status).toBe(401);
    await expect(json(response)).resolves.toEqual({ ok: false, error: "Unauthorized" });
    expect(mockedRunAllLeadImportsFromCron).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid bearer token", async () => {
    process.env.CRON_SECRET = "correct-secret";

    const response = await GET(requestWithAuth("wrong-secret"));

    expect(response.status).toBe(401);
    await expect(json(response)).resolves.toEqual({ ok: false, error: "Unauthorized" });
    expect(mockedRunAllLeadImportsFromCron).not.toHaveBeenCalled();
  });

  it("aggregates successful import results", async () => {
    process.env.CRON_SECRET = "correct-secret";
    mockedRunAllLeadImportsFromCron.mockResolvedValue([
      { settingId: "setting-1", status: "success", importedCount: 2, skippedCount: 1, message: "Imported 2 leads." },
      { settingId: "setting-2", status: "success", importedCount: 3, skippedCount: 4, message: "Imported 3 leads." },
    ] as Awaited<ReturnType<typeof runAllLeadImportsFromCron>>);

    const response = await GET(requestWithAuth("correct-secret"));

    expect(response.status).toBe(200);
    await expect(json(response)).resolves.toMatchObject({
      ok: true,
      imported: 5,
      skipped: 5,
      failed: 0,
    });
    expect(mockedRunAllLeadImportsFromCron).toHaveBeenCalledTimes(1);
  });

  it("returns an error status when any import setting fails", async () => {
    process.env.CRON_SECRET = "correct-secret";
    mockedRunAllLeadImportsFromCron.mockResolvedValue([
      { settingId: "setting-1", status: "success", importedCount: 2, skippedCount: 0, message: "Imported 2 leads." },
      { settingId: "setting-2", status: "failed", importedCount: 1, skippedCount: 3, message: "CSV fetch failed" },
    ] as Awaited<ReturnType<typeof runAllLeadImportsFromCron>>);

    const response = await GET(requestWithAuth("correct-secret"));

    expect(response.status).toBe(500);
    await expect(json(response)).resolves.toMatchObject({
      ok: false,
      imported: 3,
      skipped: 3,
      failed: 1,
    });
    expect(mockedRunAllLeadImportsFromCron).toHaveBeenCalledTimes(1);
  });

  it("returns the cron error message when import execution throws", async () => {
    process.env.CRON_SECRET = "correct-secret";
    mockedRunAllLeadImportsFromCron.mockRejectedValue(new Error("Supabase admin environment variables are missing."));

    const response = await GET(requestWithAuth("correct-secret"));

    expect(response.status).toBe(500);
    await expect(json(response)).resolves.toEqual({
      ok: false,
      error: "Supabase admin environment variables are missing.",
    });
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseCsv } from "@/lib/crm/csv";
import { runAllLeadImportsFromCron, saveLeadImportSetting } from "@/lib/crm/lead-imports";
import { leadStatuses } from "@/lib/crm/options";
import {
  assertTrustedSpreadsheetCsvUrl,
  defaultLeadImportStatus,
  importSourceIdSet,
  normalizeLeadImportRow,
  recentLeadImportRuns,
  safeLeadImportStatus,
  spreadsheetUrlToCsvUrl,
} from "@/lib/crm/lead-import-utils";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  getCrmContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`Unexpected redirect to ${path}`);
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/crm/data", () => ({
  getCrmContext: mocks.getCrmContext,
}));

function fixture(name: string) {
  return readFileSync(path.join(process.cwd(), "tests/fixtures/csv", name), "utf8");
}

function validSettingForm(id = "setting-1") {
  const formData = new FormData();
  formData.set("id", id);
  formData.set("name", "Ads import");
  formData.set("spreadsheet_url", "https://docs.google.com/spreadsheets/d/sheet-id/edit");
  formData.set("default_status", defaultLeadImportStatus);
  formData.set("enabled", "on");
  return formData;
}

describe("lead spreadsheet imports", () => {
  beforeEach(() => {
    mocks.createAdminClient.mockReset();
    mocks.getCrmContext.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("converts a Google Sheets URL to a CSV export URL while preserving gid", () => {
    const csvUrl = spreadsheetUrlToCsvUrl("https://docs.google.com/spreadsheets/d/sheet-id-123/edit#gid=987");

    expect(csvUrl).toBe("https://docs.google.com/spreadsheets/d/sheet-id-123/export?format=csv&gid=987");
  });

  it("keeps already published CSV URLs unchanged", () => {
    const url = "https://docs.google.com/spreadsheets/d/e/pub?output=csv";

    expect(spreadsheetUrlToCsvUrl(url)).toBe(url);
  });

  it("rejects arbitrary external CSV URLs before server-side fetch", () => {
    expect(() => spreadsheetUrlToCsvUrl("https://example.com/leads.csv")).toThrow(
      "Spreadsheet imports only support Google Sheets CSV URLs.",
    );
  });

  it("rejects link-local and non-HTTPS import URLs", () => {
    expect(() => assertTrustedSpreadsheetCsvUrl("http://169.254.169.254/latest/meta-data.csv")).toThrow(
      "Spreadsheet import URLs must use HTTPS.",
    );
    expect(() => assertTrustedSpreadsheetCsvUrl("https://169.254.169.254/latest/meta-data.csv")).toThrow(
      "Spreadsheet imports only support Google Sheets CSV URLs.",
    );
  });

  it("normalizes Japanese spreadsheet headers into a valid lead payload", () => {
    const { rows } = parseCsv(fixture("leads.spreadsheet-ja.csv"));
    const lead = normalizeLeadImportRow(rows[0], defaultLeadImportStatus);

    expect(lead).toMatchObject({
      name: "広告フォームA",
      company_name: "青葉建設",
      contact_name: "田中 太郎",
      email: "ad-a@example.test",
      source: "広告",
      status: "新規（広告経由）",
    });
  });

  it("rejects header alias collisions instead of overwriting spreadsheet values", () => {
    const { rows } = parseCsv("リード名,会社名,メール,email\nLead A,Sample Construction,alias@example.test,raw@example.test\n");

    expect(() => normalizeLeadImportRow(rows[0], defaultLeadImportStatus)).toThrow(
      "Spreadsheet import has duplicate header after normalization: email",
    );
  });

  it("falls back to the configured import status when a row status is unsupported", () => {
    const lead = normalizeLeadImportRow(
      {
        name: "Lead",
        company_name: "Sample Construction",
        status: "unsupported",
      },
      "新規（広告以外）",
    );

    expect(lead.status).toBe("新規（広告以外）");
  });

  it("normalizes persisted default statuses before validating import settings", () => {
    const nonDefaultStatus = leadStatuses.find((status) => status !== defaultLeadImportStatus);
    expect(nonDefaultStatus).toBeDefined();
    expect(safeLeadImportStatus(` ${nonDefaultStatus} `)).toBe(nonDefaultStatus);
    expect(safeLeadImportStatus(` ${defaultLeadImportStatus} `)).toBe(defaultLeadImportStatus);
    expect(safeLeadImportStatus(" unsupported ")).toBe(defaultLeadImportStatus);
  });

  it("normalizes persisted import source ids before duplicate checks", () => {
    const sourceIds = importSourceIdSet([
      { external_source_id: " email:lead@example.test " },
      { external_source_id: "" },
      { external_source_id: "   " },
      { external_source_id: null },
    ]);

    expect([...sourceIds]).toEqual(["email:lead@example.test"]);
    expect(sourceIds.has("email:lead@example.test")).toBe(true);
  });

  it("shows the most recent import runs first without mutating the original list", () => {
    const runs = Array.from({ length: 12 }, (_, index) => ({
      id: `run-${index + 1}`,
      started_at: `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));

    const recent = recentLeadImportRuns(runs);

    expect(recent.map((run) => run.id)).toEqual([
      "run-12",
      "run-11",
      "run-10",
      "run-9",
      "run-8",
      "run-7",
      "run-6",
      "run-5",
      "run-4",
      "run-3",
    ]);
    expect(runs.map((run) => run.id).slice(0, 3)).toEqual(["run-1", "run-2", "run-3"]);
  });

  it("scopes service-role cron status updates to the setting organization", async () => {
    const settingsSelect = selectQuery([{ id: "setting-1", organization_id: "org-1", spreadsheet_url: "https://docs.google.com/spreadsheets/d/sheet-id/edit" }]);
    const runInsert = insertReturning({ id: "run-1" });
    const existingLeadsSelect = selectQuery([]);
    const leadInsert = insertReturning({ id: "lead-1" });
    const taskInsert = insertOnly();
    const runUpdate = updateQuery();
    const settingUpdate = updateQuery();
    const builders: Record<string, Array<Record<string, unknown>>> = {
      lead_import_settings: [settingsSelect, settingUpdate],
      lead_import_runs: [runInsert, runUpdate],
      leads: [existingLeadsSelect, leadInsert],
      tasks: [taskInsert],
    };
    const supabase = {
      from: vi.fn((table: string) => {
        const builder = builders[table]?.shift();
        if (!builder) throw new Error(`Unexpected table query: ${table}`);
        return builder;
      }),
    };

    mocks.createAdminClient.mockReturnValue(supabase);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("name,company_name,email\nImported Lead,Imported Company,imported@example.test\n", { status: 200 }),
    );

    const results = await runAllLeadImportsFromCron();

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ status: "success", importedCount: 1, skippedCount: 0 });
    expect(runUpdate.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(runUpdate.eq).toHaveBeenCalledWith("id", "run-1");
    expect(runUpdate.is).toHaveBeenCalledWith("deleted_at", null);
    expect(runUpdate.select).toHaveBeenCalledWith("id");
    expect(runUpdate.single).toHaveBeenCalled();
    expect(settingUpdate.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(settingUpdate.eq).toHaveBeenCalledWith("id", "setting-1");
    expect(settingUpdate.is).toHaveBeenCalledWith("deleted_at", null);
    expect(settingUpdate.select).toHaveBeenCalledWith("id");
    expect(settingUpdate.single).toHaveBeenCalled();
  });

  it("does not report cron imports as successful when status persistence matches no row", async () => {
    const settingsSelect = selectQuery([{ id: "setting-1", organization_id: "org-1", spreadsheet_url: "https://docs.google.com/spreadsheets/d/sheet-id/edit" }]);
    const runInsert = insertReturning({ id: "run-1" });
    const existingLeadsSelect = selectQuery([]);
    const leadInsert = insertReturning({ id: "lead-1" });
    const taskInsert = insertOnly();
    const missingRunUpdate = updateReturning(null, { message: "No rows returned" });
    const failedRunUpdate = updateReturning({ id: "run-1" });
    const failedSettingUpdate = updateReturning({ id: "setting-1" });
    const builders: Record<string, Array<Record<string, unknown>>> = {
      lead_import_settings: [settingsSelect, failedSettingUpdate],
      lead_import_runs: [runInsert, missingRunUpdate, failedRunUpdate],
      leads: [existingLeadsSelect, leadInsert],
      tasks: [taskInsert],
    };
    const supabase = {
      from: vi.fn((table: string) => {
        const builder = builders[table]?.shift();
        if (!builder) throw new Error(`Unexpected table query: ${table}`);
        return builder;
      }),
    };

    mocks.createAdminClient.mockReturnValue(supabase);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("name,company_name,email\nImported Lead,Imported Company,imported@example.test\n", { status: 200 }),
    );

    const results = await runAllLeadImportsFromCron();

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ status: "failed", importedCount: 1, skippedCount: 0, message: "No rows returned" });
    expect(missingRunUpdate.select).toHaveBeenCalledWith("id");
    expect(missingRunUpdate.single).toHaveBeenCalled();
    expect(failedRunUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error_message: "No rows returned",
      }),
    );
    expect(failedSettingUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_run_status: "failed",
        last_run_message: "No rows returned",
      }),
    );
  });

  it("updates Supabase import settings only inside the current organization", async () => {
    const update = updateReturning({ id: "setting-1" });
    const supabase = {
      from: vi.fn(() => update),
    };
    mocks.getCrmContext.mockResolvedValue({
      mode: "supabase",
      organizationId: "org-1",
      userId: "user-1",
      role: "admin",
      supabase,
    });

    await expect(saveLeadImportSetting(validSettingForm())).resolves.toBe("setting-1");

    expect(supabase.from).toHaveBeenCalledWith("lead_import_settings");
    expect(update.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(update.eq).toHaveBeenCalledWith("id", "setting-1");
    expect(update.is).toHaveBeenCalledWith("deleted_at", null);
    expect(update.select).toHaveBeenCalledWith("id");
    expect(update.single).toHaveBeenCalled();
  });

  it("does not treat missing Supabase import setting updates as saved", async () => {
    const update = updateReturning(null, { message: "No rows returned" });
    const supabase = {
      from: vi.fn(() => update),
    };
    mocks.getCrmContext.mockResolvedValue({
      mode: "supabase",
      organizationId: "org-1",
      userId: "user-1",
      role: "admin",
      supabase,
    });

    await expect(saveLeadImportSetting(validSettingForm("missing-setting"))).rejects.toThrow("No rows returned");

    expect(update.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(update.eq).toHaveBeenCalledWith("id", "missing-setting");
    expect(update.single).toHaveBeenCalled();
  });

  it("does not treat missing demo import setting updates as saved", async () => {
    mocks.getCrmContext.mockResolvedValue({
      mode: "demo",
      organizationId: "demo-org",
      userId: "demo-user",
      role: "admin",
    });

    await expect(saveLeadImportSetting(validSettingForm("missing-demo-setting"))).rejects.toThrow("見つかりません");
  });
});

function selectQuery(data: Array<Record<string, unknown>>) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => Promise.resolve({ data, error: null })),
  };
  return builder;
}

function insertReturning(data: Record<string, unknown>) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data, error: null })),
  };
  return builder;
}

function insertOnly() {
  return {
    insert: vi.fn(() => Promise.resolve({ error: null })),
  };
}

function updateQuery() {
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data: { id: "updated-row" }, error: null })),
  };
  return builder;
}

function updateReturning(data: Record<string, unknown> | null, error: { message: string } | null = null) {
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data, error })),
  };
  return builder;
}

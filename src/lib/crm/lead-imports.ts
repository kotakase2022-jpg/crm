import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertCanWriteTable, canWriteTable } from "./access";
import { parseCsv } from "./csv";
import { getCrmContext } from "./data";
import { addDemoRow, getDemoRows, newDemoId, nowIso, updateDemoRow } from "./demo-data";
import { localDateString } from "./format";
import {
  assertTrustedSpreadsheetCsvUrl,
  defaultLeadImportStatus,
  importSourceId,
  importSourceIdSet,
  normalizeLeadImportRow,
  recentLeadImportRuns,
  safeLeadImportStatus,
  spreadsheetUrlToCsvUrl,
} from "./lead-import-utils";
import { priorities, taskStatuses } from "./options";
import { prepareRecordForPersistence } from "./persistence";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CrmRecord } from "./types";

export { defaultLeadImportStatus, safeLeadImportStatus } from "./lead-import-utils";

type CrmContext = Awaited<ReturnType<typeof getCrmContext>>;

export type LeadImportView = {
  settings: CrmRecord[];
  runs: CrmRecord[];
  canManage: boolean;
  mode: "demo" | "supabase";
};

export class LeadImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadImportValidationError";
  }
}

type ImportResult = {
  settingId: string;
  status: "success" | "failed";
  importedCount: number;
  skippedCount: number;
  message: string;
};

function valueAsString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function fetchCsv(rawUrl: string) {
  let csvUrl = spreadsheetUrlToCsvUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
      const response = await fetch(csvUrl, {
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error("CSV fetch redirect did not include a location header.");
        }
        csvUrl = assertTrustedSpreadsheetCsvUrl(new URL(location, csvUrl).toString());
        continue;
      }

      if (!response.ok) {
        throw new Error(`CSV fetch failed with HTTP ${response.status}`);
      }

      return await response.text();
    }

    throw new Error("CSV fetch exceeded the redirect limit.");
  } finally {
    clearTimeout(timeout);
  }
}

function settingDefaults(setting: CrmRecord) {
  return {
    id: String(setting.id),
    defaultStatus: safeLeadImportStatus(valueAsString(setting.default_status) || defaultLeadImportStatus),
    spreadsheetUrl: valueAsString(setting.spreadsheet_url),
  };
}

async function createRunInDemo(setting: CrmRecord) {
  const timestamp = nowIso();
  const run = {
    id: newDemoId("lead-import-run"),
    organization_id: setting.organization_id,
    setting_id: setting.id,
    status: "running",
    imported_count: 0,
    skipped_count: 0,
    started_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
    created_by: "demo-user",
    updated_by: "demo-user",
  };
  addDemoRow("lead_import_runs", run);
  return run.id;
}

async function createRunInSupabase(supabase: SupabaseClient, setting: CrmRecord, userId: string | null) {
  const { data, error } = await supabase
    .from("lead_import_runs")
    .insert({
      organization_id: setting.organization_id,
      setting_id: setting.id,
      status: "running",
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return String(data.id);
}

async function updateRunInSupabase(supabase: SupabaseClient, organizationId: unknown, runId: string, values: Record<string, unknown>) {
  const { error } = await supabase
    .from("lead_import_runs")
    .update(values)
    .eq("organization_id", organizationId)
    .eq("id", runId)
    .is("deleted_at", null)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}

async function updateSettingInSupabase(supabase: SupabaseClient, organizationId: unknown, settingId: string, values: Record<string, unknown>) {
  const { error } = await supabase
    .from("lead_import_settings")
    .update(values)
    .eq("organization_id", organizationId)
    .eq("id", settingId)
    .is("deleted_at", null)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}

async function existingSourceIdsInSupabase(supabase: SupabaseClient, setting: CrmRecord) {
  const { data, error } = await supabase
    .from("leads")
    .select("external_source_id")
    .eq("organization_id", setting.organization_id)
    .eq("import_setting_id", setting.id)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return importSourceIdSet((data ?? []) as Array<Record<string, unknown>>);
}

function leadFirstCallTask(leadId: string) {
  return {
    title: "初回架電",
    description: "スプレッドシート取込後の自動タスクです。",
    status: taskStatuses[0],
    priority: priorities[2],
    due_date: localDateString(),
    lead_id: leadId,
    automation_key: `lead-first-call-${leadId}`,
  };
}

async function insertLeadInSupabase(supabase: SupabaseClient, setting: CrmRecord, userId: string | null, values: Record<string, unknown>, sourceId: string) {
  const payload = prepareRecordForPersistence("leads", {
    ...values,
    import_setting_id: setting.id,
    external_source: "spreadsheet",
    external_source_id: sourceId,
    imported_at: nowIso(),
  });

  const { data, error } = await supabase
    .from("leads")
    .insert({
      organization_id: setting.organization_id,
      created_by: userId,
      updated_by: userId,
      ...payload,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  const leadId = String(data.id);

  const { error: taskError } = await supabase.from("tasks").insert({
    organization_id: setting.organization_id,
    created_by: userId,
    updated_by: userId,
    ...leadFirstCallTask(leadId),
  });

  if (taskError) throw new Error(taskError.message);
}

async function importWithPersistence({
  setting,
  createRun,
  updateRun,
  updateSetting,
  existingSourceIds,
  insertLead,
}: {
  setting: CrmRecord;
  createRun: () => Promise<string>;
  updateRun: (runId: string, values: Record<string, unknown>) => Promise<void>;
  updateSetting: (settingId: string, values: Record<string, unknown>) => Promise<void>;
  existingSourceIds: () => Promise<Set<string>>;
  insertLead: (values: Record<string, unknown>, sourceId: string) => Promise<void>;
}): Promise<ImportResult> {
  const settingInfo = settingDefaults(setting);
  const runId = await createRun();
  let importedCount = 0;
  let skippedCount = 0;

  try {
    const csvText = await fetchCsv(settingInfo.spreadsheetUrl);
    const parsed = parseCsv(csvText);
    const knownSourceIds = await existingSourceIds();

    for (const row of parsed.rows) {
      let values: Record<string, unknown>;
      let sourceId: string;

      try {
        values = normalizeLeadImportRow(row, settingInfo.defaultStatus);
        sourceId = importSourceId(values);
      } catch {
        skippedCount += 1;
        continue;
      }

      if (knownSourceIds.has(sourceId)) {
        skippedCount += 1;
        continue;
      }

      await insertLead(values, sourceId);
      knownSourceIds.add(sourceId);
      importedCount += 1;
    }

    const message = `${importedCount}件を取り込み、${skippedCount}件をスキップしました。`;
    const finishedAt = nowIso();
    await updateRun(runId, {
      status: "success",
      imported_count: importedCount,
      skipped_count: skippedCount,
      finished_at: finishedAt,
    });
    await updateSetting(settingInfo.id, {
      last_imported_at: finishedAt,
      last_run_status: "success",
      last_run_message: message,
    });

    return {
      settingId: settingInfo.id,
      status: "success",
      importedCount,
      skippedCount,
      message,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown import error";
    const finishedAt = nowIso();
    await updateRun(runId, {
      status: "failed",
      imported_count: importedCount,
      skipped_count: skippedCount,
      error_message: message,
      finished_at: finishedAt,
    });
    await updateSetting(settingInfo.id, {
      last_run_status: "failed",
      last_run_message: message,
    });

    return {
      settingId: settingInfo.id,
      status: "failed",
      importedCount,
      skippedCount,
      message,
    };
  }
}

async function importDemoSetting(setting: CrmRecord) {
  const existingSourceIds = importSourceIdSet(getDemoRows("leads").filter((lead) => lead.import_setting_id === setting.id));

  return importWithPersistence({
    setting,
    createRun: () => createRunInDemo(setting),
    updateRun: async (runId, values) => {
      updateDemoRow("lead_import_runs", runId, values);
    },
    updateSetting: async (settingId, values) => {
      updateDemoRow("lead_import_settings", settingId, values);
    },
    existingSourceIds: async () => existingSourceIds,
    insertLead: async (values, sourceId) => {
      const timestamp = nowIso();
      const leadId = newDemoId("lead");
      addDemoRow("leads", {
        id: leadId,
        organization_id: setting.organization_id,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: "demo-user",
        updated_by: "demo-user",
        ...values,
        import_setting_id: setting.id,
        external_source: "spreadsheet",
        external_source_id: sourceId,
        imported_at: timestamp,
      });
      addDemoRow("tasks", {
        id: newDemoId("task"),
        organization_id: setting.organization_id,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: "demo-user",
        updated_by: "demo-user",
        ...leadFirstCallTask(leadId),
      });
    },
  });
}

async function importSupabaseSetting(supabase: SupabaseClient, setting: CrmRecord, userId: string | null) {
  return importWithPersistence({
    setting,
    createRun: () => createRunInSupabase(supabase, setting, userId),
    updateRun: (runId, values) => updateRunInSupabase(supabase, setting.organization_id, runId, values),
    updateSetting: (settingId, values) => updateSettingInSupabase(supabase, setting.organization_id, settingId, values),
    existingSourceIds: () => existingSourceIdsInSupabase(supabase, setting),
    insertLead: (values, sourceId) => insertLeadInSupabase(supabase, setting, userId, values, sourceId),
  });
}

export async function getLeadImportView(): Promise<LeadImportView> {
  const ctx = await getCrmContext();
  const canManage = canWriteTable(ctx.role, "lead_import_settings");

  if (ctx.mode === "demo") {
    return {
      settings: getDemoRows("lead_import_settings"),
      runs: recentLeadImportRuns(getDemoRows("lead_import_runs")),
      canManage,
      mode: "demo",
    };
  }

  const [settingsResponse, runsResponse] = await Promise.all([
    ctx.supabase
      .from("lead_import_settings")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    ctx.supabase
      .from("lead_import_runs")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("deleted_at", null)
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  if (settingsResponse.error) throw new Error(settingsResponse.error.message);
  if (runsResponse.error) throw new Error(runsResponse.error.message);

  return {
    settings: (settingsResponse.data ?? []) as CrmRecord[],
    runs: (runsResponse.data ?? []) as CrmRecord[],
    canManage,
    mode: "supabase",
  };
}

function parseSettingForm(formData: FormData) {
  const rawUrl = valueAsString(formData.get("spreadsheet_url"));
  if (!rawUrl) {
    throw new LeadImportValidationError("スプレッドシートURLは必須です。");
  }

  try {
    spreadsheetUrlToCsvUrl(rawUrl);
  } catch {
    throw new LeadImportValidationError("Googleスプレッドシートの共有URLまたは公開CSV URLを入力してください。");
  }

  const defaultStatus = safeLeadImportStatus(valueAsString(formData.get("default_status")) || defaultLeadImportStatus);
  return {
    id: valueAsString(formData.get("id")),
    name: valueAsString(formData.get("name")) || "広告スプレッドシート",
    spreadsheet_url: rawUrl,
    default_status: defaultStatus,
    enabled: formData.get("enabled") === "on",
  };
}

export async function saveLeadImportSetting(formData: FormData) {
  const ctx = await getCrmContext();
  assertCanWriteTable(ctx.role, "lead_import_settings");
  const values = parseSettingForm(formData);

  if (ctx.mode === "demo") {
    if (values.id) {
      const updated = updateDemoRow("lead_import_settings", values.id, {
        ...values,
        updated_by: ctx.userId,
      });
      if (!updated) throw new Error("取込設定が見つかりません。");
      return values.id;
    }

    const { id: omittedId, ...insertValues } = values;
    void omittedId;
    const timestamp = nowIso();
    const record = {
      id: newDemoId("lead-import-setting"),
      organization_id: ctx.organizationId,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: ctx.userId,
      updated_by: ctx.userId,
      ...insertValues,
    };
    addDemoRow("lead_import_settings", record);
    return record.id;
  }

  if (values.id) {
    const { error } = await ctx.supabase
      .from("lead_import_settings")
      .update({
        name: values.name,
        spreadsheet_url: values.spreadsheet_url,
        default_status: values.default_status,
        enabled: values.enabled,
        updated_by: ctx.userId,
      })
      .eq("organization_id", ctx.organizationId)
      .eq("id", values.id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return values.id;
  }

  const { data, error } = await ctx.supabase
    .from("lead_import_settings")
    .insert({
      organization_id: ctx.organizationId,
      name: values.name,
      spreadsheet_url: values.spreadsheet_url,
      default_status: values.default_status,
      enabled: values.enabled,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return String(data.id);
}

export async function runLeadImportSetting(settingId: string) {
  const ctx = await getCrmContext();
  assertCanWriteTable(ctx.role, "lead_import_runs");

  const setting =
    ctx.mode === "demo"
      ? getDemoRows("lead_import_settings").find((row) => row.id === settingId)
      : await readSupabaseSetting(ctx, settingId);

  if (!setting) {
    throw new Error("取込設定が見つかりません。");
  }

  if (ctx.mode === "demo") return importDemoSetting(setting);
  return importSupabaseSetting(ctx.supabase, setting, ctx.userId);
}

async function readSupabaseSetting(ctx: Extract<CrmContext, { mode: "supabase" }>, settingId: string) {
  const { data, error } = await ctx.supabase
    .from("lead_import_settings")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .eq("id", settingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as CrmRecord | null;
}

export async function runAllLeadImportsFromCron() {
  const supabase = createAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin environment variables are missing.");
  }

  const { data, error } = await supabase
    .from("lead_import_settings")
    .select("*")
    .eq("enabled", true)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const results: ImportResult[] = [];
  for (const setting of (data ?? []) as CrmRecord[]) {
    results.push(await importSupabaseSetting(supabase, setting, null));
  }

  return results;
}

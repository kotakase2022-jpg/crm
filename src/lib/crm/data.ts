import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { buildAlerts } from "./alerts";
import { assertCanWriteTable } from "./access";
import { addDemoRow, demoStore, getDemoRows, newDemoId, nowIso, updateDemoRow } from "./demo-data";
import { entityConfigs } from "./entities";
import { daysUntil, recordTitle } from "./format";
import { prepareRecordForPersistence, withComputedAmounts } from "./persistence";
import type { CrmRecord, DashboardSnapshot, EntityConfig, EntitySlug, QueryState, RelationKey, RelationOptions, TableName } from "./types";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

type CrmContext =
  | {
      mode: "demo";
      organizationId: string;
      userId: string;
      role: string;
      supabase: null;
    }
  | {
      mode: "supabase";
      organizationId: string;
      userId: string;
      role: string;
      supabase: SupabaseClient;
    };

export type RelatedSection = {
  title: string;
  entity?: EntitySlug;
  rows: CrmRecord[];
};

const relationTableByKey: Record<RelationKey, TableName> = {
  companies: "companies",
  contacts: "contacts",
  leads: "leads",
  deals: "deals",
  tickets: "support_tickets",
};

function assertCanWrite(ctx: CrmContext, table: TableName) {
  assertCanWriteTable(ctx.role, table);
}

function isMissingAuthPath(pathname = "/dashboard") {
  return `/login?next=${encodeURIComponent(pathname)}`;
}

export async function getCrmContext(options: { allowAnonymous?: boolean; pathname?: string } = {}): Promise<CrmContext> {
  const env = getSupabaseEnv();

  if (!env.configured) {
    return {
      mode: "demo",
      organizationId: "demo-org",
      userId: "demo-user",
      role: "admin",
      supabase: null,
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      mode: "demo",
      organizationId: "demo-org",
      userId: "demo-user",
      role: "admin",
      supabase: null,
    };
  }

  const claimsResponse = await supabase.auth.getClaims();
  let userId = claimsResponse.data?.claims?.sub;

  if (!userId) {
    const userResponse = await supabase.auth.getUser();
    userId = userResponse.data.user?.id;
  }

  if (!userId) {
    if (options.allowAnonymous) {
      redirect("/login");
    }

    redirect(isMissingAuthPath(options.pathname));
  }

  const profileResponse = await supabase.rpc("ensure_user_profile", {
    default_org_name: "建設帳票CRM",
  });

  if (profileResponse.error) {
    throw new Error(profileResponse.error.message);
  }

  const profileRow = Array.isArray(profileResponse.data) ? profileResponse.data[0] : profileResponse.data;

  return {
    mode: "supabase",
    organizationId: String(profileRow.organization_id),
    userId,
    role: String(profileRow.role ?? "admin"),
    supabase,
  };
}

function matchesSearch(row: CrmRecord, config: EntityConfig, q?: string) {
  if (!q) return true;
  const lowered = q.toLowerCase();

  return config.searchFields.some((field) => {
    const value = row[field];
    if (Array.isArray(value)) return value.join(" ").toLowerCase().includes(lowered);
    return String(value ?? "").toLowerCase().includes(lowered);
  });
}

function matchesFilter(row: CrmRecord, config: EntityConfig, filter?: string, view?: string) {
  if (filter && config.filterField && String(row[config.filterField] ?? "") !== filter) return false;

  if (config.slug === "tasks") {
    if (view === "today") return row.status !== "完了" && row.due_date === new Date().toISOString().slice(0, 10);
    if (view === "overdue") {
      const due = daysUntil(row.due_date);
      return row.status !== "完了" && due !== null && due < 0;
    }
  }

  return true;
}

function compareValues(a: unknown, b: unknown, direction: "asc" | "desc") {
  const directionValue = direction === "asc" ? 1 : -1;
  const aValue = a ?? "";
  const bValue = b ?? "";

  if (typeof aValue === "number" && typeof bValue === "number") {
    return (aValue - bValue) * directionValue;
  }

  return String(aValue).localeCompare(String(bValue), "ja") * directionValue;
}

function filterSortRows(rows: CrmRecord[], config: EntityConfig, query: QueryState) {
  const sort = query.sort && config.sortFields.includes(query.sort) ? query.sort : config.sortFields[0] ?? "updated_at";
  const direction = query.direction ?? "desc";

  return rows
    .filter((row) => matchesSearch(row, config, query.q))
    .filter((row) => matchesFilter(row, config, query.filter, query.view))
    .sort((a, b) => compareValues(a[sort], b[sort], direction));
}

async function readRows(ctx: CrmContext, table: TableName) {
  if (ctx.mode === "demo") {
    return getDemoRows(table);
  }

  const { data, error } = await ctx.supabase
    .from(table)
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .is("deleted_at", null)
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CrmRecord[];
}

async function insertRow(ctx: CrmContext, table: TableName, values: Record<string, unknown>) {
  assertCanWrite(ctx, table);

  if (ctx.mode === "demo") {
    const timestamp = nowIso();
    const record: CrmRecord = withComputedAmounts(table, {
      id: newDemoId(table),
      organization_id: ctx.organizationId,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: ctx.userId,
      updated_by: ctx.userId,
      ...values,
    }) as CrmRecord;

    addDemoRow(table, record);
    return record;
  }

  const persistedValues = prepareRecordForPersistence(table, values);
  const { data, error } = await ctx.supabase
    .from(table)
    .insert({
      organization_id: ctx.organizationId,
      created_by: ctx.userId,
      updated_by: ctx.userId,
      ...persistedValues,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CrmRecord;
}

async function updateRow(ctx: CrmContext, table: TableName, idValue: string, values: Record<string, unknown>) {
  assertCanWrite(ctx, table);

  if (ctx.mode === "demo") {
    const updated = updateDemoRow(table, idValue, withComputedAmounts(table, {
      ...values,
      updated_by: ctx.userId,
    }));

    if (!updated) throw new Error("対象レコードが見つかりません。");

    if (table === "deals" && values.stage) {
      addDemoRow("deal_stage_history", {
        id: newDemoId("stage-history"),
        organization_id: ctx.organizationId,
        deal_id: idValue,
        from_stage: null,
        to_stage: values.stage,
        changed_at: nowIso(),
        changed_by: ctx.userId,
        created_at: nowIso(),
        updated_at: nowIso(),
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });
    }

    return updated;
  }

  const persistedValues = prepareRecordForPersistence(table, values);
  const { data, error } = await ctx.supabase
    .from(table)
    .update({
      ...persistedValues,
      updated_by: ctx.userId,
    })
    .eq("organization_id", ctx.organizationId)
    .eq("id", idValue)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as CrmRecord;
}

export async function listRecords(config: EntityConfig, query: QueryState = {}) {
  const ctx = await getCrmContext();
  const rows = await readRows(ctx, config.table);
  return filterSortRows(rows, config, query);
}

export async function getRecord(config: EntityConfig, idValue: string) {
  const ctx = await getCrmContext();

  if (ctx.mode === "demo") {
    return getDemoRows(config.table).find((row) => row.id === idValue) ?? null;
  }

  const { data, error } = await ctx.supabase
    .from(config.table)
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .eq("id", idValue)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as CrmRecord | null;
}

export async function createRecord(config: EntityConfig, values: Record<string, unknown>) {
  const ctx = await getCrmContext();
  const record = await insertRow(ctx, config.table, values);

  if (config.slug === "leads") {
    await insertRow(ctx, "tasks", {
      title: "初回架電",
      description: "新規リード登録後の自動タスクです。",
      status: "未完了",
      priority: "高",
      due_date: new Date().toISOString().slice(0, 10),
      lead_id: record.id,
      automation_key: `lead-first-call-${record.id}`,
    });
  }

  return record;
}

export async function updateRecord(config: EntityConfig, idValue: string, values: Record<string, unknown>) {
  const ctx = await getCrmContext();
  const record = await updateRow(ctx, config.table, idValue, values);

  if (config.slug === "deals" && values.stage === "デモ実施") {
    await ensureTask(ctx, {
      automation_key: `demo-follow-up-${idValue}`,
      title: "デモ後フォロー",
      description: "デモ実施翌日のフォロータスクです。",
      status: "未完了",
      priority: "中",
      due_date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
      deal_id: idValue,
      company_id: typeof record.company_id === "string" ? record.company_id : null,
    });
  }

  return record;
}

export async function softDeleteRecord(config: EntityConfig, idValue: string) {
  const ctx = await getCrmContext();
  return updateRow(ctx, config.table, idValue, {
    deleted_at: nowIso(),
  });
}

export async function completeTask(idValue: string) {
  const config = entityConfigs.tasks;
  return updateRecord(config, idValue, {
    status: "完了",
    completed_at: nowIso(),
  });
}

export async function reopenTask(idValue: string) {
  const config = entityConfigs.tasks;
  return updateRecord(config, idValue, {
    status: "未完了",
    completed_at: null,
  });
}

export async function createActivity(values: Record<string, unknown>) {
  const ctx = await getCrmContext();
  return insertRow(ctx, "activities", {
    type: "メモ",
    occurred_at: nowIso(),
    has_next_action: false,
    ...values,
  });
}

async function ensureTask(ctx: CrmContext, task: Record<string, unknown>) {
  const existing = await readRows(ctx, "tasks");
  const key = String(task.automation_key ?? "");
  if (key && existing.some((row) => row.automation_key === key && !row.deleted_at)) {
    return null;
  }

  return insertRow(ctx, "tasks", task);
}

export async function convertLead(idValue: string) {
  const ctx = await getCrmContext();
  const leadConfig = entityConfigs.leads;
  const lead =
    ctx.mode === "demo"
      ? getDemoRows("leads").find((row) => row.id === idValue)
      : await getRecord(leadConfig, idValue);

  if (!lead) {
    throw new Error("リードが見つかりません。");
  }

  if (lead.converted_deal_id) {
    return String(lead.converted_deal_id);
  }

  const company = await insertRow(ctx, "companies", {
    name: lead.company_name ?? lead.name,
    status: "prospect",
    industry: lead.industry,
    company_size: lead.company_size,
    monthly_projects: lead.monthly_projects,
    monthly_documents: lead.monthly_documents,
    main_customer_type: lead.main_customer_type,
    current_document_method: lead.current_document_method,
    accounting_software: lead.accounting_software,
    primary_device: lead.primary_device,
    it_literacy: lead.it_literacy,
    decision_maker_type: lead.decision_maker_type,
    phone: lead.phone,
    next_action_date: lead.next_action_date,
    notes: lead.notes,
  });

  const contact = await insertRow(ctx, "contacts", {
    company_id: company.id,
    name: lead.contact_name ?? "担当者未設定",
    role: lead.decision_maker_type === "社長" ? "社長" : "その他",
    email: lead.email,
    phone: lead.phone,
    notes: "リード変換時に自動作成。",
  });

  const deal = await insertRow(ctx, "deals", {
    company_id: company.id,
    contact_id: contact.id,
    lead_id: lead.id,
    name: `${company.name} 帳票管理導入`,
    stage: "初回接触",
    expected_plan: "スタンダード",
    expected_mrr: 0,
    probability: 20,
    expected_contract_date: null,
    next_action_date: lead.next_action_date,
    notes: "リードから自動変換された商談です。",
  });

  await updateRow(ctx, "leads", idValue, {
    status: "商談化",
    converted_company_id: company.id,
    converted_contact_id: contact.id,
    converted_deal_id: deal.id,
  });

  await insertRow(ctx, "activities", {
    type: "メモ",
    subject: "リードを会社・担当者・商談へ変換",
    content: "リード変換により営業管理を商談へ移行しました。",
    occurred_at: nowIso(),
    lead_id: lead.id,
    company_id: company.id,
    contact_id: contact.id,
    deal_id: deal.id,
  });

  await ensureTask(ctx, {
    automation_key: `converted-demo-schedule-${deal.id}`,
    title: "デモ日程確認",
    description: "リード商談化後の次アクションです。",
    status: "未完了",
    priority: "中",
    due_date: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    lead_id: lead.id,
    company_id: company.id,
    deal_id: deal.id,
  });

  return String(deal.id);
}

export async function getRelationOptions(): Promise<RelationOptions> {
  const ctx = await getCrmContext();
  const entries = await Promise.all(
    (Object.keys(relationTableByKey) as RelationKey[]).map(async (key) => {
      const rows = await readRows(ctx, relationTableByKey[key]);
      return [
        key,
        rows.map((row) => ({
          value: String(row.id),
          label: relationLabel(key, row),
        })),
      ] as const;
    }),
  );

  return Object.fromEntries(entries);
}

function relationLabel(key: RelationKey, row: CrmRecord) {
  if (key === "companies") return String(row.name ?? row.id);
  if (key === "contacts") return String(row.name ?? row.email ?? row.id);
  if (key === "leads") return String(row.company_name ?? row.name ?? row.id);
  if (key === "deals") return String(row.name ?? row.id);
  return String(row.title ?? row.id);
}

export async function getRelatedSections(entity: EntitySlug, idValue: string): Promise<RelatedSection[]> {
  const ctx = await getCrmContext();
  const [contacts, deals, activities, tasks, trials, contracts, usage, tickets, healthScores, billing, stageHistory] = await Promise.all([
    readRows(ctx, "contacts"),
    readRows(ctx, "deals"),
    readRows(ctx, "activities"),
    readRows(ctx, "tasks"),
    readRows(ctx, "trials"),
    readRows(ctx, "subscriptions"),
    readRows(ctx, "product_usage"),
    readRows(ctx, "support_tickets"),
    readRows(ctx, "health_scores"),
    readRows(ctx, "billing_records"),
    readRows(ctx, "deal_stage_history"),
  ]);

  if (entity === "companies") {
    return [
      { title: "担当者", entity: "contacts", rows: contacts.filter((row) => row.company_id === idValue) },
      { title: "商談", entity: "deals", rows: deals.filter((row) => row.company_id === idValue) },
      { title: "タスク", entity: "tasks", rows: tasks.filter((row) => row.company_id === idValue) },
      { title: "トライアル", entity: "trials", rows: trials.filter((row) => row.company_id === idValue) },
      { title: "契約情報", entity: "contracts", rows: contracts.filter((row) => row.company_id === idValue) },
      { title: "利用状況", rows: usage.filter((row) => row.company_id === idValue) },
      { title: "問い合わせ/チケット", entity: "tickets", rows: tickets.filter((row) => row.company_id === idValue) },
      { title: "ヘルススコア", rows: healthScores.filter((row) => row.company_id === idValue) },
      { title: "活動履歴", rows: activities.filter((row) => row.company_id === idValue) },
    ];
  }

  if (entity === "leads") {
    return [
      { title: "商談", entity: "deals", rows: deals.filter((row) => row.lead_id === idValue) },
      { title: "タスク", entity: "tasks", rows: tasks.filter((row) => row.lead_id === idValue) },
      { title: "活動履歴", rows: activities.filter((row) => row.lead_id === idValue) },
    ];
  }

  if (entity === "contacts") {
    return [
      { title: "商談", entity: "deals", rows: deals.filter((row) => row.contact_id === idValue) },
      { title: "タスク", entity: "tasks", rows: tasks.filter((row) => row.contact_id === idValue) },
      { title: "問い合わせ/チケット", entity: "tickets", rows: tickets.filter((row) => row.contact_id === idValue) },
      { title: "活動履歴", rows: activities.filter((row) => row.contact_id === idValue) },
    ];
  }

  if (entity === "deals") {
    return [
      { title: "タスク", entity: "tasks", rows: tasks.filter((row) => row.deal_id === idValue) },
      { title: "トライアル", entity: "trials", rows: trials.filter((row) => row.deal_id === idValue) },
      { title: "ステージ履歴", rows: stageHistory.filter((row) => row.deal_id === idValue) },
      { title: "活動履歴", rows: activities.filter((row) => row.deal_id === idValue) },
    ];
  }

  if (entity === "tasks") {
    return [{ title: "関連活動", rows: activities.filter((row) => row.lead_id === idValue || row.company_id === idValue || row.deal_id === idValue) }];
  }

  if (entity === "trials") {
    return [{ title: "利用状況", rows: usage.filter((row) => row.trial_id === idValue) }];
  }

  if (entity === "contracts") {
    return [
      { title: "利用状況", rows: usage.filter((row) => row.subscription_id === idValue) },
      { title: "請求履歴", rows: billing.filter((row) => row.subscription_id === idValue) },
    ];
  }

  return [{ title: "関連タスク", entity: "tasks", rows: tasks.filter((row) => row.support_ticket_id === idValue) }];
}

export async function getSnapshot(): Promise<DashboardSnapshot> {
  const ctx = await getCrmContext();
  const [leads, companies, contacts, deals, tasks, trials, contracts, tickets, usage, healthScores, activities] = await Promise.all([
    readRows(ctx, "leads"),
    readRows(ctx, "companies"),
    readRows(ctx, "contacts"),
    readRows(ctx, "deals"),
    readRows(ctx, "tasks"),
    readRows(ctx, "trials"),
    readRows(ctx, "subscriptions"),
    readRows(ctx, "support_tickets"),
    readRows(ctx, "product_usage"),
    readRows(ctx, "health_scores"),
    readRows(ctx, "activities"),
  ]);

  return {
    leads,
    companies,
    contacts,
    deals,
    tasks,
    trials,
    contracts,
    tickets,
    usage,
    healthScores,
    activities,
  };
}

export async function generateAutomationTasks() {
  const ctx = await getCrmContext();
  const snapshot = await getSnapshot();
  const alerts = buildAlerts(snapshot);
  let created = 0;

  for (const alert of alerts) {
    if (!alert.taskTitle) continue;
    const task = await ensureTask(ctx, {
      automation_key: alert.key,
      title: alert.taskTitle,
      description: alert.description,
      status: "未完了",
      priority: alert.priority ?? "中",
      due_date: alert.dueDate ?? new Date().toISOString().slice(0, 10),
      lead_id: alert.lead_id ?? null,
      company_id: alert.company_id ?? null,
      deal_id: alert.deal_id ?? null,
      support_ticket_id: alert.support_ticket_id ?? null,
    });

    if (task) created += 1;
  }

  return created;
}

export function getEntityHref(entity: EntitySlug, record: CrmRecord) {
  return `/${entity}/${record.id}`;
}

export function getRecordTitleForEntity(record: CrmRecord) {
  return recordTitle(record);
}

export function getDemoCounts() {
  return Object.fromEntries(Object.entries(demoStore).map(([table, rows]) => [table, rows.length]));
}

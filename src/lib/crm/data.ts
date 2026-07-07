import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { buildNextActionTaskFromActivity } from "./activity-next-action";
import { buildAlerts } from "./alerts";
import { hasOpenAutomationTask } from "./automation";
import { assertCanWriteTable } from "./access";
import { addDemoRow, demoStore, getDemoRows, newDemoId, nowIso, updateDemoRow } from "./demo-data";
import { entityConfigs } from "./entities";
import { localDateString, offsetLocalDateString, recordTitle, relationOptionLabel } from "./format";
import { prepareRecordForPersistence, withComputedAmounts } from "./persistence";
import {
  activityRelationForEntity,
  completeRelationValues,
  hasRelationConsistencyValue,
  isActivityParentEntity,
  mergeRelationConsistencyValues,
  relatedActivitiesForTask,
  relatedRows,
  relationConsistencyErrors,
  relationIdValue,
  touchesRelationConsistencyField,
} from "./related";
import { filterSortRows } from "./search";
import type { CrmRecord, DashboardSnapshot, EntityConfig, EntitySlug, QueryState, RelationKey, RelationOptions, TableName } from "./types";
import { CrmValidationError } from "./validation";
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
  trials: "trials",
  contracts: "subscriptions",
};

const relationFieldsByTable: Partial<Record<TableName, readonly string[]>> = {
  contacts: ["company_id"],
  deals: ["lead_id", "company_id", "contact_id"],
  activities: ["lead_id", "company_id", "contact_id", "deal_id"],
  tasks: ["lead_id", "company_id", "contact_id", "deal_id", "support_ticket_id"],
  trials: ["company_id", "deal_id"],
  subscriptions: ["company_id"],
  product_usage: ["company_id", "subscription_id", "trial_id"],
  support_tickets: ["company_id", "contact_id"],
  health_scores: ["company_id"],
  billing_records: ["company_id", "subscription_id"],
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

async function readRows(ctx: CrmContext, table: TableName) {
  if (ctx.mode === "demo") {
    return getDemoRows(table);
  }

  const pageSize = 1000;
  const rows: CrmRecord[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await ctx.supabase
      .from(table)
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...((data ?? []) as CrmRecord[]));

    if (!data || data.length < pageSize) {
      return rows;
    }
  }
}

async function readRowById(ctx: CrmContext, table: TableName, idValue: string) {
  if (ctx.mode === "demo") {
    return getDemoRows(table).find((row) => row.id === idValue) ?? null;
  }

  const { data, error } = await ctx.supabase
    .from(table)
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

async function readRelationRow(ctx: CrmContext, values: Record<string, unknown>, field: string, table: TableName) {
  const idValue = relationIdValue(values[field]);
  return idValue ? readRowById(ctx, table, idValue) : null;
}

async function readRelationRows(ctx: CrmContext, values: Record<string, unknown>) {
  const [lead, company, contact, deal, ticket, subscription, trial] = await Promise.all([
    readRelationRow(ctx, values, "lead_id", "leads"),
    readRelationRow(ctx, values, "company_id", "companies"),
    readRelationRow(ctx, values, "contact_id", "contacts"),
    readRelationRow(ctx, values, "deal_id", "deals"),
    readRelationRow(ctx, values, "support_ticket_id", "support_tickets"),
    readRelationRow(ctx, values, "subscription_id", "subscriptions"),
    readRelationRow(ctx, values, "trial_id", "trials"),
  ]);

  return { lead, company, contact, deal, ticket, subscription, trial };
}

async function completeRelationsForTable(
  ctx: CrmContext,
  table: TableName,
  values: Record<string, unknown>,
  explicitValues: Record<string, unknown> = values,
) {
  const related = await readRelationRows(ctx, values);
  return completeRelationValues(values, related, {
    allowedFields: relationFieldsByTable[table],
    explicitValues,
  });
}

async function assertRelationConsistency(ctx: CrmContext, values: Record<string, unknown>) {
  if (!hasRelationConsistencyValue(values)) {
    return;
  }

  const errors = relationConsistencyErrors(values, await readRelationRows(ctx, values));

  if (errors.length > 0) {
    throw new CrmValidationError({ relation: errors.join("\n") });
  }
}

async function insertRow(ctx: CrmContext, table: TableName, values: Record<string, unknown>) {
  assertCanWrite(ctx, table);
  const completedValues = await completeRelationsForTable(ctx, table, values);
  await assertRelationConsistency(ctx, completedValues);

  if (ctx.mode === "demo") {
    const timestamp = nowIso();
    const record: CrmRecord = withComputedAmounts(table, {
      id: newDemoId(table),
      organization_id: ctx.organizationId,
      created_at: timestamp,
      updated_at: timestamp,
      created_by: ctx.userId,
      updated_by: ctx.userId,
      ...completedValues,
    }) as CrmRecord;

    addDemoRow(table, record);
    if (table === "deals" && typeof record.stage === "string" && record.stage) {
      addDemoRow("deal_stage_history", {
        id: newDemoId("stage-history"),
        organization_id: ctx.organizationId,
        deal_id: record.id,
        from_stage: null,
        to_stage: record.stage,
        changed_at: timestamp,
        changed_by: ctx.userId,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });
    }
    return record;
  }

  const persistedValues = prepareRecordForPersistence(table, completedValues);
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
  const needsExistingRecord = table === "deals" || touchesRelationConsistencyField(values);
  const previous = needsExistingRecord ? await readRowById(ctx, table, idValue) : null;

  if (touchesRelationConsistencyField(values)) {
    if (!previous) throw new Error("対象レコードが見つかりません。");
    const mergedValues = mergeRelationConsistencyValues(previous, values);
    const completedMergedValues = await completeRelationsForTable(ctx, table, mergedValues, values);
    await assertRelationConsistency(ctx, completedMergedValues);
    values = {
      ...values,
      ...Object.fromEntries(
        (relationFieldsByTable[table] ?? []).flatMap((field) =>
          completedMergedValues[field] !== previous[field] && completedMergedValues[field] !== undefined ? [[field, completedMergedValues[field]]] : [],
        ),
      ),
    };
  } else {
    await assertRelationConsistency(ctx, values);
  }

  if (ctx.mode === "demo") {
    const updated = updateDemoRow(table, idValue, withComputedAmounts(table, {
      ...values,
      updated_by: ctx.userId,
    }));

    if (!updated) throw new Error("対象レコードが見つかりません。");

    if (table === "deals" && typeof values.stage === "string" && previous?.stage !== values.stage) {
      const timestamp = nowIso();
      addDemoRow("deal_stage_history", {
        id: newDemoId("stage-history"),
        organization_id: ctx.organizationId,
        deal_id: idValue,
        from_stage: typeof previous?.stage === "string" ? previous.stage : null,
        to_stage: values.stage,
        changed_at: timestamp,
        changed_by: ctx.userId,
        created_at: timestamp,
        updated_at: timestamp,
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
  const relations = query.q ? await getRelationOptionsForContext(ctx) : {};
  return filterSortRows(rows, config, query, relations);
}

export async function getRecord(config: EntityConfig, idValue: string) {
  const ctx = await getCrmContext();
  return readRowById(ctx, config.table, idValue);
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
      due_date: localDateString(),
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
      due_date: offsetLocalDateString(1),
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
  const activity = await insertRow(ctx, "activities", {
    type: "メモ",
    occurred_at: nowIso(),
    has_next_action: false,
    ...values,
  });

  await createTaskForNextActionActivity(ctx, activity);
  return activity;
}

export async function createActivityForEntity(entity: EntitySlug, idValue: string, values: Record<string, unknown>) {
  if (!isActivityParentEntity(entity)) {
    throw new Error("活動履歴を追加できる画面ではありません。");
  }

  const config = entityConfigs[entity];
  const ctx = await getCrmContext();
  const record = await readRowById(ctx, config.table, idValue);

  if (!record) {
    throw new Error("活動を紐づける対象レコードが見つかりません。");
  }

  const activity = await insertRow(ctx, "activities", {
    type: "メモ",
    occurred_at: nowIso(),
    has_next_action: false,
    ...values,
    ...activityRelationForEntity(entity, record),
  });

  await createTaskForNextActionActivity(ctx, activity);
  return activity;
}

async function ensureTask(ctx: CrmContext, task: Record<string, unknown>) {
  const existing = await readRows(ctx, "tasks");
  const key = String(task.automation_key ?? "");
  if (key && hasOpenAutomationTask(existing, key)) {
    return null;
  }

  return insertRow(ctx, "tasks", task);
}

async function createTaskForNextActionActivity(ctx: CrmContext, activity: CrmRecord) {
  const task = buildNextActionTaskFromActivity(activity);
  if (!task) return null;
  return ensureTask(ctx, task);
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

  const convertedDealId = relationIdValue(lead.converted_deal_id);
  if (convertedDealId) {
    const convertedDeal = await readRowById(ctx, "deals", convertedDealId);
    if (convertedDeal) {
      return convertedDealId;
    }
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
    due_date: offsetLocalDateString(1),
    lead_id: lead.id,
    company_id: company.id,
    deal_id: deal.id,
  });

  return String(deal.id);
}

async function getRelationOptionsForContext(ctx: CrmContext): Promise<RelationOptions> {
  const entries = await Promise.all(
    (Object.keys(relationTableByKey) as RelationKey[]).map(async (key) => {
      const rows = await readRows(ctx, relationTableByKey[key]);
      return [
        key,
        rows.map((row) => ({
          value: String(row.id),
          label: relationOptionLabel(key, row),
        })),
      ] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function getRelationOptions(): Promise<RelationOptions> {
  const ctx = await getCrmContext();
  return getRelationOptionsForContext(ctx);
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
      { title: "担当者", entity: "contacts", rows: relatedRows(contacts, "company_id", idValue) },
      { title: "商談", entity: "deals", rows: relatedRows(deals, "company_id", idValue) },
      { title: "タスク", entity: "tasks", rows: relatedRows(tasks, "company_id", idValue) },
      { title: "トライアル", entity: "trials", rows: relatedRows(trials, "company_id", idValue) },
      { title: "契約情報", entity: "contracts", rows: relatedRows(contracts, "company_id", idValue) },
      { title: "利用状況", rows: relatedRows(usage, "company_id", idValue) },
      { title: "請求履歴", rows: relatedRows(billing, "company_id", idValue) },
      { title: "問い合わせ/チケット", entity: "tickets", rows: relatedRows(tickets, "company_id", idValue) },
      { title: "ヘルススコア", rows: relatedRows(healthScores, "company_id", idValue) },
      { title: "活動履歴", rows: relatedRows(activities, "company_id", idValue) },
    ];
  }

  if (entity === "leads") {
    return [
      { title: "商談", entity: "deals", rows: relatedRows(deals, "lead_id", idValue) },
      { title: "タスク", entity: "tasks", rows: relatedRows(tasks, "lead_id", idValue) },
      { title: "活動履歴", rows: relatedRows(activities, "lead_id", idValue) },
    ];
  }

  if (entity === "contacts") {
    return [
      { title: "商談", entity: "deals", rows: relatedRows(deals, "contact_id", idValue) },
      { title: "タスク", entity: "tasks", rows: relatedRows(tasks, "contact_id", idValue) },
      { title: "問い合わせ/チケット", entity: "tickets", rows: relatedRows(tickets, "contact_id", idValue) },
      { title: "活動履歴", rows: relatedRows(activities, "contact_id", idValue) },
    ];
  }

  if (entity === "deals") {
    return [
      { title: "タスク", entity: "tasks", rows: relatedRows(tasks, "deal_id", idValue) },
      { title: "トライアル", entity: "trials", rows: relatedRows(trials, "deal_id", idValue) },
      { title: "ステージ履歴", rows: relatedRows(stageHistory, "deal_id", idValue) },
      { title: "活動履歴", rows: relatedRows(activities, "deal_id", idValue) },
    ];
  }

  if (entity === "tasks") {
    const task = tasks.find((row) => row.id === idValue);
    return [{ title: "関連活動", rows: relatedActivitiesForTask(task, activities) }];
  }

  if (entity === "trials") {
    return [{ title: "利用状況", rows: relatedRows(usage, "trial_id", idValue) }];
  }

  if (entity === "contracts") {
    return [
      { title: "利用状況", rows: relatedRows(usage, "subscription_id", idValue) },
      { title: "請求履歴", rows: relatedRows(billing, "subscription_id", idValue) },
    ];
  }

  return [{ title: "関連タスク", entity: "tasks", rows: relatedRows(tasks, "support_ticket_id", idValue) }];
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
      due_date: alert.dueDate ?? localDateString(),
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

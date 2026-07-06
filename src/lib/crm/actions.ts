"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  completeTask,
  convertLead,
  createActivityForEntity,
  createRecord,
  generateAutomationTasks,
  reopenTask,
  softDeleteRecord,
  updateRecord,
} from "./data";
import { getEntityConfig } from "./entities";
import { LeadImportValidationError, runLeadImportSetting, saveLeadImportSetting } from "./lead-imports";
import { safeInternalRedirectPath } from "./navigation";
import { CrmValidationError, parseActivityFormValues, parseEntityFormValues } from "./validation";
import type { EntitySlug } from "./types";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const relationDetailEntities = {
  lead_id: "leads",
  company_id: "companies",
  contact_id: "contacts",
  deal_id: "deals",
  support_ticket_id: "tickets",
} as const satisfies Record<string, EntitySlug>;

function mustGetConfig(entity: EntitySlug | string) {
  const config = getEntityConfig(entity);
  if (!config) throw new Error("未対応の画面です。");
  return config;
}

function revalidateOperationalViews() {
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

function revalidateRelatedRecordViews(record: Record<string, unknown>) {
  for (const [field, entity] of Object.entries(relationDetailEntities)) {
    const id = record[field];
    if (typeof id === "string" && id) {
      revalidatePath(`/${entity}/${id}`);
    }
  }
}

export async function createEntityAction(entity: EntitySlug, formData: FormData) {
  const config = mustGetConfig(entity);
  let record: Awaited<ReturnType<typeof createRecord>> | null = null;
  let validationFailed = false;

  try {
    const values = parseEntityFormValues(config, formData);
    record = await createRecord(config, values);
  } catch (error) {
    if (error instanceof CrmValidationError) {
      validationFailed = true;
    } else {
      throw error;
    }
  }

  if (validationFailed) return redirect(`/${entity}/new?toast=validation-error`);
  if (!record) throw new Error("Create action did not return a record.");

  revalidatePath(`/${entity}`);
  revalidateRelatedRecordViews(record);
  revalidateOperationalViews();
  if (entity === "leads") revalidatePath("/tasks");
  redirect(`/${entity}/${record.id}?toast=created`);
}

export async function updateEntityAction(entity: EntitySlug, id: string, formData: FormData) {
  const config = mustGetConfig(entity);
  let record: Awaited<ReturnType<typeof updateRecord>> | null = null;
  let validationFailed = false;

  try {
    const values = parseEntityFormValues(config, formData);
    record = await updateRecord(config, id, values);
  } catch (error) {
    if (error instanceof CrmValidationError) {
      validationFailed = true;
    } else {
      throw error;
    }
  }

  if (validationFailed) return redirect(`/${entity}/${id}/edit?toast=validation-error`);
  if (!record) throw new Error("Update action did not return a record.");

  revalidatePath(`/${entity}`);
  revalidatePath(`/${entity}/${id}`);
  revalidateRelatedRecordViews(record);
  revalidateOperationalViews();
  if (entity === "deals") revalidatePath("/tasks");
  redirect(`/${entity}/${id}?toast=updated`);
}

export async function deleteEntityAction(entity: EntitySlug, id: string) {
  const config = mustGetConfig(entity);
  const record = await softDeleteRecord(config, id);

  revalidatePath(`/${entity}`);
  revalidateRelatedRecordViews(record);
  revalidateOperationalViews();
  redirect(`/${entity}?toast=deleted`);
}

export async function completeTaskAction(id: string) {
  const record = await completeTask(id);
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidateRelatedRecordViews(record);
  revalidateOperationalViews();
  redirect(`/tasks/${id}?toast=completed`);
}

export async function reopenTaskAction(id: string) {
  const record = await reopenTask(id);
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidateRelatedRecordViews(record);
  revalidateOperationalViews();
  redirect(`/tasks/${id}?toast=reopened`);
}

export async function convertLeadAction(id: string) {
  const dealId = await convertLead(id);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/companies");
  revalidatePath("/contacts");
  revalidatePath("/deals");
  revalidatePath("/tasks");
  revalidateOperationalViews();
  redirect(`/deals/${dealId}?toast=converted`);
}

export async function createActivityAction(entity: EntitySlug, id: string, formData: FormData) {
  let values: ReturnType<typeof parseActivityFormValues> | null = null;
  let activity: Awaited<ReturnType<typeof createActivityForEntity>> | null = null;
  let validationFailed = false;

  try {
    values = parseActivityFormValues(formData);
    activity = await createActivityForEntity(entity, id, values);
  } catch (error) {
    if (error instanceof CrmValidationError) {
      validationFailed = true;
    } else {
      throw error;
    }
  }

  if (validationFailed) return redirect(`/${entity}/${id}?toast=validation-error`);
  if (!values || !activity) throw new Error("Activity action did not return a record.");

  revalidatePath(`/${entity}/${id}`);
  revalidateRelatedRecordViews(activity);
  // Any activity clears the "untouched lead" dashboard alert and affects report
  // counts, so refresh operational views regardless of next-action state.
  revalidateOperationalViews();
  if (values.has_next_action) {
    revalidatePath("/tasks");
  }
  redirect(`/${entity}/${id}?toast=activity`);
}

export async function runAutomationAction() {
  const count = await generateAutomationTasks();
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  redirect(`/dashboard?toast=automation&count=${count}`);
}

export async function saveLeadImportSettingAction(formData: FormData) {
  try {
    await saveLeadImportSetting(formData);
  } catch (error) {
    if (error instanceof LeadImportValidationError) {
      return redirect("/leads/import-settings?toast=settings-error");
    }

    throw error;
  }

  revalidatePath("/leads/import-settings");
  revalidatePath("/leads");
  redirect("/leads/import-settings?toast=settings-saved");
}

export async function runLeadImportSettingAction(settingId: string) {
  const result = await runLeadImportSetting(settingId);
  revalidatePath("/leads/import-settings");
  revalidatePath("/leads");
  revalidatePath("/tasks");
  revalidateOperationalViews();
  redirect(
    `/leads/import-settings?toast=import-${result.status}&imported=${result.importedCount}&skipped=${result.skippedCount}`,
  );
}

export async function signInAction(formData: FormData) {
  const env = getSupabaseEnv();
  const next = safeInternalRedirectPath(formData.get("next"));

  if (!env.configured) {
    redirect("/dashboard?toast=demo");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/dashboard?toast=demo");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const env = getSupabaseEnv();
  const next = safeInternalRedirectPath(formData.get("next"));

  if (!env.configured) {
    redirect("/dashboard?toast=demo");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/dashboard?toast=demo");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(`/login?notice=${encodeURIComponent("アカウントを作成しました。確認が必要な場合はメールを確認してください。")}&next=${encodeURIComponent(next)}`);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/login");
}

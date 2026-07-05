"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { activityTypes } from "./options";
import {
  completeTask,
  convertLead,
  createActivity,
  createRecord,
  generateAutomationTasks,
  reopenTask,
  softDeleteRecord,
  updateRecord,
} from "./data";
import { getEntityConfig } from "./entities";
import { runLeadImportSetting, saveLeadImportSetting } from "./lead-imports";
import type { EntityConfig, EntitySlug, FieldConfig } from "./types";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

function coerceField(field: FieldConfig, formData: FormData) {
  if (field.type === "multiselect") {
    return formData.getAll(field.name).map(String).filter(Boolean);
  }

  if (field.type === "checkbox") {
    return formData.get(field.name) === "on";
  }

  const raw = formData.get(field.name);
  const value = typeof raw === "string" ? raw.trim() : "";

  if (!value) return null;

  if (field.type === "number") {
    return Number(value);
  }

  if (field.type === "datetime-local") {
    return new Date(value).toISOString();
  }

  return value;
}

function parseValues(config: EntityConfig, formData: FormData) {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of config.fields) {
    const value = coerceField(field, formData);
    const isEmpty = value === null || value === "" || (Array.isArray(value) && value.length === 0);

    if (field.required && isEmpty) {
      errors[field.name] = `${field.label}は必須です。`;
      continue;
    }

    if (field.type === "number" && value !== null) {
      const numberValue = z.number().safeParse(value);
      if (!numberValue.success || Number.isNaN(value)) {
        errors[field.name] = `${field.label}は数値で入力してください。`;
        continue;
      }
      if (field.min !== undefined && Number(value) < field.min) errors[field.name] = `${field.label}は${field.min}以上で入力してください。`;
      if (field.max !== undefined && Number(value) > field.max) errors[field.name] = `${field.label}は${field.max}以下で入力してください。`;
    }

    if (field.type === "email" && value) {
      const email = z.string().email().safeParse(value);
      if (!email.success) errors[field.name] = "メールアドレスの形式で入力してください。";
    }

    values[field.name] = value;
  }

  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors).join("\n"));
  }

  return values;
}

function mustGetConfig(entity: EntitySlug | string) {
  const config = getEntityConfig(entity);
  if (!config) throw new Error("未対応の画面です。");
  return config;
}

export async function createEntityAction(entity: EntitySlug, formData: FormData) {
  const config = mustGetConfig(entity);
  const values = parseValues(config, formData);
  const record = await createRecord(config, values);

  revalidatePath(`/${entity}`);
  redirect(`/${entity}/${record.id}?toast=created`);
}

export async function updateEntityAction(entity: EntitySlug, id: string, formData: FormData) {
  const config = mustGetConfig(entity);
  const values = parseValues(config, formData);
  await updateRecord(config, id, values);

  revalidatePath(`/${entity}`);
  revalidatePath(`/${entity}/${id}`);
  redirect(`/${entity}/${id}?toast=updated`);
}

export async function deleteEntityAction(entity: EntitySlug, id: string) {
  const config = mustGetConfig(entity);
  await softDeleteRecord(config, id);

  revalidatePath(`/${entity}`);
  redirect(`/${entity}?toast=deleted`);
}

export async function completeTaskAction(id: string) {
  await completeTask(id);
  revalidatePath("/tasks");
  redirect(`/tasks/${id}?toast=completed`);
}

export async function reopenTaskAction(id: string) {
  await reopenTask(id);
  revalidatePath("/tasks");
  redirect(`/tasks/${id}?toast=reopened`);
}

export async function convertLeadAction(id: string) {
  const dealId = await convertLead(id);
  revalidatePath("/leads");
  revalidatePath("/companies");
  revalidatePath("/contacts");
  revalidatePath("/deals");
  redirect(`/deals/${dealId}?toast=converted`);
}

function activityRelation(entity: EntitySlug, id: string) {
  if (entity === "leads") return { lead_id: id };
  if (entity === "companies") return { company_id: id };
  if (entity === "contacts") return { contact_id: id };
  if (entity === "deals") return { deal_id: id };
  return {};
}

export async function createActivityAction(entity: EntitySlug, id: string, formData: FormData) {
  const type = String(formData.get("type") ?? "メモ");
  const subject = String(formData.get("subject") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const occurredAt = String(formData.get("occurred_at") ?? "").trim();
  const hasNextAction = formData.get("has_next_action") === "on";
  const nextActionDate = String(formData.get("next_action_date") ?? "").trim();

  if (!activityTypes.includes(type as (typeof activityTypes)[number])) {
    throw new Error("活動種別が不正です。");
  }

  if (!subject) {
    throw new Error("活動件名は必須です。");
  }

  await createActivity({
    type,
    subject,
    content,
    occurred_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
    has_next_action: hasNextAction,
    next_action_date: nextActionDate || null,
    ...activityRelation(entity, id),
  });

  revalidatePath(`/${entity}/${id}`);
  redirect(`/${entity}/${id}?toast=activity`);
}

export async function runAutomationAction() {
  const count = await generateAutomationTasks();
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  redirect(`/dashboard?toast=automation&count=${count}`);
}

export async function saveLeadImportSettingAction(formData: FormData) {
  await saveLeadImportSetting(formData);
  revalidatePath("/leads/import-settings");
  revalidatePath("/leads");
  redirect("/leads/import-settings?toast=settings-saved");
}

export async function runLeadImportSettingAction(settingId: string) {
  const result = await runLeadImportSetting(settingId);
  revalidatePath("/leads/import-settings");
  revalidatePath("/leads");
  redirect(
    `/leads/import-settings?toast=import-${result.status}&imported=${result.importedCount}&skipped=${result.skippedCount}`,
  );
}

export async function signInAction(formData: FormData) {
  const env = getSupabaseEnv();
  const next = String(formData.get("next") ?? "/dashboard");

  if (!env.configured) {
    redirect("/dashboard?toast=demo");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/dashboard?toast=demo");
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const env = getSupabaseEnv();
  const next = String(formData.get("next") ?? "/dashboard");

  if (!env.configured) {
    redirect("/dashboard?toast=demo");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/dashboard?toast=demo");
  }

  const email = String(formData.get("email") ?? "");
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

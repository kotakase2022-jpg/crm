import { z } from "zod";
import { activityTypes } from "./options";
import type { EntityConfig, FieldConfig } from "./types";

export class CrmValidationError extends Error {
  fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super(Object.values(fieldErrors).join("\n"));
    this.name = "CrmValidationError";
    this.fieldErrors = fieldErrors;
  }
}

function isEmpty(value: unknown) {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

function isValidDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function parseDateTimeValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);
  if (!match) return null;

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue = "0", millisecondValue = "0"] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);
  const millisecond = Number(millisecondValue.padEnd(3, "0"));

  const parsed = new Date(year, month - 1, day, hour, minute, second, millisecond);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute ||
    parsed.getSeconds() !== second ||
    parsed.getMilliseconds() !== millisecond
  ) {
    return null;
  }

  return parsed.toISOString();
}

function coerceFieldValue(field: FieldConfig, rawValue: unknown) {
  if (field.type === "multiselect") {
    if (Array.isArray(rawValue)) return rawValue.map(String).map((value) => value.trim()).filter(Boolean);
    if (typeof rawValue === "string" && rawValue.trim()) return [rawValue.trim()];
    return [];
  }

  if (field.type === "checkbox") {
    return rawValue === true || rawValue === "true" || rawValue === "on";
  }

  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

  if (value === "" || value === null || value === undefined) return null;

  if (field.type === "number") {
    return typeof value === "number" ? value : Number(value);
  }

  if (field.type === "datetime-local") {
    return parseDateTimeValue(String(value)) ?? String(value);
  }

  return String(value);
}

function valueFromFormData(formData: FormData, field: FieldConfig) {
  if (field.type === "multiselect") return formData.getAll(field.name);
  if (field.type === "checkbox") return formData.get(field.name) ?? false;
  return formData.get(field.name);
}

export function parseEntityValues(config: EntityConfig, rawValues: Record<string, unknown>) {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of config.fields) {
    const rawValue = rawValues[field.name];
    const value = coerceFieldValue(field, rawValue);

    if (field.required && isEmpty(value)) {
      errors[field.name] = `${field.label}は必須です。`;
      continue;
    }

    if (field.type === "number" && !isEmpty(value)) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors[field.name] = `${field.label}は数値で入力してください。`;
        continue;
      }

      if (field.min !== undefined && value < field.min) errors[field.name] = `${field.label}は${field.min}以上で入力してください。`;
      if (field.max !== undefined && value > field.max) errors[field.name] = `${field.label}は${field.max}以下で入力してください。`;
    }

    if (field.type === "email" && !isEmpty(value)) {
      const email = z.string().email().safeParse(value);
      if (!email.success) errors[field.name] = `${field.label}はメールアドレスの形式で入力してください。`;
    }

    if (field.type === "url" && !isEmpty(value)) {
      const url = z.string().url().safeParse(value);
      if (!url.success) errors[field.name] = `${field.label}はURLの形式で入力してください。`;
    }

    if (field.type === "date" && !isEmpty(value)) {
      if (!isValidDateOnly(String(value))) errors[field.name] = `${field.label}は日付の形式で入力してください。`;
    }

    if (field.type === "datetime-local" && !isEmpty(value)) {
      const rawDateTime = typeof rawValue === "string" ? rawValue.trim() : String(rawValue ?? "");
      if (!parseDateTimeValue(rawDateTime)) errors[field.name] = `${field.label}は日時の形式で入力してください。`;
    }

    if (field.options && !isEmpty(value)) {
      const selected = Array.isArray(value) ? value : [value];
      const invalid = selected.find((item) => !field.options?.includes(String(item)));
      if (invalid) errors[field.name] = `${field.label}の選択肢が不正です。`;
    }

    values[field.name] = value;
  }

  if (Object.keys(errors).length > 0) {
    throw new CrmValidationError(errors);
  }

  return values;
}

export function parseEntityFormValues(config: EntityConfig, formData: FormData) {
  const rawValues = Object.fromEntries(config.fields.map((field) => [field.name, valueFromFormData(formData, field)]));
  return parseEntityValues(config, rawValues);
}

export function parseActivityFormValues(formData: FormData, now = new Date()) {
  const type = String(formData.get("type") ?? "メモ").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const occurredAt = String(formData.get("occurred_at") ?? "").trim();
  const nextActionDate = String(formData.get("next_action_date") ?? "").trim();
  const errors: Record<string, string> = {};

  if (!activityTypes.includes(type as (typeof activityTypes)[number])) {
    errors.type = "活動種別の選択肢が不正です。";
  }

  if (!subject) {
    errors.subject = "活動件名は必須です。";
  }

  const parsedOccurredAt = occurredAt ? parseDateTimeValue(occurredAt) : now.toISOString();
  if (!parsedOccurredAt) {
    errors.occurred_at = "実施日時は日時の形式で入力してください。";
  }

  if (nextActionDate && !isValidDateOnly(nextActionDate)) {
    errors.next_action_date = "次回アクション日は日付の形式で入力してください。";
  }

  if (Object.keys(errors).length > 0) {
    throw new CrmValidationError(errors);
  }

  return {
    type,
    subject,
    content,
    occurred_at: parsedOccurredAt,
    has_next_action: formData.get("has_next_action") === "on",
    next_action_date: nextActionDate || null,
  };
}

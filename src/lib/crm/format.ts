import { activationLevels } from "./options";
import type { CrmRecord, RelationOptions } from "./types";

export function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
}

export function toDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatCurrency(value: unknown) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

export function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  return value.slice(0, 10);
}

export function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function daysUntil(value: unknown) {
  const target = toDate(value);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function labelForRelation(field: string, value: unknown, relations: RelationOptions) {
  const raw = typeof value === "string" ? value : "";
  if (!raw) return "-";

  const key =
    field === "company_id"
      ? "companies"
      : field === "contact_id"
        ? "contacts"
        : field === "lead_id"
          ? "leads"
          : field === "deal_id"
            ? "deals"
            : field === "support_ticket_id"
              ? "tickets"
              : null;

  if (!key) return raw;

  return relations[key]?.find((option) => option.value === raw)?.label ?? raw;
}

export function formatValue(field: string, value: unknown, relations: RelationOptions = {}) {
  if (value === null || value === undefined || value === "") return "-";
  if (field.endsWith("_id")) return labelForRelation(field, value, relations);
  if (field.includes("mrr") || field.includes("arr") || field === "amount") return formatCurrency(value);
  if (field.endsWith("_at") || field === "opened_at" || field === "resolved_at") return formatDateTime(value);
  if (field.endsWith("_date") || field.endsWith("_on") || field === "measured_on" || field === "billing_month") return formatDate(value);
  if (field === "activation_level") return activationLevels[toNumber(value)] ?? String(value);
  if (Array.isArray(value)) return value.join(" / ");
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  return String(value);
}

export function recordTitle(record: CrmRecord | null | undefined) {
  if (!record) return "-";
  return String(record.name ?? record.title ?? record.plan ?? record.company_name ?? record.id);
}

export function dateInputValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.slice(0, 10);
}

export function dateTimeInputValue(value: unknown) {
  if (typeof value !== "string") return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 16);
}

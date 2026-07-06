import { activationLevels } from "./options";
import type { CrmRecord, RelationKey, RelationOptions } from "./types";

const crmTimeZone = "Asia/Tokyo";

export function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
}

export function toFiniteNumber(value: unknown, fallback = 0) {
  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hasValidDateParts(year: number, month: number, day: number) {
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function hasValidTimeParts(value: string) {
  const match = /^\d{4}-\d{2}-\d{2}[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?/.exec(value);
  if (!match) return true;

  const [, hourValue, minuteValue, secondValue = "0"] = match;
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 && second >= 0 && second <= 59;
}

export function toDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const datePartMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(value);
  if (datePartMatch) {
    const [, yearValue, monthValue, dayValue] = datePartMatch;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    if (!hasValidDateParts(year, month, day)) return null;
    if (!hasValidTimeParts(value)) return null;
    if (value === `${yearValue}-${monthValue}-${dayValue}`) return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  const date = toDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: crmTimeZone,
  }).format(date);
}

function dateTimePartsInCrmTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: crmTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function dateTimeInputValue(value: unknown) {
  if (typeof value !== "string") return "";
  const parsed = toDate(value);
  if (!parsed) return "";
  const parts = dateTimePartsInCrmTimeZone(parsed);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatCurrency(value: unknown) {
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) return "-";

  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "-";
  const date = toDate(value);
  return date ? localDateString(date) : "-";
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameLocalDate(value: unknown, date = new Date()) {
  const parsed = toDate(value);
  return parsed ? localDateString(parsed) === localDateString(date) : false;
}

export function offsetLocalDateString(days: number, baseDate = new Date()) {
  const value = new Date(baseDate);
  value.setDate(value.getDate() + days);
  return localDateString(value);
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
  const raw = typeof value === "string" ? value.trim() : "";
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
              : field === "trial_id"
                ? "trials"
                : field === "subscription_id"
                  ? "contracts"
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
  if (Array.isArray(value)) {
    const values = value.map((item) => String(item).trim()).filter(Boolean);
    return values.length ? values.join(" / ") : "-";
  }
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  if (typeof value === "string") {
    const text = value.trim();
    return text || "-";
  }
  return String(value);
}

export function recordTitle(record: CrmRecord | null | undefined) {
  if (!record) return "-";
  return firstText([record.name, record.title, record.plan, record.company_name, record.id]);
}

function stringPart(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function textPart(value: unknown) {
  const text = stringPart(value);
  if (text) return text;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function firstText(parts: unknown[], fallback = "-") {
  for (const part of parts) {
    const text = textPart(part);
    if (text) return text;
  }
  return fallback;
}

function uniqueParts(parts: Array<string | null>) {
  return parts.filter((part, index): part is string => Boolean(part) && parts.indexOf(part) === index);
}

function dateRangeLabel(start: unknown, end: unknown) {
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);

  if (startLabel === "-" && endLabel === "-") return null;
  if (startLabel === "-") return `〜${endLabel}`;
  if (endLabel === "-") return `${startLabel}〜`;
  return `${startLabel}〜${endLabel}`;
}

export function relationOptionLabel(key: RelationKey, row: CrmRecord) {
  if (key === "companies") return firstText([row.name, row.id]);
  if (key === "contacts") return firstText([row.name, row.email, row.id]);
  if (key === "leads") {
    const label = uniqueParts([stringPart(row.name), stringPart(row.company_name)]).join(" / ");
    return label || firstText([row.id]);
  }
  if (key === "deals") return firstText([row.name, row.id]);
  if (key === "trials") return uniqueParts(["トライアル", dateRangeLabel(row.start_date, row.end_date)]).join(" ");
  if (key === "contracts") {
    const label = uniqueParts([stringPart(row.plan), stringPart(row.status)]).join(" ");
    return label || "未設定";
  }
  return firstText([row.title, row.id]);
}

export function dateInputValue(value: unknown) {
  if (typeof value !== "string") return "";
  const formatted = formatDate(value);
  return formatted === "-" ? "" : formatted;
}

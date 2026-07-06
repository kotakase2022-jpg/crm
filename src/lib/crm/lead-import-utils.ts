import { createHash } from "node:crypto";
import { entityConfigs } from "./entities";
import { leadSources, leadStatuses } from "./options";
import { parseEntityValues } from "./validation";
import type { CsvRow } from "./csv";
import type { CrmRecord } from "./types";

export const defaultLeadImportStatus = "新規（広告経由）";

const headerAliases: Record<string, string> = {
  リード名: "name",
  会社名: "company_name",
  担当者名: "contact_name",
  氏名: "contact_name",
  メール: "email",
  メールアドレス: "email",
  電話: "phone",
  電話番号: "phone",
  ステータス: "status",
  流入経路: "source",
  課題タグ: "issue_tags",
  次回アクション日: "next_action_date",
  業種: "industry",
  会社規模: "company_size",
  月間案件数: "monthly_projects",
  月間帳票数: "monthly_documents",
  メモ: "notes",
  備考: "notes",
};

function valueAsString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHeaders(row: CsvRow) {
  const normalized: CsvRow = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = headerAliases[key.trim()] ?? key.trim();
    if (normalizedKey in normalized) {
      throw new Error(`Spreadsheet import has duplicate header after normalization: ${normalizedKey}`);
    }
    normalized[normalizedKey] = value;
  }

  return normalized;
}

export function safeLeadImportStatus(status: string, fallback = defaultLeadImportStatus) {
  const normalized = status.trim();
  return leadStatuses.includes(normalized as (typeof leadStatuses)[number]) ? normalized : fallback;
}

function isTrustedSpreadsheetHost(hostname: string) {
  return (
    hostname === "docs.google.com" ||
    hostname === "googleusercontent.com" ||
    hostname.endsWith(".googleusercontent.com")
  );
}

export function assertTrustedSpreadsheetCsvUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (url.protocol !== "https:") {
    throw new Error("Spreadsheet import URLs must use HTTPS.");
  }

  if (!isTrustedSpreadsheetHost(url.hostname)) {
    throw new Error("Spreadsheet imports only support Google Sheets CSV URLs.");
  }

  if (url.hostname === "docs.google.com" && !url.pathname.includes("/spreadsheets/d/")) {
    throw new Error("Spreadsheet imports only support Google Sheets CSV URLs.");
  }

  return url.toString();
}

export function spreadsheetUrlToCsvUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (url.searchParams.get("output") === "csv" || url.pathname.endsWith(".csv")) {
    return assertTrustedSpreadsheetCsvUrl(url.toString());
  }

  const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (url.hostname === "docs.google.com" && match?.[1]) {
    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${match[1]}/export`);
    exportUrl.searchParams.set("format", "csv");
    const gid = url.searchParams.get("gid") ?? new URLSearchParams(url.hash.replace(/^#/, "")).get("gid");
    if (gid) exportUrl.searchParams.set("gid", gid);
    return assertTrustedSpreadsheetCsvUrl(exportUrl.toString());
  }

  throw new Error("Spreadsheet imports only support Google Sheets CSV URLs.");
}

export function normalizeLeadImportRow(row: CsvRow, defaultStatus = defaultLeadImportStatus) {
  const normalized = normalizeHeaders(row);
  const companyName = valueAsString(normalized.company_name);
  const leadName = valueAsString(normalized.name) || companyName;
  const source = valueAsString(normalized.source) || (leadSources.includes("広告" as (typeof leadSources)[number]) ? "広告" : null);
  const values = {
    ...normalized,
    name: leadName,
    company_name: companyName,
    status: safeLeadImportStatus(valueAsString(normalized.status), defaultStatus),
    source,
  };

  return parseEntityValues(entityConfigs.leads, values);
}

export function importSourceId(row: Record<string, unknown>) {
  const email = valueAsString(row.email).toLowerCase();
  if (email) return `email:${email}`;

  const phone = valueAsString(row.phone).replace(/\D/g, "");
  if (phone) return `phone:${phone}`;

  const fallback = `${valueAsString(row.company_name)}|${valueAsString(row.name)}`.toLowerCase();
  return `row:${createHash("sha256").update(fallback).digest("hex")}`;
}

export function importSourceIdValue(value: unknown) {
  const sourceId = valueAsString(value);
  return sourceId || null;
}

export function importSourceIdSet(rows: Array<Record<string, unknown>>) {
  return new Set(
    rows.flatMap((row) => {
      const sourceId = importSourceIdValue(row.external_source_id);
      return sourceId ? [sourceId] : [];
    }),
  );
}

function importRunSortTime(run: CrmRecord) {
  for (const field of ["started_at", "created_at", "updated_at"]) {
    const value = run[field];
    if (typeof value !== "string" || !value) continue;

    const parsed = new Date(value).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 0;
}

export function recentLeadImportRuns(runs: CrmRecord[], limit = 10) {
  return [...runs].sort((a, b) => importRunSortTime(b) - importRunSortTime(a)).slice(0, limit);
}

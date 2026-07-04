import { createHash } from "node:crypto";
import { entityConfigs } from "./entities";
import { leadSources, leadStatuses } from "./options";
import { parseEntityValues } from "./validation";
import type { CsvRow } from "./csv";

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
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const normalizedKey = headerAliases[key.trim()] ?? key.trim();
      return [normalizedKey, value];
    }),
  );
}

export function safeLeadImportStatus(status: string, fallback = defaultLeadImportStatus) {
  return leadStatuses.includes(status as (typeof leadStatuses)[number]) ? status : fallback;
}

export function spreadsheetUrlToCsvUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (url.searchParams.get("output") === "csv" || url.pathname.endsWith(".csv")) {
    return url.toString();
  }

  const match = url.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (url.hostname === "docs.google.com" && match?.[1]) {
    const exportUrl = new URL(`https://docs.google.com/spreadsheets/d/${match[1]}/export`);
    exportUrl.searchParams.set("format", "csv");
    const gid = url.searchParams.get("gid") ?? new URLSearchParams(url.hash.replace(/^#/, "")).get("gid");
    if (gid) exportUrl.searchParams.set("gid", gid);
    return exportUrl.toString();
  }

  return url.toString();
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

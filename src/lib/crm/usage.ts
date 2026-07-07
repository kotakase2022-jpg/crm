import { toDate } from "./format";
import { relationIdValue } from "./related";
import type { CrmRecord } from "./types";

export function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "");
}

export function hasValue(value: unknown, expected: string) {
  return textValue(value) === expected;
}

export function hasAnyValue(value: unknown, expected: readonly string[]) {
  return expected.includes(textValue(value));
}

export function usageSortTime(usage: CrmRecord) {
  for (const field of ["period_end", "last_login_at", "updated_at", "created_at"]) {
    const value = toDate(usage[field]);
    if (value) return value.getTime();
  }

  return 0;
}

export function latestUsageRowsByCompany(rows: CrmRecord[]) {
  const latest = new Map<string, CrmRecord>();

  for (const row of rows) {
    const companyId = relationIdValue(row.company_id);
    if (!companyId) continue;

    const current = latest.get(companyId);
    if (!current || usageSortTime(row) >= usageSortTime(current)) {
      latest.set(companyId, row);
    }
  }

  return Array.from(latest.values());
}

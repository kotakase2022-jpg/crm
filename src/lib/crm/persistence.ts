import { toNumber } from "./format";
import type { TableName } from "./types";

const managedFields = new Set([
  "id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "deleted_at",
  "organization_id",
]);

export function stripManagedFields(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).filter(([key]) => !managedFields.has(key)));
}

export function withComputedAmounts(table: TableName, values: Record<string, unknown>) {
  const next = { ...values };

  if (table === "deals") {
    next.expected_arr = toNumber(next.expected_mrr) * 12;
  }

  if (table === "subscriptions") {
    next.arr = toNumber(next.mrr) * 12;
  }

  return next;
}

export function prepareRecordForPersistence(table: TableName, values: Record<string, unknown>) {
  return withComputedAmounts(table, stripManagedFields(values));
}

export function ensureRequiredRelation(values: Record<string, unknown>, relationKey: string) {
  const value = values[relationKey];
  if (typeof value !== "string" || value.trim() === "") {
    return {
      ok: false,
      error: `${relationKey} is required before persistence`,
    };
  }

  return {
    ok: true,
    value,
  };
}

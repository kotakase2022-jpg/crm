import { toFiniteNumber } from "./format";
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

function hasOwnField(values: Record<string, unknown>, field: string) {
  return Object.prototype.hasOwnProperty.call(values, field);
}

function annualAmount(value: unknown) {
  const amount = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(amount) ? amount * 12 : null;
}

export function withComputedAmounts(table: TableName, values: Record<string, unknown>) {
  const next = { ...values };

  if (table === "deals" && hasOwnField(next, "expected_mrr")) {
    const expectedArr = annualAmount(next.expected_mrr);
    if (expectedArr === null) delete next.expected_arr;
    else next.expected_arr = expectedArr;
  }

  if (table === "subscriptions" && hasOwnField(next, "mrr")) {
    const arr = annualAmount(next.mrr);
    if (arr === null) delete next.arr;
    else next.arr = arr;
  }

  return next;
}

export function prepareRecordForPersistence(table: TableName, values: Record<string, unknown>) {
  return withComputedAmounts(table, stripManagedFields(values));
}

export function prepareRecordForUpdate(table: TableName, values: Record<string, unknown>) {
  const payload = stripManagedFields(values);

  if (Object.prototype.hasOwnProperty.call(values, "deleted_at")) {
    payload.deleted_at = values.deleted_at;
  }

  return withComputedAmounts(table, payload);
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

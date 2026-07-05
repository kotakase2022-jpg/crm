import type { TableName } from "./types";

const writeScopes: Record<string, "all" | TableName[]> = {
  admin: "all",
  sales_manager: ["leads", "companies", "contacts", "deals", "activities", "tasks", "trials", "lead_import_settings", "lead_import_runs"],
  sales: ["leads", "companies", "contacts", "deals", "activities", "tasks", "trials"],
  cs_manager: ["companies", "contacts", "activities", "tasks", "trials", "subscriptions", "product_usage", "support_tickets", "health_scores"],
  cs: ["companies", "contacts", "activities", "tasks", "trials", "subscriptions", "product_usage", "support_tickets", "health_scores"],
  support: ["support_tickets", "tasks", "activities", "companies", "contacts"],
  finance: ["subscriptions", "billing_records", "companies", "tasks", "activities"],
  viewer: [],
};

export function canWriteTable(role: string, table: TableName) {
  const scope = writeScopes[role] ?? [];
  return scope === "all" || scope.includes(table);
}

export function assertCanWriteTable(role: string, table: TableName) {
  if (canWriteTable(role, table)) return;
  throw new Error("この権限では更新できません。");
}

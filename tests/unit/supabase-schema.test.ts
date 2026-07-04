import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(process.cwd(), "supabase/migrations/20260702174454_crm_initial_schema.sql");
const migrationSql = readFileSync(migrationPath, "utf8");

const tenantTables = [
  "tags",
  "companies",
  "leads",
  "contacts",
  "deals",
  "deal_stage_history",
  "activities",
  "tasks",
  "trials",
  "subscriptions",
  "product_usage",
  "support_tickets",
  "health_scores",
  "billing_records",
  "lead_tags",
  "company_tags",
  "audit_logs",
];

function tableDefinition(tableName: string) {
  const match = migrationSql.match(new RegExp(`create table public\\.${tableName} \\(([^;]+)\\);`, "s"));
  return match?.[1] ?? "";
}

describe("Supabase tenant isolation schema", () => {
  it("keeps every tenant-owned table scoped by organization_id", () => {
    for (const tableName of tenantTables) {
      expect(tableDefinition(tableName), `${tableName} should have organization_id`).toMatch(/\borganization_id uuid\b/);
    }
  });

  it("enables RLS for all tenant-owned CRM tables through the policy loop", () => {
    const rlsLoop = migrationSql.match(
      /foreach table_name in array array\[([\s\S]+?)\]\s+loop\s+execute format\('alter table public\.%I enable row level security'([\s\S]+?)end loop;/,
    );

    expect(rlsLoop?.[0]).toContain("enable row level security");
    for (const tableName of tenantTables) {
      expect(rlsLoop?.[1], `${tableName} should be included in the RLS loop`).toContain(`'${tableName}'`);
    }
  });

  it("requires organization membership for select, insert, update, and delete policies", () => {
    expect(migrationSql).toContain("for select to authenticated using (public.is_organization_member(organization_id))");
    expect(migrationSql).toContain("for insert to authenticated with check (public.is_organization_member(organization_id))");
    expect(migrationSql).toContain(
      "for update to authenticated using (public.is_organization_member(organization_id)) with check (public.is_organization_member(organization_id))",
    );
    expect(migrationSql).toContain("for delete to authenticated using (public.is_organization_member(organization_id))");
  });

  it("keeps profile bootstrap restricted to authenticated users", () => {
    expect(migrationSql).toContain("revoke all on function public.ensure_user_profile(text) from public");
    expect(migrationSql).toContain("grant execute on function public.ensure_user_profile(text) to authenticated");
    expect(migrationSql).toContain("v_user_id uuid := auth.uid()");
  });
});

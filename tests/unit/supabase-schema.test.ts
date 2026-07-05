import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationsDir = path.join(process.cwd(), "supabase/migrations");
const migrationSql = readdirSync(migrationsDir)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort()
  .map((fileName) => readFileSync(path.join(migrationsDir, fileName), "utf8"))
  .join("\n");

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
  "lead_import_settings",
  "lead_import_runs",
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

  it("enables RLS for all tenant-owned CRM tables", () => {
    const rlsLoop = migrationSql.match(
      /foreach table_name in array array\[([\s\S]+?)\]\s+loop\s+execute format\('alter table public\.%I enable row level security'([\s\S]+?)end loop;/,
    );

    expect(rlsLoop?.[0]).toContain("enable row level security");
    for (const tableName of tenantTables) {
      const hasExplicitRls = migrationSql.includes(`alter table public.${tableName} enable row level security`);
      const hasLoopRls = rlsLoop?.[1].includes(`'${tableName}'`) ?? false;
      expect(hasExplicitRls || hasLoopRls, `${tableName} should enable RLS`).toBe(true);
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

  it("restricts spreadsheet import writes to admin and sales manager roles", () => {
    expect(migrationSql).toContain("drop policy if exists lead_import_settings_org_insert");
    expect(migrationSql).toContain("drop policy if exists lead_import_runs_org_insert");
    expect(migrationSql).toContain("private.current_user_role(organization_id) in ('admin', 'sales_manager')");
  });
});

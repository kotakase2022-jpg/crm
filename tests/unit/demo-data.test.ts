import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { demoStore, getDemoRows } from "@/lib/crm/demo-data";
import { relationConsistencyErrors } from "@/lib/crm/related";
import type { CrmRecord } from "@/lib/crm/types";

function byId(rows: CrmRecord[]) {
  return new Map(rows.map((row) => [String(row.id), row]));
}

function stringField(row: CrmRecord, field: string) {
  const value = row[field];
  return typeof value === "string" && value.length > 0 ? value : null;
}

describe("demo CRM data", () => {
  const leads = getDemoRows("leads");
  const companies = getDemoRows("companies");
  const contacts = getDemoRows("contacts");
  const deals = getDemoRows("deals");
  const activities = getDemoRows("activities");
  const tasks = getDemoRows("tasks");
  const trials = getDemoRows("trials");
  const subscriptions = getDemoRows("subscriptions");
  const usage = getDemoRows("product_usage");
  const tickets = getDemoRows("support_tickets");
  const healthScores = getDemoRows("health_scores");
  const billing = getDemoRows("billing_records");
  const stageHistory = getDemoRows("deal_stage_history");

  const maps = {
    lead_id: byId(leads),
    company_id: byId(companies),
    contact_id: byId(contacts),
    deal_id: byId(deals),
    trial_id: byId(trials),
    subscription_id: byId(subscriptions),
    support_ticket_id: byId(tickets),
  };

  const allRows: Array<readonly [string, CrmRecord]> = [
    ...leads.map((row) => ["leads", row] as const),
    ...companies.map((row) => ["companies", row] as const),
    ...contacts.map((row) => ["contacts", row] as const),
    ...deals.map((row) => ["deals", row] as const),
    ...activities.map((row) => ["activities", row] as const),
    ...tasks.map((row) => ["tasks", row] as const),
    ...trials.map((row) => ["trials", row] as const),
    ...subscriptions.map((row) => ["subscriptions", row] as const),
    ...usage.map((row) => ["product_usage", row] as const),
    ...tickets.map((row) => ["support_tickets", row] as const),
    ...healthScores.map((row) => ["health_scores", row] as const),
    ...billing.map((row) => ["billing_records", row] as const),
    ...stageHistory.map((row) => ["deal_stage_history", row] as const),
  ];

  it("shares the demo store through globalThis for route-bundle consistency", () => {
    const globalStore = (globalThis as typeof globalThis & { __crmDemoStore?: typeof demoStore }).__crmDemoStore;

    expect(globalStore).toBe(demoStore);
    expect(globalStore?.leads.length).toBeGreaterThan(0);
  });

  it("keeps every demo relation id resolvable", () => {
    const failures = allRows.flatMap(([table, row]) =>
      Object.entries(maps).flatMap(([field, rows]) => {
        const value = stringField(row, field);
        return value && !rows.has(value) ? [`${table}.${row.id}.${field} points to missing ${value}`] : [];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("keeps company/contact/deal/ticket demo relations company-consistent", () => {
    const rowsWithNestedRelations = [...deals, ...activities, ...tasks, ...trials, ...tickets];
    const leadMap = byId(leads);
    const companyMap = byId(companies);
    const contactMap = byId(contacts);
    const dealMap = byId(deals);
    const ticketMap = byId(tickets);

    const failures = rowsWithNestedRelations.flatMap((row) =>
      relationConsistencyErrors(row, {
        lead: leadMap.get(stringField(row, "lead_id") ?? "") ?? null,
        company: companyMap.get(stringField(row, "company_id") ?? "") ?? null,
        contact: contactMap.get(stringField(row, "contact_id") ?? "") ?? null,
        deal: dealMap.get(stringField(row, "deal_id") ?? "") ?? null,
        ticket: ticketMap.get(stringField(row, "support_ticket_id") ?? "") ?? null,
      }).map((error) => `${row.id}: ${error}`),
    );

    expect(failures).toEqual([]);
  });

  it("keeps usage and billing records attached to the same company as their subscription or trial", () => {
    const subscriptionMap = byId(subscriptions);
    const trialMap = byId(trials);
    const failures: string[] = [];

    usage.forEach((row) => {
      const companyId = stringField(row, "company_id");
      const subscription = subscriptionMap.get(stringField(row, "subscription_id") ?? "");
      const trial = trialMap.get(stringField(row, "trial_id") ?? "");

      if (subscription && subscription.company_id !== companyId) {
        failures.push(`${row.id}: subscription ${subscription.id} belongs to ${subscription.company_id}, not ${companyId}`);
      }

      if (trial && trial.company_id !== companyId) {
        failures.push(`${row.id}: trial ${trial.id} belongs to ${trial.company_id}, not ${companyId}`);
      }
    });

    billing.forEach((row) => {
      const companyId = stringField(row, "company_id");
      const subscription = subscriptionMap.get(stringField(row, "subscription_id") ?? "");

      if (subscription && subscription.company_id !== companyId) {
        failures.push(`${row.id}: subscription ${subscription.id} belongs to ${subscription.company_id}, not ${companyId}`);
      }
    });

    expect(failures).toEqual([]);
  });

  it("persists E2E demo rows through the configured store file across module instances", async () => {
    const originalMode = process.env.E2E_TEST_MODE;
    const originalStoreFile = process.env.CRM_DEMO_STORE_FILE;
    const tempDir = mkdtempSync(path.join(tmpdir(), "crm-demo-store-"));
    const storeFile = path.join(tempDir, "store.json");
    const leadId = "lead-persistent-store-test";
    const globalStore = globalThis as typeof globalThis & { __crmDemoStore?: typeof demoStore };

    try {
      process.env.E2E_TEST_MODE = "demo";
      process.env.CRM_DEMO_STORE_FILE = storeFile;
      delete globalStore.__crmDemoStore;

      vi.resetModules();
      const firstModule = await import("@/lib/crm/demo-data");
      firstModule.addDemoRow("leads", {
        id: leadId,
        organization_id: "demo-org",
        created_at: "2026-07-08T00:00:00.000Z",
        updated_at: "2026-07-08T00:00:00.000Z",
        created_by: "demo-user",
        updated_by: "demo-user",
        name: "Persistent store lead",
        company_name: "Persistent Store Construction",
        contact_name: "Persistent Contact",
        email: "persistent-store@example.test",
        status: "test-status",
      });

      expect(readFileSync(storeFile, "utf8")).toContain(leadId);

      delete globalStore.__crmDemoStore;
      vi.resetModules();
      const secondModule = await import("@/lib/crm/demo-data");
      const restored = secondModule.getDemoRows("leads").find((row) => row.id === leadId);

      expect(restored).toMatchObject({
        id: leadId,
        company_name: "Persistent Store Construction",
      });
    } finally {
      if (originalMode === undefined) {
        delete process.env.E2E_TEST_MODE;
      } else {
        process.env.E2E_TEST_MODE = originalMode;
      }

      if (originalStoreFile === undefined) {
        delete process.env.CRM_DEMO_STORE_FILE;
      } else {
        process.env.CRM_DEMO_STORE_FILE = originalStoreFile;
      }

      delete globalStore.__crmDemoStore;
      vi.resetModules();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

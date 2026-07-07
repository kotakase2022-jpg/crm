import { describe, expect, it } from "vitest";
import { getDemoRows } from "@/lib/crm/demo-data";
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
});

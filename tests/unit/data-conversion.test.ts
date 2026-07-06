import { describe, expect, it, vi } from "vitest";
import { convertLead, createRecord } from "@/lib/crm/data";
import { addDemoRow, getDemoRows } from "@/lib/crm/demo-data";
import { entityConfigs } from "@/lib/crm/entities";
import type { CrmRecord } from "@/lib/crm/types";
import { CrmValidationError } from "@/lib/crm/validation";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`Unexpected redirect to ${path}`);
  }),
}));
vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: vi.fn(() => ({ configured: false })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("lead conversion data flow", () => {
  it("surfaces relation consistency failures as validation errors", async () => {
    const companies = getDemoRows("companies");
    const deals = getDemoRows("deals");
    const mismatchedDeal = deals.find((deal) => deal.company_id !== companies[0]?.id);

    expect(companies[0]).toBeDefined();
    expect(mismatchedDeal).toBeDefined();

    try {
      await createRecord(entityConfigs.tasks, {
        title: "Mismatched relation task",
        status: "未完了",
        company_id: companies[0]?.id,
        deal_id: mismatchedDeal?.id,
      });
      throw new Error("Expected relation consistency validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(CrmValidationError);
      expect((error as CrmValidationError).fieldErrors).toMatchObject({
        relation: expect.stringContaining("商談"),
      });
    }
  });

  it("ignores blank converted deal ids and converts the lead", async () => {
    const timestamp = "2026-07-06T02:30:00.000Z";
    const leadId = "lead-blank-converted-deal";
    const lead: CrmRecord = {
      id: leadId,
      organization_id: "demo-org",
      created_at: timestamp,
      updated_at: timestamp,
      created_by: "demo-user",
      updated_by: "demo-user",
      name: "Blank converted id lead",
      company_name: "Blank Converted Construction",
      contact_name: "Test Contact",
      email: "blank-converted@example.test",
      phone: "050-0000-0000",
      status: "新規（広告以外）",
      converted_deal_id: "   ",
    };
    const dealsBefore = getDemoRows("deals").length;

    addDemoRow("leads", lead);

    const dealId = await convertLead(leadId);
    const convertedLead = getDemoRows("leads").find((row) => row.id === leadId);

    expect(dealId.trim()).not.toBe("");
    expect(dealId).not.toBe("   ");
    expect(getDemoRows("deals").length).toBe(dealsBefore + 1);
    expect(convertedLead?.converted_deal_id).toBe(dealId);
  });

  it("ignores stale converted deal ids that no longer point to a deal", async () => {
    const timestamp = "2026-07-06T02:35:00.000Z";
    const leadId = "lead-stale-converted-deal";
    const staleDealId = "deal-does-not-exist";
    const lead: CrmRecord = {
      id: leadId,
      organization_id: "demo-org",
      created_at: timestamp,
      updated_at: timestamp,
      created_by: "demo-user",
      updated_by: "demo-user",
      name: "Stale converted id lead",
      company_name: "Stale Converted Construction",
      contact_name: "Test Contact",
      email: "stale-converted@example.test",
      phone: "050-0000-0001",
      status: "新規（広告以外）",
      converted_deal_id: staleDealId,
    };
    const dealsBefore = getDemoRows("deals").length;

    addDemoRow("leads", lead);

    const dealId = await convertLead(leadId);
    const convertedLead = getDemoRows("leads").find((row) => row.id === leadId);

    expect(dealId).not.toBe(staleDealId);
    expect(getDemoRows("deals").length).toBe(dealsBefore + 1);
    expect(getDemoRows("deals").some((deal) => deal.id === dealId)).toBe(true);
    expect(convertedLead?.converted_deal_id).toBe(dealId);
  });
});

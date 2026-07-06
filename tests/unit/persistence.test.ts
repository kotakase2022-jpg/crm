import { describe, expect, it } from "vitest";
import { ensureRequiredRelation, prepareRecordForPersistence, stripManagedFields, withComputedAmounts } from "@/lib/crm/persistence";

describe("persistence shaping", () => {
  it("removes managed fields before client supplied values reach persistence", () => {
    const values = stripManagedFields({
      id: "unsafe-id",
      organization_id: "unsafe-org",
      created_at: "2026-07-03T00:00:00.000Z",
      name: "Safe Lead",
    });

    expect(values).toEqual({ name: "Safe Lead" });
  });

  it("computes ARR values from MRR before save", () => {
    expect(withComputedAmounts("deals", { expected_mrr: 12000 }).expected_arr).toBe(144000);
    expect(withComputedAmounts("subscriptions", { mrr: "30000" }).arr).toBe(360000);
  });

  it("does not overwrite ARR values when partial updates omit the source MRR field", () => {
    expect(withComputedAmounts("deals", { stage: "Demo done" })).toEqual({ stage: "Demo done" });
    expect(withComputedAmounts("subscriptions", { status: "paid" })).toEqual({ status: "paid" });
  });

  it("combines stripping and computed fields for save payloads", () => {
    const payload = prepareRecordForPersistence("subscriptions", {
      id: "contract-1",
      organization_id: "org-1",
      mrr: 50000,
      plan: "standard",
    });

    expect(payload).toEqual({ mrr: 50000, plan: "standard", arr: 600000 });
  });

  it("guards required relations before saving dependent records", () => {
    expect(ensureRequiredRelation({ company_id: "company-1" }, "company_id")).toMatchObject({ ok: true, value: "company-1" });
    expect(ensureRequiredRelation({ company_id: "" }, "company_id")).toMatchObject({ ok: false, error: expect.any(String) });
  });
});

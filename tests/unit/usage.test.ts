import { describe, expect, it } from "vitest";
import { hasAnyValue, hasValue, latestUsageRowsByCompany, textValue, usageSortTime } from "@/lib/crm/usage";

describe("usage and normalized value helpers", () => {
  it("normalizes comparable text values before CRM status checks", () => {
    expect(textValue(" 有料 ")).toBe("有料");
    expect(textValue(null)).toBe("");
    expect(hasValue(" 有料 ", "有料")).toBe(true);
    expect(hasAnyValue(" クローズ ", ["解決済み", "クローズ"])).toBe(true);
  });

  it("selects the latest usage row per company using stable CRM recency fields", () => {
    const rows = [
      { id: "older", company_id: " company-1 ", period_end: "2026-07-01", documents_created: 3 },
      { id: "latest", company_id: "company-1", period_end: "2026-07-31", documents_created: 9 },
      { id: "fallback", company_id: "company-2", last_login_at: "2026-07-20T10:00:00.000Z", documents_created: 2 },
      { id: "ignored", company_id: " ", period_end: "2026-07-31", documents_created: 99 },
    ];

    expect(usageSortTime(rows[0])).toBeLessThan(usageSortTime(rows[1]));
    expect(latestUsageRowsByCompany(rows).map((row) => row.id)).toEqual(["latest", "fallback"]);
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const seedSql = readFileSync(path.join(process.cwd(), "supabase/seed.sql"), "utf8");

describe("Supabase seed data", () => {
  it("links seeded tasks, activities, and trials through company-consistent deals", () => {
    expect(seedSql).toContain("v_deal_index := ((i - 1) % array_length(deal_ids, 1)) + 1;");
    expect(seedSql).toContain("company_ids[((v_deal_index - 1) % array_length(company_ids, 1)) + 1]");
    expect(seedSql).toContain("contact_ids[v_deal_index]");
    expect(seedSql).toContain("deal_ids[v_deal_index]");
    expect(seedSql).not.toContain("deal_ids[((i + 4) % array_length(deal_ids, 1)) + 1]");
  });
});

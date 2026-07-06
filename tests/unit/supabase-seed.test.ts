import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const seedSql = readFileSync(path.join(process.cwd(), "supabase/seed.sql"), "utf8");

function normalizedSql(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function loopBlockForInsert(tableName: string) {
  const insertIndex = seedSql.indexOf(`insert into public.${tableName}`);
  expect(insertIndex, `${tableName} insert should exist`).toBeGreaterThanOrEqual(0);

  const loopStart = seedSql.lastIndexOf("for i in", insertIndex);
  const loopEnd = seedSql.indexOf("end loop;", insertIndex);
  expect(loopStart, `${tableName} seed insert should be inside a deterministic for-loop`).toBeGreaterThanOrEqual(0);
  expect(loopEnd, `${tableName} seed insert loop should close`).toBeGreaterThan(insertIndex);

  return normalizedSql(seedSql.slice(loopStart, loopEnd));
}

describe("Supabase seed data", () => {
  it("links seeded tasks, activities, and trials through company-consistent deals", () => {
    const taskLoop = loopBlockForInsert("tasks");
    const activityLoop = loopBlockForInsert("activities");
    const trialLoop = loopBlockForInsert("trials");

    for (const [tableName, loop] of [
      ["tasks", taskLoop],
      ["activities", activityLoop],
    ] as const) {
      expect(loop, `${tableName} should derive a stable deal index from the loop counter`).toMatch(
        /v_deal_index := \(\(i - 1\) % array_length\(deal_ids, 1\)\) \+ 1;/,
      );
      expect(loop, `${tableName} should use the company attached to the selected deal index`).toContain(
        "company_ids[((v_deal_index - 1) % array_length(company_ids, 1)) + 1]",
      );
      expect(loop, `${tableName} should use the selected deal id directly`).toContain("deal_ids[v_deal_index]");
      expect(loop, `${tableName} should not use offset deal ids that can cross company boundaries`).not.toMatch(/deal_ids\[\(\(i [+-]/);
    }

    expect(activityLoop, "activities should use the contact attached to the selected deal index").toContain("contact_ids[v_deal_index]");
    expect(trialLoop, "trial loop should explicitly bind company and deal through the same index").toContain("v_deal_index := i;");
    expect(trialLoop).toContain("company_ids[i]");
    expect(trialLoop).toContain("deal_ids[v_deal_index]");
  });
});

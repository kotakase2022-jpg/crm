import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv, CsvParseError, parseEntityCsv } from "@/lib/crm/csv";
import { entityConfigs } from "@/lib/crm/entities";
import { leadStatuses } from "@/lib/crm/options";

const fixture = (name: string) => readFileSync(path.join(process.cwd(), "tests", "fixtures", "csv", name), "utf8");

describe("CSV parsing", () => {
  it("parses normal CSV including quoted commas", () => {
    const result = parseCsv(fixture("leads.valid.csv"), { requiredHeaders: ["name", "company_name"] });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[1].name).toBe("Quoted, Lead");
    expect(result.headers).toContain("monthly_projects");
  });

  it("parses quoted cells with embedded newlines", () => {
    const result = parseCsv('name,company_name,notes\nLead A,Sample Construction,"line 1\nline 2"\n');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].notes).toBe("line 1\nline 2");
  });

  it("rejects empty CSV and malformed rows", () => {
    expect(() => parseCsv(fixture("leads.empty.csv"))).toThrow(CsvParseError);
    expect(() => parseCsv(fixture("leads.invalid.csv"))).toThrow(CsvParseError);
  });

  it("rejects duplicate headers instead of silently overwriting imported values", () => {
    expect(() => parseCsv("name,company_name,email,email\nLead A,Sample Construction,a@example.test,b@example.test")).toThrow(
      "CSV has duplicate header: email",
    );
  });

  it("keeps numeric boundary values visible for import validation", () => {
    const result = parseCsv(fixture("leads.boundary.csv"), { requiredHeaders: ["name", "company_name"] });

    expect(result.rows[0].monthly_projects).toBe("0");
    expect(result.rows[1].monthly_documents).toBe("999999999");
  });

  it("validates entity CSV rows through the same field rules", () => {
    const csv = ["name,company_name,status,email,monthly_projects", `Lead A,Sample Construction,${leadStatuses[0]},lead@example.test,10`].join("\n");
    const rows = parseEntityCsv(entityConfigs.leads, csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].monthly_projects).toBe(10);
  });
});

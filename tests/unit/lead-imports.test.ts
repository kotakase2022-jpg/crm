import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/crm/csv";
import {
  assertTrustedSpreadsheetCsvUrl,
  defaultLeadImportStatus,
  normalizeLeadImportRow,
  spreadsheetUrlToCsvUrl,
} from "@/lib/crm/lead-import-utils";

function fixture(name: string) {
  return readFileSync(path.join(process.cwd(), "tests/fixtures/csv", name), "utf8");
}

describe("lead spreadsheet imports", () => {
  it("converts a Google Sheets URL to a CSV export URL while preserving gid", () => {
    const csvUrl = spreadsheetUrlToCsvUrl("https://docs.google.com/spreadsheets/d/sheet-id-123/edit#gid=987");

    expect(csvUrl).toBe("https://docs.google.com/spreadsheets/d/sheet-id-123/export?format=csv&gid=987");
  });

  it("keeps already published CSV URLs unchanged", () => {
    const url = "https://docs.google.com/spreadsheets/d/e/pub?output=csv";

    expect(spreadsheetUrlToCsvUrl(url)).toBe(url);
  });

  it("rejects arbitrary external CSV URLs before server-side fetch", () => {
    expect(() => spreadsheetUrlToCsvUrl("https://example.com/leads.csv")).toThrow(
      "Spreadsheet imports only support Google Sheets CSV URLs.",
    );
  });

  it("rejects link-local and non-HTTPS import URLs", () => {
    expect(() => assertTrustedSpreadsheetCsvUrl("http://169.254.169.254/latest/meta-data.csv")).toThrow(
      "Spreadsheet import URLs must use HTTPS.",
    );
    expect(() => assertTrustedSpreadsheetCsvUrl("https://169.254.169.254/latest/meta-data.csv")).toThrow(
      "Spreadsheet imports only support Google Sheets CSV URLs.",
    );
  });

  it("normalizes Japanese spreadsheet headers into a valid lead payload", () => {
    const { rows } = parseCsv(fixture("leads.spreadsheet-ja.csv"));
    const lead = normalizeLeadImportRow(rows[0], defaultLeadImportStatus);

    expect(lead).toMatchObject({
      name: "広告フォームA",
      company_name: "青葉建設",
      contact_name: "田中 太郎",
      email: "ad-a@example.test",
      source: "広告",
      status: "新規（広告経由）",
    });
  });

  it("falls back to the configured import status when a row status is unsupported", () => {
    const lead = normalizeLeadImportRow(
      {
        name: "Lead",
        company_name: "Sample Construction",
        status: "unsupported",
      },
      "新規（広告以外）",
    );

    expect(lead.status).toBe("新規（広告以外）");
  });
});

import { describe, expect, it, vi } from "vitest";
import { clsx } from "clsx";
import { cn } from "@/lib/utils";
import {
  dateInputValue,
  dateTimeInputValue,
  daysUntil,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatValue,
  isSameLocalDate,
  localDateString,
  optionLabelForField,
  offsetLocalDateString,
  recordTitle,
  relationOptionLabel,
  toDate,
  toFiniteNumber,
  toNumber,
} from "@/lib/crm/format";

describe("crm format utilities", () => {
  it("calculates numeric values without hiding invalid or empty input", () => {
    expect(toNumber(1200)).toBe(1200);
    expect(toNumber("1200")).toBe(1200);
    expect(toNumber("")).toBe(0);
    expect(Number.isNaN(toNumber("not-a-number"))).toBe(true);
    expect(toFiniteNumber("not-a-number")).toBe(0);
    expect(toFiniteNumber("not-a-number", 7)).toBe(7);
  });

  it("formats money, dates, relation labels, arrays, and booleans", () => {
    expect(formatCurrency(123456)).toContain("123,456");
    expect(formatCurrency("not-a-number")).toBe("-");
    expect(formatValue("expected_mrr", Number.POSITIVE_INFINITY)).toBe("-");
    expect(formatDate("2026-07-03T09:30:00.000Z")).toBe("2026-07-03");
    expect(formatDate("2026-02-31")).toBe("-");
    expect(formatDate("not-a-date")).toBe("-");
    expect(formatValue("renewal_on", "2026-13-01")).toBe("-");
    expect(formatValue("company_id", "company-1", { companies: [{ value: "company-1", label: "Acme" }] })).toBe("Acme");
    expect(formatValue("company_id", " company-1 ", { companies: [{ value: "company-1", label: "Acme" }] })).toBe("Acme");
    expect(formatValue("trial_id", "trial-1", { trials: [{ value: "trial-1", label: "Trial Jul" }] })).toBe("Trial Jul");
    expect(formatValue("subscription_id", "subscription-1", { contracts: [{ value: "subscription-1", label: "Pro Paid" }] })).toBe("Pro Paid");
    expect(formatValue("status", "customer")).toBe("顧客");
    expect(formatValue("status", "prospect")).toBe("見込み");
    expect(formatValue("status", "churned")).toBe("解約済み");
    expect(formatValue("issue_tags", ["slow", "paper"])).toBe("slow / paper");
    expect(formatValue("has_next_action", true)).not.toBe("-");
  });

  it("keeps persisted option values while exposing Japanese labels for CRM forms", () => {
    expect(
      optionLabelForField(
        {
          optionLabels: {
            prospect: "見込み",
            customer: "顧客",
          },
        },
        "customer",
      ),
    ).toBe("顧客");
    expect(optionLabelForField({ optionLabels: { prospect: "見込み" } }, "unknown")).toBe("unknown");
  });

  it("treats whitespace-only display values as empty instead of rendering invisible text", () => {
    expect(formatValue("notes", "   ")).toBe("-");
    expect(formatValue("issue_tags", [" slow ", "   ", "paper"])).toBe("slow / paper");
  });

  it("keeps lead relation labels searchable by both lead and company names", () => {
    expect(
      relationOptionLabel("leads", {
        id: "lead-1",
        name: "展示会フォロー",
        company_name: "春日リフォーム",
      }),
    ).toBe("展示会フォロー / 春日リフォーム");
    expect(relationOptionLabel("leads", { id: "lead-1", name: "春日リフォーム", company_name: "春日リフォーム" })).toBe("春日リフォーム");
  });

  it("formats non-lead relation option labels consistently", () => {
    expect(relationOptionLabel("companies", { id: "company-1", name: "青空工務店" })).toBe("青空工務店");
    expect(relationOptionLabel("companies", { id: "company-1", name: " " })).toBe("company-1");
    expect(relationOptionLabel("contacts", { id: "contact-1", email: "contact@example.test" })).toBe("contact@example.test");
    expect(relationOptionLabel("contacts", { id: "contact-1", name: " ", email: "contact@example.test" })).toBe("contact@example.test");
    expect(relationOptionLabel("deals", { id: "deal-1", name: "帳票導入" })).toBe("帳票導入");
    expect(relationOptionLabel("deals", { id: "deal-1", name: "" })).toBe("deal-1");
    expect(relationOptionLabel("trials", { id: "trial-1", start_date: "2026-07-01", end_date: "2026-07-14" })).toBe(
      "トライアル 2026-07-01〜2026-07-14",
    );
    expect(relationOptionLabel("trials", { id: "trial-2", start_date: "2026-02-31", end_date: "not-a-date" })).toBe("トライアル");
    expect(relationOptionLabel("trials", { id: "trial-3", start_date: "2026-02-31", end_date: "2026-07-14" })).toBe("トライアル 〜2026-07-14");
    expect(relationOptionLabel("contracts", { id: "subscription-1", plan: "Pro", status: "有料" })).toBe("Pro 有料");
    expect(relationOptionLabel("contracts", { id: "subscription-1", plan: "", status: "" })).toBe("未設定");
    expect(relationOptionLabel("tickets", { id: "ticket-1", title: "請求確認" })).toBe("請求確認");
    expect(relationOptionLabel("tickets", { id: "ticket-1", title: "" })).toBe("ticket-1");
  });

  it("uses the first non-empty title field for record headings", () => {
    expect(recordTitle({ id: "record-1", name: "", title: "  ", plan: "Starter" })).toBe("Starter");
    expect(recordTitle({ id: "record-1", name: "", title: "", plan: "", company_name: "" })).toBe("record-1");
  });

  it("handles date boundaries deterministically", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T00:00:00.000Z"));

    expect(daysUntil("2026-07-05")).toBe(2);
    expect(daysUntil("2026-07-02")).toBe(-1);
    expect(daysUntil("invalid")).toBeNull();
    expect(toDate("invalid")).toBeNull();
    expect(toDate("2026-02-31T09:30")).toBeNull();
    expect(toDate("2026-02-31T09:30:00.000Z")).toBeNull();
    expect(toDate("2026-07-05T24:00")).toBeNull();
    expect(toDate("2026-07-05T23:60")).toBeNull();
    expect(toDate("2026-07-05T23:59:60.000Z")).toBeNull();
    expect(toDate("2026-07-05T23:59:59.999Z")?.toISOString()).toBe("2026-07-05T23:59:59.999Z");
    expect(dateInputValue("2026-07-03T09:30:00.000Z")).toBe("2026-07-03");
    expect(dateInputValue("2026-02-31")).toBe("");
    expect(formatDateTime("not-a-date")).toBe("-");
    expect(formatDateTime("2026-02-31T09:30")).toBe("-");
    expect(formatDateTime("2026-07-05T24:00")).toBe("-");
    expect(formatValue("opened_at", "2026-02-31T09:30")).toBe("-");
    expect(dateTimeInputValue("invalid")).toBe("");
    expect(dateTimeInputValue("2026-02-31T09:30")).toBe("");
    expect(dateTimeInputValue("2026-07-05T24:00")).toBe("");

    vi.useRealTimers();
  });

  it("parses date-only values as local calendar dates", () => {
    const parsed = toDate("2026-07-05");

    expect(parsed).toEqual(new Date(2026, 6, 5));
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(6);
    expect(parsed?.getDate()).toBe(5);
    expect(parsed?.getHours()).toBe(0);
  });

  it("rejects invalid date-only values instead of rolling them forward", () => {
    expect(toDate("2026-02-31")).toBeNull();
    expect(toDate("2026-13-01")).toBeNull();
    expect(daysUntil("2026-02-31")).toBeNull();
  });

  it("formats local calendar dates without UTC date slicing drift", () => {
    expect(localDateString(new Date(2026, 6, 5, 0, 30))).toBe("2026-07-05");
    expect(offsetLocalDateString(1, new Date(2026, 6, 31, 12))).toBe("2026-08-01");
    expect(offsetLocalDateString(-1, new Date(2026, 0, 1, 12))).toBe("2025-12-31");
    expect(isSameLocalDate("2026-07-05T09:00", new Date(2026, 6, 5, 12))).toBe(true);
    expect(isSameLocalDate("2026-07-06T00:00", new Date(2026, 6, 5, 12))).toBe(false);
    expect(isSameLocalDate("not-a-date", new Date(2026, 6, 5, 12))).toBe(false);
  });

  it("formats datetime-local input values in the CRM time zone for edit forms", () => {
    const persistedInstant = "2026-07-04T15:30:00.000Z";

    expect(dateTimeInputValue(persistedInstant)).toBe("2026-07-05T00:30");
    expect(dateTimeInputValue(persistedInstant)).not.toBe(persistedInstant.slice(0, 16));
  });

  it("keeps class name composition stable", () => {
    expect(cn("a", false, "b")).toBe(clsx(["a", false, "b"]));
  });
});

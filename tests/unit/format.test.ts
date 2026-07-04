import { describe, expect, it, vi } from "vitest";
import { clsx } from "clsx";
import { cn } from "@/lib/utils";
import { dateInputValue, dateTimeInputValue, daysUntil, formatCurrency, formatDate, formatValue, toDate, toNumber } from "@/lib/crm/format";

describe("crm format utilities", () => {
  it("calculates numeric values without hiding invalid or empty input", () => {
    expect(toNumber(1200)).toBe(1200);
    expect(toNumber("1200")).toBe(1200);
    expect(toNumber("")).toBe(0);
    expect(Number.isNaN(toNumber("not-a-number"))).toBe(true);
  });

  it("formats money, dates, relation labels, arrays, and booleans", () => {
    expect(formatCurrency(123456)).toContain("123,456");
    expect(formatDate("2026-07-03T09:30:00.000Z")).toBe("2026-07-03");
    expect(formatValue("company_id", "company-1", { companies: [{ value: "company-1", label: "Acme" }] })).toBe("Acme");
    expect(formatValue("issue_tags", ["slow", "paper"])).toBe("slow / paper");
    expect(formatValue("has_next_action", true)).not.toBe("-");
  });

  it("handles date boundaries deterministically", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T00:00:00.000Z"));

    expect(daysUntil("2026-07-05")).toBe(2);
    expect(daysUntil("2026-07-02")).toBe(-1);
    expect(daysUntil("invalid")).toBeNull();
    expect(toDate("invalid")).toBeNull();
    expect(dateInputValue("2026-07-03T09:30:00.000Z")).toBe("2026-07-03");
    expect(dateTimeInputValue("invalid")).toBe("");

    vi.useRealTimers();
  });

  it("keeps class name composition stable", () => {
    expect(cn("a", false, "b")).toBe(clsx(["a", false, "b"]));
  });
});

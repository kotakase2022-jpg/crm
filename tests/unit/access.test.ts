import { describe, expect, it } from "vitest";
import { assertCanWriteTable, canWriteTable } from "@/lib/crm/access";

describe("CRM access control", () => {
  it("allows admin to write every CRM table", () => {
    expect(canWriteTable("admin", "leads")).toBe(true);
    expect(canWriteTable("admin", "billing_records")).toBe(true);
    expect(canWriteTable("admin", "support_tickets")).toBe(true);
  });

  it("keeps sales focused on sales workflow tables", () => {
    expect(canWriteTable("sales", "leads")).toBe(true);
    expect(canWriteTable("sales", "deals")).toBe(true);
    expect(canWriteTable("sales", "trials")).toBe(true);
    expect(canWriteTable("sales", "subscriptions")).toBe(false);
    expect(canWriteTable("sales", "billing_records")).toBe(false);
  });

  it("keeps support and finance scoped to their operational tables", () => {
    expect(canWriteTable("support", "support_tickets")).toBe(true);
    expect(canWriteTable("support", "deals")).toBe(false);
    expect(canWriteTable("finance", "subscriptions")).toBe(true);
    expect(canWriteTable("finance", "billing_records")).toBe(true);
    expect(canWriteTable("finance", "support_tickets")).toBe(false);
  });

  it("makes viewer read-only and throws for attempted writes", () => {
    expect(canWriteTable("viewer", "companies")).toBe(false);
    expect(() => assertCanWriteTable("viewer", "companies")).toThrow("この権限では更新できません。");
  });
});

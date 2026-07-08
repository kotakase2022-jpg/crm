import { describe, expect, it } from "vitest";
import { shouldShowEmptySelectOption, valueForField } from "@/components/crm/entity-form";
import { leadStatuses } from "@/lib/crm/options";
import type { EntityConfig, FieldConfig } from "@/lib/crm/types";

const formConfig = {
  slug: "leads",
  table: "leads",
  singular: "Lead",
  plural: "Leads",
  description: "",
  icon: "Sparkles",
  primaryField: "name",
  searchFields: ["name"],
  sortFields: ["created_at"],
  listFields: ["name"],
  detailFields: ["name"],
  fields: [],
  defaultValues: {},
} satisfies EntityConfig;

describe("entity form helpers", () => {
  it("normalizes select and multiselect defaults so imported padded values remain selected on edit forms", () => {
    const selectField = { name: "company_id", label: "Company", type: "select", relation: "companies" } satisfies FieldConfig;
    const multiSelectField = {
      name: "issue_tags",
      label: "Issues",
      type: "multiselect",
      options: ["見積作成が遅い", "請求漏れがある"],
    } satisfies FieldConfig;

    expect(valueForField(selectField, { id: "lead-1", company_id: " company-1 " }, formConfig)).toBe("company-1");
    expect(valueForField(multiSelectField, { id: "lead-1", issue_tags: [" 見積作成が遅い ", "", "請求漏れがある"] }, formConfig)).toEqual([
      "見積作成が遅い",
      "請求漏れがある",
    ]);
  });

  it("does not duplicate unset labels when a select already has an explicit unset option", () => {
    const leadStatusField = { name: "status", label: "Status", type: "select", options: leadStatuses } satisfies FieldConfig;
    const relationField = { name: "company_id", label: "Company", type: "select", relation: "companies" } satisfies FieldConfig;
    const plainSelectField = { name: "priority", label: "Priority", type: "select", options: ["Low", "High"] } satisfies FieldConfig;

    expect(shouldShowEmptySelectOption(leadStatusField)).toBe(false);
    expect(shouldShowEmptySelectOption(relationField)).toBe(true);
    expect(shouldShowEmptySelectOption(plainSelectField)).toBe(true);
  });
});

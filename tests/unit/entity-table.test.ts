import { describe, expect, it } from "vitest";
import { filterOptions } from "@/components/crm/entity-table";
import type { EntityConfig } from "@/lib/crm/types";

const dynamicFilterConfig = {
  slug: "companies",
  table: "companies",
  singular: "Company",
  plural: "Companies",
  description: "",
  icon: "Building2",
  primaryField: "name",
  searchFields: ["name"],
  filterField: "industry",
  sortFields: ["name"],
  listFields: ["name", "industry"],
  detailFields: ["name", "industry"],
  fields: [
    { name: "name", label: "Name", type: "text" },
    { name: "industry", label: "Industry", type: "text" },
  ],
} satisfies EntityConfig;

describe("entity table helpers", () => {
  it("normalizes dynamic filter options so imported padded values do not create duplicate choices", () => {
    const options = filterOptions(dynamicFilterConfig, [
      { id: "company-1", name: "A", industry: " 工務店 " },
      { id: "company-2", name: "B", industry: "工務店" },
      { id: "company-3", name: "C", industry: "   " },
      { id: "company-4", name: "D", industry: null },
      { id: "company-5", name: "E", industry: "リフォーム" },
    ]);

    expect(options).toEqual(["工務店", "リフォーム"]);
  });
});

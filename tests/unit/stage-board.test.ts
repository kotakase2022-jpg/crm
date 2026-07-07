import { describe, expect, it } from "vitest";
import { dealsForStage, stageListHref } from "@/components/crm/stage-board";

describe("deal stage board helpers", () => {
  it("keeps deals with padded stage labels visible in the right stage column", () => {
    const deals = [
      { id: "demo", name: "Demo deal", stage: " デモ実施 ", expected_mrr: 50000 },
      { id: "contract", name: "Contract deal", stage: "契約交渉", expected_mrr: 80000 },
      { id: "unknown", name: "Unknown deal", stage: "デモ 実施", expected_mrr: 30000 },
    ];

    expect(dealsForStage(deals, "デモ実施").map((deal) => deal.id)).toEqual(["demo"]);
    expect(dealsForStage(deals, "契約交渉").map((deal) => deal.id)).toEqual(["contract"]);
  });

  it("preserves parent relation filters when linking to the full stage list", () => {
    const href = stageListHref("デモ実施", {
      q: "山田工務店",
      sort: "expected_mrr",
      direction: "desc",
      view: "kanban",
      relationField: "company_id",
      relationId: "company-123",
    });

    const url = new URL(href, "https://example.test");

    expect(url.pathname).toBe("/deals");
    expect(url.searchParams.get("q")).toBe("山田工務店");
    expect(url.searchParams.get("filter")).toBe("デモ実施");
    expect(url.searchParams.get("sort")).toBe("expected_mrr");
    expect(url.searchParams.get("direction")).toBe("desc");
    expect(url.searchParams.get("view")).toBe("kanban");
    expect(url.searchParams.get("relation_field")).toBe("company_id");
    expect(url.searchParams.get("relation_id")).toBe("company-123");
  });
});

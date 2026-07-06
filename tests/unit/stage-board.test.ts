import { describe, expect, it } from "vitest";
import { dealsForStage } from "@/components/crm/stage-board";

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
});

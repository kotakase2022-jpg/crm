import { describe, expect, it } from "vitest";
import { buildNextActionTaskFromActivity } from "@/lib/crm/activity-next-action";

describe("activity next action task builder", () => {
  it("builds a linked task from an activity that has a next action", () => {
    expect(
      buildNextActionTaskFromActivity(
        {
          id: "activity-1",
          subject: "デモ後フォロー",
          content: "見積PDF送付後に電話する。",
          has_next_action: true,
          next_action_date: "2026-07-08",
          lead_id: "lead-1",
          company_id: "company-1",
          contact_id: "contact-1",
          deal_id: "deal-1",
        },
        new Date("2026-07-05T00:00:00.000Z"),
      ),
    ).toEqual({
      automation_key: "activity-next-action-activity-1",
      title: "デモ後フォロー",
      description: "見積PDF送付後に電話する。",
      status: "未完了",
      priority: "中",
      due_date: "2026-07-08",
      lead_id: "lead-1",
      company_id: "company-1",
      contact_id: "contact-1",
      deal_id: "deal-1",
    });
  });

  it("does not create work for plain activity notes", () => {
    expect(buildNextActionTaskFromActivity({ id: "activity-1", subject: "議事メモ", has_next_action: false })).toBeNull();
  });

  it("uses today when the user marks a next action without a date", () => {
    expect(
      buildNextActionTaskFromActivity(
        {
          id: "activity-2",
          subject: " ",
          content: "",
          has_next_action: true,
          company_id: "company-1",
        },
        new Date(2026, 6, 5, 0, 30),
      ),
    ).toMatchObject({
      title: "次回アクション",
      description: "活動履歴から作成された次回アクションです。",
      due_date: "2026-07-05",
      company_id: "company-1",
    });
  });
});

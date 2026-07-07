import { describe, expect, it } from "vitest";
import {
  activityRelationForEntity,
  completeRelationValues,
  hasRelationConsistencyValue,
  isActivityParentEntity,
  mergeRelationConsistencyValues,
  relatedActivitiesForTask,
  relatedRows,
  relationConsistencyErrors,
  relationHrefForField,
  relationIdValue,
  touchesRelationConsistencyField,
} from "@/lib/crm/related";

describe("related record helpers", () => {
  it("allows activities only on timeline-bearing parent entities", () => {
    expect(isActivityParentEntity("leads")).toBe(true);
    expect(isActivityParentEntity("companies")).toBe(true);
    expect(isActivityParentEntity("contacts")).toBe(true);
    expect(isActivityParentEntity("deals")).toBe(true);
    expect(isActivityParentEntity("tasks")).toBe(false);
    expect(isActivityParentEntity("tickets")).toBe(false);
  });

  it("derives company context when adding an activity from a contact", () => {
    expect(
      activityRelationForEntity("contacts", {
        id: "contact-1",
        company_id: "company-1",
      }),
    ).toEqual({
      contact_id: "contact-1",
      company_id: "company-1",
    });
  });

  it("derives company, contact, and lead context when adding an activity from a deal", () => {
    expect(
      activityRelationForEntity("deals", {
        id: "deal-1",
        company_id: "company-1",
        contact_id: "contact-1",
        lead_id: "lead-1",
      }),
    ).toEqual({
      deal_id: "deal-1",
      company_id: "company-1",
      contact_id: "contact-1",
      lead_id: "lead-1",
    });
  });

  it("shows activities connected through a task's business relationships", () => {
    const task = {
      id: "task-1",
      company_id: " company-1 ",
      deal_id: "deal-1",
    };

    const activities = [
      { id: "activity-company", company_id: "company-1", subject: "Company activity" },
      { id: "activity-deal", deal_id: " deal-1 ", subject: "Deal activity" },
      { id: "activity-task-id-collision", company_id: "task-1", subject: "Wrong activity" },
      { id: "activity-other", company_id: "company-2", subject: "Other activity" },
    ];

    expect(relatedActivitiesForTask(task, activities).map((activity) => activity.id)).toEqual(["activity-company", "activity-deal"]);
  });

  it("keeps related detail sections resilient to padded imported relation ids", () => {
    const rows = [
      { id: "contact-1", company_id: " company-1 " },
      { id: "contact-2", company_id: "company-2" },
      { id: "contact-empty", company_id: " " },
    ];

    expect(relatedRows(rows, "company_id", "company-1").map((row) => row.id)).toEqual(["contact-1"]);
    expect(relatedRows(rows, "company_id", " company-2 ").map((row) => row.id)).toEqual(["contact-2"]);
    expect(relatedRows(rows, "company_id", " ")).toEqual([]);
  });

  it("normalizes relation ids for lookups and persistence checks", () => {
    expect(relationIdValue(" company-1 ")).toBe("company-1");
    expect(relationIdValue("   ")).toBeNull();
    expect(relationIdValue(undefined)).toBeNull();
    expect(relationIdValue(123)).toBeNull();
  });

  it("returns an empty list when the task has no activity-bearing relationships", () => {
    expect(relatedActivitiesForTask({ id: "task-1" }, [{ id: "activity-1", company_id: "company-1" }])).toEqual([]);
    expect(relatedActivitiesForTask(null, [{ id: "activity-1", company_id: "company-1" }])).toEqual([]);
  });

  it("creates relation links only for known existing related records", () => {
    const relations = {
      companies: [{ value: "company-1", label: "Company 1" }],
      deals: [{ value: "deal-1", label: "Deal 1" }],
      trials: [{ value: "trial-1", label: "Trial 1" }],
      contracts: [{ value: "subscription-1", label: "Contract 1" }],
    };

    expect(relationHrefForField("company_id", "company-1", relations)).toBe("/companies/company-1");
    expect(relationHrefForField("company_id", " company-1 ", relations)).toBe("/companies/company-1");
    expect(relationHrefForField("deal_id", "deal-1", relations)).toBe("/deals/deal-1");
    expect(relationHrefForField("trial_id", "trial-1", relations)).toBe("/trials/trial-1");
    expect(relationHrefForField("subscription_id", "subscription-1", relations)).toBe("/contracts/subscription-1");
    expect(relationHrefForField("company_id", "missing-company", relations)).toBeNull();
    expect(relationHrefForField("trial_id", "missing-trial", relations)).toBeNull();
    expect(relationHrefForField("unknown_id", "company-1", relations)).toBeNull();
    expect(relationHrefForField("company_id", "", relations)).toBeNull();
    expect(relationHrefForField("company_id", undefined, relations)).toBeNull();
  });

  it("detects company/contact/deal/ticket relation mismatches before save", () => {
    expect(
      relationConsistencyErrors(
        {
          company_id: " company-1 ",
          contact_id: " contact-1 ",
          deal_id: " deal-1 ",
          support_ticket_id: " ticket-1 ",
        },
        {
          company: { id: "company-1" },
          contact: { id: "contact-1", company_id: "company-1" },
          deal: { id: "deal-1", company_id: "company-1", contact_id: "contact-1", lead_id: "lead-1" },
          ticket: { id: "ticket-1", company_id: "company-1", contact_id: "contact-1" },
        },
      ),
    ).toEqual([]);

    const errors = relationConsistencyErrors(
      {
        lead_id: "lead-1",
        company_id: "company-1",
        contact_id: "contact-1",
        deal_id: "deal-1",
        support_ticket_id: "ticket-1",
      },
      {
        lead: { id: "lead-1" },
        company: { id: "company-1" },
        contact: { id: "contact-1", company_id: "company-2" },
        deal: { id: "deal-1", company_id: "company-2", contact_id: "contact-2", lead_id: "lead-2" },
        ticket: { id: "ticket-1", company_id: "company-2", contact_id: "contact-2" },
      },
    );

    expect(errors).toEqual([
      "担当者は選択した会社に紐づくものを選択してください。",
      "商談は選択した会社に紐づくものを選択してください。",
      "リードは選択した商談に紐づくものを選択してください。",
      "担当者は選択した商談に紐づくものを選択してください。",
      "チケットは選択した会社に紐づくものを選択してください。",
      "担当者は選択したチケットに紐づくものを選択してください。",
    ]);
  });

  it("detects stale or deleted relation ids before save", () => {
    expect(
      relationConsistencyErrors(
        {
          lead_id: "missing-lead",
          company_id: "missing-company",
          contact_id: "missing-contact",
          deal_id: "missing-deal",
          support_ticket_id: "missing-ticket",
        },
        {
          lead: null,
          company: null,
          contact: null,
          deal: null,
          ticket: null,
        },
      ),
    ).toEqual([
      "選択したリードが見つかりません。最新の一覧から選び直してください。",
      "選択した会社が見つかりません。最新の一覧から選び直してください。",
      "選択した担当者が見つかりません。最新の一覧から選び直してください。",
      "選択した商談が見つかりません。最新の一覧から選び直してください。",
      "選択したチケットが見つかりません。最新の一覧から選び直してください。",
    ]);
  });

  it("detects subscription and trial relation problems before save", () => {
    expect(
      relationConsistencyErrors(
        {
          company_id: "company-1",
          subscription_id: "subscription-1",
          trial_id: "trial-1",
        },
        {
          company: { id: "company-1" },
          subscription: { id: "subscription-1", company_id: "company-1" },
          trial: { id: "trial-1", company_id: "company-1" },
        },
      ),
    ).toEqual([]);

    expect(
      relationConsistencyErrors(
        {
          company_id: "company-1",
          subscription_id: "subscription-1",
          trial_id: "trial-1",
        },
        {
          company: { id: "company-1" },
          subscription: { id: "subscription-1", company_id: "company-2" },
          trial: { id: "trial-1", company_id: "company-2" },
        },
      ),
    ).toEqual(["契約は選択した会社に紐づくものを選択してください。", "トライアルは選択した会社に紐づくものを選択してください。"]);

    expect(
      relationConsistencyErrors(
        {
          subscription_id: "missing-subscription",
          trial_id: "missing-trial",
        },
        {
          subscription: null,
          trial: null,
        },
      ),
    ).toEqual([
      "選択した契約が見つかりません。最新の一覧から選び直してください。",
      "選択したトライアルが見つかりません。最新の一覧から選び直してください。",
    ]);
  });

  it("merges existing relation values before validating partial updates", () => {
    const current = {
      id: "task-1",
      company_id: "company-1",
      lead_id: "lead-1",
      deal_id: "deal-1",
    };
    const values = { company_id: "company-2" };
    const merged = mergeRelationConsistencyValues(current, values);

    expect(touchesRelationConsistencyField(values)).toBe(true);
    expect(hasRelationConsistencyValue(merged)).toBe(true);
    expect(merged).toEqual({
      id: "task-1",
      company_id: "company-2",
      lead_id: "lead-1",
      deal_id: "deal-1",
    });
    expect(
      relationConsistencyErrors(merged, {
        lead: { id: "lead-1" },
        company: { id: "company-2" },
        deal: { id: "deal-1", company_id: "company-1", lead_id: "lead-2" },
      }),
    ).toEqual(["商談は選択した会社に紐づくものを選択してください。", "リードは選択した商談に紐づくものを選択してください。"]);

    expect(touchesRelationConsistencyField({ status: "完了" })).toBe(false);
    expect(mergeRelationConsistencyValues(current, { status: "完了" })).toEqual({ status: "完了" });
  });

  it("completes missing rollout relations from selected deals without adding unsupported fields", () => {
    const deal = {
      id: "deal-1",
      company_id: "company-1",
      contact_id: "contact-1",
      lead_id: "lead-1",
    };

    expect(
      completeRelationValues(
        { title: "フォロー", deal_id: "deal-1" },
        { deal },
        {
          allowedFields: ["lead_id", "company_id", "contact_id", "deal_id", "support_ticket_id"],
        },
      ),
    ).toEqual({
      title: "フォロー",
      deal_id: "deal-1",
      company_id: "company-1",
      contact_id: "contact-1",
      lead_id: "lead-1",
    });

    expect(
      completeRelationValues(
        { deal_id: "deal-1" },
        { deal },
        {
          allowedFields: ["company_id", "deal_id"],
        },
      ),
    ).toEqual({
      deal_id: "deal-1",
      company_id: "company-1",
    });

    expect(
      completeRelationValues(
        { deal_id: "deal-1", company_id: "company-2" },
        { deal },
        {
          allowedFields: ["company_id", "deal_id"],
        },
      ),
    ).toEqual({
        deal_id: "deal-1",
        company_id: "company-2",
      });

    expect(
      completeRelationValues(
        { support_ticket_id: "ticket-1" },
        {
          ticket: {
            id: "ticket-1",
            company_id: "company-2",
            contact_id: "contact-2",
          },
        },
        {
          allowedFields: ["lead_id", "company_id", "contact_id", "deal_id", "support_ticket_id"],
        },
      ),
    ).toEqual({
      support_ticket_id: "ticket-1",
      company_id: "company-2",
      contact_id: "contact-2",
    });

    expect(
      completeRelationValues(
        { deal_id: "deal-1", support_ticket_id: "ticket-1" },
        {
          deal,
          ticket: {
            id: "ticket-1",
            company_id: "company-2",
            contact_id: "contact-2",
          },
        },
        {
          allowedFields: ["lead_id", "company_id", "contact_id", "deal_id", "support_ticket_id"],
        },
      ),
    ).toEqual({
      deal_id: "deal-1",
      support_ticket_id: "ticket-1",
      company_id: "company-1",
      contact_id: "contact-1",
      lead_id: "lead-1",
    });

    expect(
      completeRelationValues(
        { subscription_id: "subscription-1" },
        {
          subscription: {
            id: "subscription-1",
            company_id: "company-3",
          },
        },
        {
          allowedFields: ["company_id", "subscription_id", "trial_id"],
        },
      ),
    ).toEqual({
      subscription_id: "subscription-1",
      company_id: "company-3",
    });

    expect(
      completeRelationValues(
        { trial_id: "trial-1" },
        {
          trial: {
            id: "trial-1",
            company_id: "company-4",
          },
        },
        {
          allowedFields: ["company_id", "subscription_id", "trial_id"],
        },
      ),
    ).toEqual({
      trial_id: "trial-1",
      company_id: "company-4",
    });
  });
});

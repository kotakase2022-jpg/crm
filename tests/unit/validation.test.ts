import { describe, expect, it } from "vitest";
import { entityConfigs } from "@/lib/crm/entities";
import { issueTags, leadStatuses } from "@/lib/crm/options";
import { CrmValidationError, parseActivityFormValues, parseEntityFormValues, parseEntityValues } from "@/lib/crm/validation";

describe("entity input validation", () => {
  it("coerces valid lead values from plain objects", () => {
    const values = parseEntityValues(entityConfigs.leads, {
      name: "Lead A",
      company_name: "Sample Construction",
      status: leadStatuses[0],
      email: "lead@example.test",
      issue_tags: [issueTags[0], issueTags[1]],
      monthly_projects: "0",
      monthly_documents: "25",
    });

    expect(values.name).toBe("Lead A");
    expect(values.monthly_projects).toBe(0);
    expect(values.monthly_documents).toBe(25);
    expect(values.issue_tags).toEqual([issueTags[0], issueTags[1]]);
  });

  it("rejects missing required fields and invalid email values", () => {
    expect(() =>
      parseEntityValues(entityConfigs.leads, {
        company_name: "",
        status: leadStatuses[0],
        email: "invalid-email",
      }),
    ).toThrow(CrmValidationError);

    try {
      parseEntityValues(entityConfigs.leads, {
        company_name: "",
        status: leadStatuses[0],
        email: "invalid-email",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CrmValidationError);
      expect((error as CrmValidationError).fieldErrors).toMatchObject({
        name: expect.any(String),
        company_name: expect.any(String),
        email: expect.any(String),
      });
    }
  });

  it("validates URL fields on the server side", () => {
    expect(
      parseEntityValues(entityConfigs.companies, {
        name: "Sample Construction",
        website: "https://example.test",
      }).website,
    ).toBe("https://example.test");

    expect(() =>
      parseEntityValues(entityConfigs.companies, {
        name: "Sample Construction",
        website: "not-a-url",
      }),
    ).toThrow(CrmValidationError);
  });

  it("enforces numeric min and max boundaries", () => {
    expect(
      parseEntityValues(entityConfigs.deals, {
        name: "Deal A",
        stage: entityConfigs.deals.defaultValues?.stage,
        probability: "100",
        expected_mrr: "50000",
      }).probability,
    ).toBe(100);

    expect(() =>
      parseEntityValues(entityConfigs.deals, {
        name: "Deal A",
        stage: entityConfigs.deals.defaultValues?.stage,
        probability: "101",
      }),
    ).toThrow(CrmValidationError);
  });

  it("coerces FormData multiselect and datetime-local fields", () => {
    const formData = new FormData();
    formData.set("company_id", "company-1");
    formData.set("start_date", "2026-07-03");
    formData.set("end_date", "2026-07-31");
    formData.set("first_login_at", "2026-07-04T09:30");
    formData.set("activation_level", "7");

    const values = parseEntityFormValues(entityConfigs.trials, formData);

    expect(values.first_login_at).toBe(new Date("2026-07-04T09:30").toISOString());
    expect(values.activation_level).toBe(7);
  });

  it("rejects invalid date and datetime values before persistence", () => {
    expect(() =>
      parseEntityValues(entityConfigs.trials, {
        company_id: "company-1",
        start_date: "2026-02-31",
        end_date: "2026-07-31",
        first_login_at: "2026-02-31T09:30",
      }),
    ).toThrow(CrmValidationError);

    try {
      parseEntityValues(entityConfigs.trials, {
        company_id: "company-1",
        start_date: "2026-02-31",
        end_date: "2026-07-31",
        first_login_at: "2026-02-31T09:30",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CrmValidationError);
      expect((error as CrmValidationError).fieldErrors).toMatchObject({
        start_date: expect.any(String),
        first_login_at: expect.any(String),
      });
    }
  });

  it("validates activity form datetime and next action date before persistence", () => {
    const formData = new FormData();
    formData.set("type", "メモ");
    formData.set("subject", "デモ後フォロー");
    formData.set("content", "次回確認事項を整理");
    formData.set("occurred_at", "2026-07-04T09:30");
    formData.set("has_next_action", "on");
    formData.set("next_action_date", "2026-07-05");

    expect(parseActivityFormValues(formData)).toMatchObject({
      type: "メモ",
      subject: "デモ後フォロー",
      content: "次回確認事項を整理",
      occurred_at: new Date("2026-07-04T09:30").toISOString(),
      has_next_action: true,
      next_action_date: "2026-07-05",
    });

    formData.set("occurred_at", "not-a-datetime");
    formData.set("next_action_date", "2026-02-31");

    expect(() => parseActivityFormValues(formData)).toThrow(CrmValidationError);

    try {
      parseActivityFormValues(formData);
    } catch (error) {
      expect(error).toBeInstanceOf(CrmValidationError);
      expect((error as CrmValidationError).fieldErrors).toMatchObject({
        occurred_at: expect.any(String),
        next_action_date: expect.any(String),
      });
    }

    formData.set("occurred_at", "2026-02-31T09:30");
    formData.set("next_action_date", "2026-07-05");

    expect(() => parseActivityFormValues(formData)).toThrow(CrmValidationError);
  });
});

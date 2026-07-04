import { describe, expect, it } from "vitest";
import { entityConfigs } from "@/lib/crm/entities";
import { issueTags, leadStatuses } from "@/lib/crm/options";
import { CrmValidationError, parseEntityFormValues, parseEntityValues } from "@/lib/crm/validation";

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
});

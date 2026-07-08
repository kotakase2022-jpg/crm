import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeTask, convertLead, createActivityForEntity, createRecord, reopenTask, softDeleteRecord, updateRecord } from "@/lib/crm/data";
import { getEntityConfig } from "@/lib/crm/entities";
import { LeadImportValidationError } from "@/lib/crm/lead-imports";
import { CrmValidationError, parseActivityFormValues, parseEntityFormValues } from "@/lib/crm/validation";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const mocks = vi.hoisted(() => {
  function isSafeInternalPath(path: string) {
    return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !/[\u0000-\u001f\u007f]/.test(path);
  }

  function defaultSafeInternalRedirectPath(value: unknown, fallback = "/dashboard") {
    const safeFallback = isSafeInternalPath(fallback) ? fallback : "/dashboard";
    const path = typeof value === "string" ? value.trim() : "";

    if (!path || !isSafeInternalPath(path)) {
      return safeFallback;
    }

    return path;
  }

  return {
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
    runLeadImportSetting: vi.fn(),
    safeInternalRedirectPath: vi.fn(defaultSafeInternalRedirectPath),
    saveLeadImportSetting: vi.fn(),
    defaultSafeInternalRedirectPath,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/crm/data", () => ({
  completeTask: vi.fn(),
  convertLead: vi.fn(),
  createActivityForEntity: vi.fn(),
  createRecord: vi.fn(),
  generateAutomationTasks: vi.fn(),
  reopenTask: vi.fn(),
  softDeleteRecord: vi.fn(),
  updateRecord: vi.fn(),
}));

vi.mock("@/lib/crm/entities", () => ({
  getEntityConfig: vi.fn(),
}));

vi.mock("@/lib/crm/lead-imports", () => ({
  LeadImportValidationError: class LeadImportValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "LeadImportValidationError";
    }
  },
  runLeadImportSetting: mocks.runLeadImportSetting,
  saveLeadImportSetting: mocks.saveLeadImportSetting,
}));

vi.mock("@/lib/crm/navigation", () => ({
  safeInternalRedirectPath: mocks.safeInternalRedirectPath,
}));

vi.mock("@/lib/crm/validation", () => ({
  CrmValidationError: class CrmValidationError extends Error {
    fieldErrors: Record<string, string>;

    constructor(fieldErrors: Record<string, string>) {
      super(Object.values(fieldErrors).join("\n"));
      this.name = "CrmValidationError";
      this.fieldErrors = fieldErrors;
    }
  },
  parseActivityFormValues: vi.fn(),
  parseEntityFormValues: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: vi.fn(() => ({ configured: false })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("CRM server actions", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset();
    mocks.redirect.mockReset();
    mocks.runLeadImportSetting.mockReset();
    mocks.safeInternalRedirectPath.mockReset();
    mocks.safeInternalRedirectPath.mockImplementation(mocks.defaultSafeInternalRedirectPath);
    mocks.saveLeadImportSetting.mockReset();
    vi.mocked(createClient).mockReset();
    vi.mocked(completeTask).mockReset();
    vi.mocked(convertLead).mockReset();
    vi.mocked(createActivityForEntity).mockReset();
    vi.mocked(createRecord).mockReset();
    vi.mocked(getEntityConfig).mockReset();
    vi.mocked(getSupabaseEnv).mockReset();
    vi.mocked(getSupabaseEnv).mockReturnValue({ configured: false } as never);
    vi.mocked(parseActivityFormValues).mockReset();
    vi.mocked(parseEntityFormValues).mockReset();
    vi.mocked(reopenTask).mockReset();
    vi.mocked(softDeleteRecord).mockReset();
    vi.mocked(updateRecord).mockReset();
  });

  function revalidatedPaths() {
    return mocks.revalidatePath.mock.calls.map(([path]) => path);
  }

  function expectRevalidatedBeforeRedirect() {
    const revalidateOrders = mocks.revalidatePath.mock.invocationCallOrder;
    const redirectOrder = mocks.redirect.mock.invocationCallOrder[0];

    expect(revalidateOrders.length).toBeGreaterThan(0);
    expect(redirectOrder).toBeDefined();
    expect(Math.max(...revalidateOrders)).toBeLessThan(redirectOrder);
  }

  function mockConfig(slug: "deals" | "tasks" | "tickets", fields: Array<Record<string, unknown>> = []) {
    const tableBySlug = {
      deals: "deals",
      tasks: "tasks",
      tickets: "support_tickets",
    } as const;

    vi.mocked(getEntityConfig).mockReturnValue({
      slug,
      table: tableBySlug[slug],
      singular: slug,
      plural: slug,
      description: "",
      icon: "ListChecks",
      primaryField: "id",
      searchFields: [],
      sortFields: [],
      listFields: [],
      detailFields: [],
      fields,
    } as never);
  }

  it("revalidates entity, related, and operational views after record creation", async () => {
    mockConfig("tasks");
    vi.mocked(parseEntityFormValues).mockReturnValue({ title: "Follow up" } as never);
    vi.mocked(createRecord).mockResolvedValue({
      id: "task-1",
      company_id: "company-1",
      deal_id: "deal-1",
      support_ticket_id: "ticket-1",
    } as never);

    const { createEntityAction } = await import("@/lib/crm/actions");

    await createEntityAction("tasks", new FormData());

    expect(parseEntityFormValues).toHaveBeenCalled();
    expect(createRecord).toHaveBeenCalledWith(expect.objectContaining({ slug: "tasks", table: "tasks" }), { title: "Follow up" });
    expect(revalidatedPaths()).toEqual([
      "/tasks",
      "/companies/company-1",
      "/deals/deal-1",
      "/tickets/ticket-1",
      "/dashboard",
      "/reports",
    ]);
    expect(mocks.redirect).toHaveBeenCalledWith("/tasks/task-1?toast=created");
    expectRevalidatedBeforeRedirect();
  });

  it("returns to the create form without saving when server-side validation fails", async () => {
    mockConfig("tasks");
    vi.mocked(parseEntityFormValues).mockImplementation(() => {
      throw new CrmValidationError({ title: "Required" });
    });

    const { createEntityAction } = await import("@/lib/crm/actions");

    await createEntityAction("tasks", new FormData());

    expect(createRecord).not.toHaveBeenCalled();
    expect(revalidatedPaths()).toEqual([]);
    expect(mocks.redirect).toHaveBeenCalledWith("/tasks/new?toast=validation-error");
  });

  it("preserves parent relation context when create validation fails", async () => {
    mockConfig("tasks", [
      { name: "company_id", label: "Company", type: "select", relation: "companies" },
      { name: "deal_id", label: "Deal", type: "select", relation: "deals" },
      { name: "title", label: "Title", type: "text", required: true },
    ]);
    vi.mocked(parseEntityFormValues).mockImplementation(() => {
      throw new CrmValidationError({ title: "Required" });
    });
    const formData = new FormData();
    formData.set("company_id", " company-1 ");
    formData.set("deal_id", "deal-1");
    formData.set("title", "");

    const { createEntityAction } = await import("@/lib/crm/actions");

    await createEntityAction("tasks", formData);

    expect(createRecord).not.toHaveBeenCalled();
    expect(revalidatedPaths()).toEqual([]);
    expect(mocks.redirect).toHaveBeenCalledWith("/tasks/new?toast=validation-error&company_id=company-1&deal_id=deal-1");
  });

  it("revalidates entity detail, related records, operational views, and task alerts after deal updates", async () => {
    mockConfig("deals");
    vi.mocked(parseEntityFormValues).mockReturnValue({ stage: "Demo done" } as never);
    vi.mocked(updateRecord).mockResolvedValue({
      id: "deal-1",
      company_id: "company-1",
      contact_id: "contact-1",
    } as never);

    const { updateEntityAction } = await import("@/lib/crm/actions");

    await updateEntityAction("deals", "deal-1", new FormData());

    expect(updateRecord).toHaveBeenCalledWith(expect.objectContaining({ slug: "deals", table: "deals" }), "deal-1", { stage: "Demo done" });
    expect(revalidatedPaths()).toEqual([
      "/deals",
      "/deals/deal-1",
      "/companies/company-1",
      "/contacts/contact-1",
      "/dashboard",
      "/reports",
      "/tasks",
    ]);
    expect(mocks.redirect).toHaveBeenCalledWith("/deals/deal-1?toast=updated");
    expectRevalidatedBeforeRedirect();
  });

  it("returns to the edit form without saving when server-side validation fails", async () => {
    mockConfig("deals");
    vi.mocked(parseEntityFormValues).mockImplementation(() => {
      throw new CrmValidationError({ probability: "Out of range" });
    });

    const { updateEntityAction } = await import("@/lib/crm/actions");

    await updateEntityAction("deals", "deal-1", new FormData());

    expect(updateRecord).not.toHaveBeenCalled();
    expect(revalidatedPaths()).toEqual([]);
    expect(mocks.redirect).toHaveBeenCalledWith("/deals/deal-1/edit?toast=validation-error");
  });

  it("revalidates related records and operational views after soft delete", async () => {
    mockConfig("tickets");
    vi.mocked(softDeleteRecord).mockResolvedValue({
      id: "ticket-1",
      company_id: "company-1",
      contact_id: "contact-1",
    } as never);

    const { deleteEntityAction } = await import("@/lib/crm/actions");

    await deleteEntityAction("tickets", "ticket-1");

    expect(softDeleteRecord).toHaveBeenCalledWith(expect.objectContaining({ slug: "tickets", table: "support_tickets" }), "ticket-1");
    expect(revalidatedPaths()).toEqual([
      "/tickets",
      "/companies/company-1",
      "/contacts/contact-1",
      "/dashboard",
      "/reports",
    ]);
    expect(mocks.redirect).toHaveBeenCalledWith("/tickets?toast=deleted");
    expectRevalidatedBeforeRedirect();
  });

  it("revalidates task and operational views after a spreadsheet lead import run", async () => {
    mocks.runLeadImportSetting.mockResolvedValue({
      settingId: "setting-1",
      status: "success",
      importedCount: 2,
      skippedCount: 1,
      message: "Imported test leads.",
    });

    const { runLeadImportSettingAction } = await import("@/lib/crm/actions");

    await runLeadImportSettingAction("setting-1");

    expect(mocks.runLeadImportSetting).toHaveBeenCalledWith("setting-1");
    expect(revalidatedPaths().toSorted()).toEqual([
      "/dashboard",
      "/leads",
      "/leads/import-settings",
      "/reports",
      "/tasks",
    ].toSorted());
    expect(mocks.redirect).toHaveBeenCalledWith("/leads/import-settings?toast=import-success&imported=2&skipped=1");
    expectRevalidatedBeforeRedirect();
  });

  it("returns to import settings without success revalidation when the spreadsheet URL is invalid", async () => {
    mocks.saveLeadImportSetting.mockRejectedValue(new LeadImportValidationError("Invalid spreadsheet URL."));

    const { saveLeadImportSettingAction } = await import("@/lib/crm/actions");

    await saveLeadImportSettingAction(new FormData());

    expect(mocks.saveLeadImportSetting).toHaveBeenCalled();
    expect(revalidatedPaths()).toEqual([]);
    expect(mocks.redirect).toHaveBeenCalledWith("/leads/import-settings?toast=settings-error");
  });

  it("revalidates operational views after an activity even without a next action", async () => {
    vi.mocked(parseActivityFormValues).mockReturnValue({ has_next_action: false } as never);
    vi.mocked(createActivityForEntity).mockResolvedValue({ id: "act-1" } as never);

    const { createActivityAction } = await import("@/lib/crm/actions");

    await createActivityAction("leads", "lead-1", new FormData());

    const paths = revalidatedPaths();
    expect(paths).toContain("/dashboard");
    expect(paths).toContain("/reports");
    expect(paths).not.toContain("/tasks");
    expect(mocks.redirect).toHaveBeenCalledWith("/leads/lead-1?toast=activity");
    expectRevalidatedBeforeRedirect();
  });

  it("returns to the parent detail without creating an activity when activity validation fails", async () => {
    vi.mocked(parseActivityFormValues).mockImplementation(() => {
      throw new CrmValidationError({ subject: "Required" });
    });

    const { createActivityAction } = await import("@/lib/crm/actions");

    await createActivityAction("leads", "lead-1", new FormData());

    expect(createActivityForEntity).not.toHaveBeenCalled();
    expect(revalidatedPaths()).toEqual([]);
    expect(mocks.redirect).toHaveBeenCalledWith("/leads/lead-1?toast=validation-error");
  });

  it("also revalidates the task list when the activity has a next action", async () => {
    vi.mocked(parseActivityFormValues).mockReturnValue({ has_next_action: true } as never);
    vi.mocked(createActivityForEntity).mockResolvedValue({ id: "act-2" } as never);

    const { createActivityAction } = await import("@/lib/crm/actions");

    await createActivityAction("leads", "lead-1", new FormData());

    const paths = revalidatedPaths();
    expect(paths).toContain("/dashboard");
    expect(paths).toContain("/reports");
    expect(paths).toContain("/tasks");
    expectRevalidatedBeforeRedirect();
  });

  it("revalidates the task detail before redirecting after task completion changes", async () => {
    vi.mocked(completeTask).mockResolvedValue({ id: "task-1", company_id: "company-1" } as never);
    vi.mocked(reopenTask).mockResolvedValue({ id: "task-1", company_id: "company-1" } as never);

    const { completeTaskAction, reopenTaskAction } = await import("@/lib/crm/actions");

    await completeTaskAction("task-1");

    expect(revalidatedPaths()).toEqual(["/tasks", "/tasks/task-1", "/companies/company-1", "/dashboard", "/reports"]);
    expect(mocks.redirect).toHaveBeenCalledWith("/tasks/task-1?toast=completed");
    expectRevalidatedBeforeRedirect();

    mocks.revalidatePath.mockClear();
    mocks.redirect.mockClear();

    await reopenTaskAction("task-1");

    expect(revalidatedPaths()).toEqual(["/tasks", "/tasks/task-1", "/companies/company-1", "/dashboard", "/reports"]);
    expect(mocks.redirect).toHaveBeenCalledWith("/tasks/task-1?toast=reopened");
    expectRevalidatedBeforeRedirect();
  });

  it("revalidates the converted lead detail before redirecting to the new deal", async () => {
    vi.mocked(convertLead).mockResolvedValue("deal-1" as never);

    const { convertLeadAction } = await import("@/lib/crm/actions");

    await convertLeadAction("lead-1");

    expect(convertLead).toHaveBeenCalledWith("lead-1");
    expect(revalidatedPaths()).toEqual([
      "/leads",
      "/leads/lead-1",
      "/companies",
      "/contacts",
      "/deals",
      "/tasks",
      "/dashboard",
      "/reports",
    ]);
    expect(mocks.redirect).toHaveBeenCalledWith("/deals/deal-1?toast=converted");
    expectRevalidatedBeforeRedirect();
  });

  it("normalizes sign-in email without altering the password", async () => {
    vi.mocked(getSupabaseEnv).mockReturnValue({ configured: true } as never);
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({ auth: { signInWithPassword } } as never);
    const formData = new FormData();
    formData.set("email", " sales@example.test ");
    formData.set("password", " pass with edge spaces ");
    formData.set("next", "/dashboard");

    const { signInAction } = await import("@/lib/crm/actions");

    await signInAction(formData);

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "sales@example.test",
      password: " pass with edge spaces ",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("sanitizes direct sign-in next targets before redirecting after auth success", async () => {
    vi.mocked(getSupabaseEnv).mockReturnValue({ configured: true } as never);
    const signInWithPassword = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({ auth: { signInWithPassword } } as never);
    const formData = new FormData();
    formData.set("email", "sales@example.test");
    formData.set("password", "password");
    formData.set("next", "https://evil.example/phishing");

    const { signInAction } = await import("@/lib/crm/actions");

    await signInAction(formData);

    expect(mocks.safeInternalRedirectPath).toHaveBeenCalledWith("https://evil.example/phishing");
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects sign-in failures back to login with an error and safe next path", async () => {
    vi.mocked(getSupabaseEnv).mockReturnValue({ configured: true } as never);
    const signInWithPassword = vi.fn().mockResolvedValue({ error: new Error("Invalid login credentials") });
    vi.mocked(createClient).mockResolvedValue({ auth: { signInWithPassword } } as never);
    const formData = new FormData();
    formData.set("email", "sales@example.test");
    formData.set("password", "wrong-password");
    formData.set("next", "/deals?stage=demo");

    const { signInAction } = await import("@/lib/crm/actions");

    await signInAction(formData);

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "sales@example.test",
      password: "wrong-password",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/login?error=${encodeURIComponent("メールアドレスまたはパスワードを確認してください。")}&next=${encodeURIComponent("/deals?stage=demo")}`,
    );
  });

  it("sanitizes direct sign-in next targets before redirecting after auth failure", async () => {
    vi.mocked(getSupabaseEnv).mockReturnValue({ configured: true } as never);
    const signInWithPassword = vi.fn().mockResolvedValue({ error: new Error("Invalid login credentials") });
    vi.mocked(createClient).mockResolvedValue({ auth: { signInWithPassword } } as never);
    const formData = new FormData();
    formData.set("email", "sales@example.test");
    formData.set("password", "wrong-password");
    formData.set("next", "https://evil.example/phishing");

    const { signInAction } = await import("@/lib/crm/actions");

    await signInAction(formData);

    const redirectTarget = String(mocks.redirect.mock.calls.find(([target]) => String(target).startsWith("/login?error="))?.[0]);
    const params = new URL(`https://crm.example.test${redirectTarget}`).searchParams;

    expect(mocks.safeInternalRedirectPath).toHaveBeenCalledWith("https://evil.example/phishing");
    expect(params.get("next")).toBe("/dashboard");
    expect(redirectTarget).not.toContain("evil.example");
  });

  it("normalizes sign-up email without altering the password", async () => {
    vi.mocked(getSupabaseEnv).mockReturnValue({ configured: true } as never);
    const signUp = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({ auth: { signUp } } as never);
    const formData = new FormData();
    formData.set("email", " cs@example.test ");
    formData.set("password", " secret ");
    formData.set("next", "/dashboard");

    const { signUpAction } = await import("@/lib/crm/actions");

    await signUpAction(formData);

    expect(signUp).toHaveBeenCalledWith({
      email: "cs@example.test",
      password: " secret ",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/login?notice=${encodeURIComponent("アカウントを作成しました。確認が必要な場合はメールを確認してください。")}&next=${encodeURIComponent("/dashboard")}`,
    );
  });

  it("sanitizes direct sign-up next targets before redirecting to the confirmation notice", async () => {
    vi.mocked(getSupabaseEnv).mockReturnValue({ configured: true } as never);
    const signUp = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockResolvedValue({ auth: { signUp } } as never);
    const formData = new FormData();
    formData.set("email", "cs@example.test");
    formData.set("password", "secret");
    formData.set("next", "https://evil.example/phishing");

    const { signUpAction } = await import("@/lib/crm/actions");

    await signUpAction(formData);

    const redirectTarget = String(mocks.redirect.mock.calls.at(-1)?.[0]);
    const params = new URL(`https://crm.example.test${redirectTarget}`).searchParams;

    expect(mocks.safeInternalRedirectPath).toHaveBeenCalledWith("https://evil.example/phishing");
    expect(params.get("next")).toBe("/dashboard");
    expect(redirectTarget).not.toContain("evil.example");
  });

  it("redirects sign-up failures back to login with a safe generic error", async () => {
    vi.mocked(getSupabaseEnv).mockReturnValue({ configured: true } as never);
    const signUp = vi.fn().mockResolvedValue({ error: new Error("User already registered") });
    vi.mocked(createClient).mockResolvedValue({ auth: { signUp } } as never);
    const formData = new FormData();
    formData.set("email", "cs@example.test");
    formData.set("password", "secret");
    formData.set("next", "/reports");

    const { signUpAction } = await import("@/lib/crm/actions");

    await signUpAction(formData);

    expect(signUp).toHaveBeenCalledWith({
      email: "cs@example.test",
      password: "secret",
    });
    expect(mocks.redirect).toHaveBeenCalledWith(
      `/login?error=${encodeURIComponent("メールアドレスまたはパスワードを確認してください。")}&next=${encodeURIComponent("/reports")}`,
    );
  });

  it("sanitizes direct sign-up next targets before redirecting after auth failure", async () => {
    vi.mocked(getSupabaseEnv).mockReturnValue({ configured: true } as never);
    const signUp = vi.fn().mockResolvedValue({ error: new Error("User already registered") });
    vi.mocked(createClient).mockResolvedValue({ auth: { signUp } } as never);
    const formData = new FormData();
    formData.set("email", "cs@example.test");
    formData.set("password", "secret");
    formData.set("next", "https://evil.example/phishing");

    const { signUpAction } = await import("@/lib/crm/actions");

    await signUpAction(formData);

    const redirectTarget = String(mocks.redirect.mock.calls.find(([target]) => String(target).startsWith("/login?error="))?.[0]);
    const params = new URL(`https://crm.example.test${redirectTarget}`).searchParams;

    expect(mocks.safeInternalRedirectPath).toHaveBeenCalledWith("https://evil.example/phishing");
    expect(params.get("next")).toBe("/dashboard");
    expect(redirectTarget).not.toContain("evil.example");
  });
});

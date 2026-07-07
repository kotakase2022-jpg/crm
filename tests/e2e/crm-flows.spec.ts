import { expect, test, type Page } from "@playwright/test";
import { attachStrictPageChecks } from "./strict-page";

async function selectFirstRealOption(page: Page, name: string) {
  await page.locator(`select[name="${name}"]`).selectOption({ index: 1 });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("initial dashboard and main navigation load without browser errors", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/dashboard");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('a[href="/leads"]').first()).toBeVisible();

  for (const href of ["/leads", "/companies", "/contacts", "/deals", "/tasks", "/trials", "/contracts", "/tickets", "/reports", "/settings"]) {
    await page.locator(`a[href="${href}"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`${href.replace("/", "\\/")}(?:\\?.*)?$`));
    await expect(page.locator("main")).toBeVisible();
  }

  await strict.expectClean();
});

test("login page sanitizes external next redirects", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/login?next=https%3A%2F%2Fevil.example%2Fphishing");

  await expect(page.locator('input[name="next"]')).toHaveValue("/dashboard");
  await expect(page.locator("main")).toContainText("建設帳票CRM");
  await strict.expectClean();
});

const createScenarios = [
  {
    entity: "companies",
    visibleMarkerPrefix: "E2E Company",
    fill: async (page, marker: string) => {
      await expect(page.locator('select[name="status"] option:checked')).toContainText("見込み");
      await page.locator('input[name="name"]').fill(marker);
    },
    assertDetail: async (page) => {
      await expect(page.locator("body")).toContainText("見込み");
      await expect(page.locator("body")).not.toContainText("prospect");
    },
  },
  {
    entity: "contacts",
    visibleMarkerPrefix: "E2E Contact",
    fill: async (page, marker: string) => {
      await selectFirstRealOption(page, "company_id");
      await page.locator('input[name="name"]').fill(marker);
    },
  },
  {
    entity: "deals",
    visibleMarkerPrefix: "E2E Deal",
    fill: async (page, marker: string) => {
      await page.locator('input[name="name"]').fill(marker);
      await page.locator('input[name="expected_mrr"]').fill("32000");
    },
  },
  {
    entity: "tasks",
    visibleMarkerPrefix: "E2E Task",
    fill: async (page, marker: string) => {
      await page.locator('input[name="title"]').fill(marker);
      await page.locator('input[name="due_date"]').fill("2026-07-10");
    },
  },
  {
    entity: "trials",
    visibleMarkerPrefix: "E2E Trial",
    fill: async (page, marker: string) => {
      await selectFirstRealOption(page, "company_id");
      await page.locator('input[name="start_date"]').fill("2026-07-04");
      await page.locator('input[name="end_date"]').fill("2026-07-18");
      await page.locator('textarea[name="notes"]').fill(marker);
    },
  },
  {
    entity: "contracts",
    visibleMarkerPrefix: "E2E Contract",
    fill: async (page, marker: string) => {
      await selectFirstRealOption(page, "company_id");
      await selectFirstRealOption(page, "plan");
      await page.locator('input[name="mrr"]').fill("48000");
      await page.locator('input[name="started_on"]').fill("2026-07-04");
      await page.locator('textarea[name="notes"]').fill(marker);
    },
  },
  {
    entity: "tickets",
    visibleMarkerPrefix: "E2E Ticket",
    fill: async (page, marker: string) => {
      await selectFirstRealOption(page, "company_id");
      await page.locator('input[name="title"]').fill(marker);
    },
  },
] satisfies Array<{
  entity: string;
  visibleMarkerPrefix: string;
  fill: (page: Page, marker: string) => Promise<void>;
  assertDetail?: (page: Page) => Promise<void>;
}>;

for (const scenario of createScenarios) {
  test(`${scenario.entity} creation persists to its detail page`, async ({ page }) => {
    const strict = attachStrictPageChecks(page);
    const marker = `${scenario.visibleMarkerPrefix} ${Date.now()}`;

    await page.goto(`/${scenario.entity}/new`);
    await scenario.fill(page, marker);
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page).toHaveURL(new RegExp(`/${scenario.entity}/[^/]+\\?toast=created$`));
    await expect(page.locator("body")).toContainText(marker);
    await scenario.assertDetail?.(page);
    await strict.expectClean();
  });
}

test("lead creation persists to the detail page and converts into a deal", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const unique = Date.now();
  const leadName = `E2E Lead ${unique}`;
  const companyName = `E2E Construction ${unique}`;

  await page.goto("/leads/new");
  await page.locator('input[name="name"]').fill(leadName);
  await page.locator('input[name="company_name"]').fill(companyName);
  await page.locator('input[name="contact_name"]').fill(`E2E Contact ${unique}`);
  await page.locator('input[name="email"]').fill(`lead-${unique}@example.test`);
  await page.locator('input[name="phone"]').fill("050-1234-5678");
  await page.locator('input[name="monthly_projects"]').fill("8");
  await page.locator('input[name="monthly_documents"]').fill("40");
  await page.locator("form button").last().click();

  await expect(page).toHaveURL(/\/leads\/[^/]+\?toast=created$/);
  await expect(page.locator("body")).toContainText(leadName);
  await expect(page.locator("body")).toContainText(companyName);
  await expect(page.locator("body")).toContainText("初回架電");
  const leadPath = new URL(page.url()).pathname;

  await page.locator("main form button").first().click();

  await expect(page).toHaveURL(/\/deals\/[^/]+\?toast=converted$/);
  await expect(page.locator("body")).toContainText(companyName);
  await expect(page.locator("body")).toContainText("デモ日程確認");
  await expect(page.locator("body")).toContainText("ID:");

  await page.goto(leadPath);
  await expect(page.locator("body")).toContainText(leadName);
  await expect(page.locator("dl")).toContainText("商談化");
  await expect(page.getByRole("button", { name: "会社・担当者・商談へ変換" })).toHaveCount(0);
  await strict.expectClean();
});

test("task completion and reopen actions change state without crashing", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/tasks");
  await page.locator("tbody a").first().click();
  await expect(page).toHaveURL(/\/tasks\/[^/]+$/);

  await page.locator("main form button").first().click();
  await expect(page).toHaveURL(/\/tasks\/[^/]+\?toast=completed$/);
  await expect(page.locator("body")).toContainText("ID:");
  await expect(page.locator("dl")).toContainText("完了");
  await expect(page.getByRole("button", { name: "未完了に戻す" })).toBeVisible();

  await page.locator("main form button").first().click();
  await expect(page).toHaveURL(/\/tasks\/[^/]+\?toast=reopened$/);
  await expect(page.locator("body")).toContainText("ID:");
  await expect(page.locator("dl")).toContainText("未完了");
  await expect(page.getByRole("button", { name: "完了", exact: true })).toBeVisible();

  await strict.expectClean();
});

test("record editing persists updated notes on the detail page", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const note = `E2E updated note ${Date.now()}`;

  await page.goto("/leads");
  await page.locator("tbody a").first().click();
  await expect(page).toHaveURL(/\/leads\/[^/]+$/);

  await page.getByRole("link", { name: "編集" }).click();
  await expect(page).toHaveURL(/\/leads\/[^/]+\/edit$/);

  const leadDetailPath = page.url().replace(/\/edit$/, "");
  await page.getByRole("link", { name: "キャンセル" }).click();
  await expect(page).toHaveURL(leadDetailPath);

  await page.getByRole("link", { name: "編集" }).click();
  await expect(page).toHaveURL(/\/leads\/[^/]+\/edit$/);
  await page.locator('textarea[name="notes"]').fill(note);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/leads\/[^/]+\?toast=updated$/);
  await expect(page.locator("body")).toContainText(note);
  await strict.expectClean();
});

test("datetime-local edit fields keep the user's local wall-clock time", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const unique = Date.now();
  const title = `E2E DateTime Ticket ${unique}`;
  const openedAt = "2026-07-05T00:30";

  await page.goto("/tickets/new");
  await selectFirstRealOption(page, "company_id");
  await page.locator('input[name="title"]').fill(title);
  await page.locator('input[name="opened_at"]').fill(openedAt);
  await page.locator("form button").last().click();

  await expect(page).toHaveURL(/\/tickets\/[^/]+\?toast=created$/);
  await page.locator('main a[href$="/edit"]').first().click();
  await expect(page).toHaveURL(/\/tickets\/[^/]+\/edit$/);
  await expect(page.locator('input[name="opened_at"]')).toHaveValue(openedAt);

  await strict.expectClean();
});

test("list search filters results and can be cleared", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/leads");
  await page.locator('input[name="q"]').fill("lead1@example.com");
  await page.locator('input[name="q"]').press("Enter");

  await expect(page).toHaveURL(/\/leads\?q=lead1%40example\.com/);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "条件クリア" })).toBeVisible();

  await page.getByRole("link", { name: "条件クリア" }).click();
  await expect(page).toHaveURL(/\/leads$/);
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await strict.expectClean();
});

test("task list search finds visible related company names", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const unique = Date.now();
  const companyName = `E2E Search Company ${unique}`;
  const taskTitle = `E2E Related Search Task ${unique}`;

  await page.goto("/companies/new");
  await page.locator('input[name="name"]').fill(companyName);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/companies\/[^/]+\?toast=created$/);
  const companyId = new URL(page.url()).pathname.split("/").at(-1) ?? "";

  await page.goto(`/tasks/new?company_id=${companyId}`);
  await expect(page.locator('select[name="company_id"]')).toHaveValue(companyId);
  await page.locator('input[name="title"]').fill(taskTitle);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/tasks\/[^/]+\?toast=created$/);

  await page.goto(`/tasks?q=${encodeURIComponent(companyName)}`);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText(taskTitle);
  await expect(page.locator("tbody")).toContainText(companyName);
  await strict.expectClean();
});

test("task quick views keep their view filter when searching", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const unique = Date.now();
  const taskTitle = `E2E Today View Search ${unique}`;
  const todayDate = localDateInputValue();

  await page.goto("/tasks/new");
  await page.locator('input[name="title"]').fill(taskTitle);
  await page.locator('input[name="due_date"]').fill(todayDate);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/tasks\/[^/]+\?toast=created$/);

  await page.goto("/tasks?view=today");
  await page.locator('input[name="q"]').fill(taskTitle);
  await page.locator('input[name="q"]').press("Enter");

  const url = new URL(page.url());
  expect(url.pathname).toBe("/tasks");
  expect(url.searchParams.get("view")).toBe("today");
  expect(url.searchParams.get("q")).toBe(taskTitle);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText(taskTitle);
  await strict.expectClean();
});

test("list column headers sort records while preserving the current search", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const unique = Date.now();
  const marker = `E2E Header Sort ${unique}`;
  const lowDeal = `${marker} Low`;
  const highDeal = `${marker} High`;

  await page.goto("/deals/new");
  await page.locator('input[name="name"]').fill(lowDeal);
  await page.locator('input[name="expected_mrr"]').fill("10000");
  await page.locator("form button").last().click();
  await expect(page).toHaveURL(/\/deals\/[^/]+\?toast=created$/);

  await page.goto("/deals/new");
  await page.locator('input[name="name"]').fill(highDeal);
  await page.locator('input[name="expected_mrr"]').fill("90000");
  await page.locator("form button").last().click();
  await expect(page).toHaveURL(/\/deals\/[^/]+\?toast=created$/);

  await page.goto(`/deals?q=${encodeURIComponent(marker)}`);
  await expect(page.locator("tbody tr")).toHaveCount(2);

  await page.getByTestId("sort-header-expected_mrr").click();
  await expect(page).toHaveURL(/\/deals\?.*sort=expected_mrr.*direction=desc/);
  let url = new URL(page.url());
  expect(url.searchParams.get("q")).toBe(marker);
  expect(url.searchParams.get("sort")).toBe("expected_mrr");
  expect(url.searchParams.get("direction")).toBe("desc");
  await expect(page.locator("tbody tr").first()).toContainText(highDeal);

  await page.getByTestId("sort-header-expected_mrr").click();
  await expect(page).toHaveURL(/\/deals\?.*sort=expected_mrr.*direction=asc/);
  url = new URL(page.url());
  expect(url.searchParams.get("q")).toBe(marker);
  expect(url.searchParams.get("sort")).toBe("expected_mrr");
  expect(url.searchParams.get("direction")).toBe("asc");
  await expect(page.locator("tbody tr").first()).toContainText(lowDeal);
  await strict.expectClean();
});

test("dashboard alerts link directly to the related CRM record", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const dealName = `E2E Dashboard Alert Deal ${Date.now()}`;

  await page.goto("/deals/new");
  await page.locator('input[name="name"]').fill(dealName);
  await page.locator('input[name="expected_mrr"]').fill("95000");
  await page.locator("form button").last().click();

  await expect(page).toHaveURL(/\/deals\/[^/]+\?toast=created$/);
  const dealPath = new URL(page.url()).pathname;

  await page.goto("/dashboard");
  const alertLink = page.getByTestId("dashboard-alert-link").filter({ hasText: dealName });
  await expect(alertLink).toBeVisible();
  await expect(alertLink).toContainText("注意");
  await expect(alertLink).not.toContainText(/danger|warning|info/);

  await alertLink.click();
  await expect(page).toHaveURL(new RegExp(`${dealPath}$`));
  await expect(page.locator("body")).toContainText(dealName);
  await strict.expectClean();
});

test("lead spreadsheet import settings can be opened from leads and saved", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/leads");
  await page.getByRole("link", { name: "スプレッドシート取込設定" }).click();

  await expect(page).toHaveURL(/\/leads\/import-settings$/);
  await expect(page.locator('select[name="default_status"]')).toHaveValue("新規（広告経由）");

  await page.locator('input[name="spreadsheet_url"]').fill("https://docs.google.com/spreadsheets/d/e2e-sheet-id/edit#gid=0");
  await page.getByRole("button", { name: "設定を保存" }).click();

  await expect(page).toHaveURL(/\/leads\/import-settings\?toast=settings-saved$/);
  await expect(page.locator('input[name="spreadsheet_url"]')).toHaveValue("https://docs.google.com/spreadsheets/d/e2e-sheet-id/edit#gid=0");
  await strict.expectClean();
});

test("lead spreadsheet import settings rejects unsupported URLs without crashing", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/leads/import-settings");
  await page.locator('input[name="spreadsheet_url"]').fill("https://example.com/leads.csv");
  await page.getByRole("button", { name: "設定を保存" }).click();

  await expect(page).toHaveURL(/\/leads\/import-settings\?toast=settings-error$/);
  await expect(page.getByTestId("toast-notice")).toContainText("保存できませんでした");
  await expect(page.locator('input[name="spreadsheet_url"]')).toBeVisible();
  await strict.expectClean();
});

test("deal stage board follows search results and preserves query when drilling into a stage", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const marker = `E2E Stage Drill ${Date.now()}`;

  for (let index = 1; index <= 5; index += 1) {
    await page.goto("/deals/new");
    await page.locator('input[name="name"]').fill(`${marker} ${index}`);
    await page.locator('input[name="expected_mrr"]').fill("18000");
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page).toHaveURL(/\/deals\/[^/]+\?toast=created$/);
  }

  await page.goto(`/deals?q=${encodeURIComponent(marker)}`);
  await expect(page.locator('select[name="filter"]')).toBeVisible();
  const stageColumns = page.getByTestId("deal-stage-column");
  await expect(stageColumns).toHaveCount(10);
  await expect(page.locator("tbody tr")).toHaveCount(5);

  await page.getByRole("link", { name: /さらに1件/ }).click();

  await expect(page).toHaveURL(/\/deals\?.*q=.*filter=/);
  const url = new URL(page.url());
  expect(url.searchParams.get("q")).toBe(marker);
  expect(url.searchParams.get("filter")).toBeTruthy();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await strict.expectClean();
});

test("activity history can be added from a company detail page", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const subject = `E2E activity ${Date.now()}`;

  await page.goto("/companies");
  await page.locator("tbody a").first().click();
  await expect(page).toHaveURL(/\/companies\/[^/]+$/);

  await page.locator('input[name="subject"]').fill(subject);
  await page.locator('textarea[name="content"]').fill("E2E activity content");
  await page.getByRole("button", { name: "活動を追加" }).click();

  await expect(page).toHaveURL(/\/companies\/[^/]+\?toast=activity$/);
  await expect(page.locator("body")).toContainText(subject);
  await strict.expectClean();
});

test("activity next action creates a linked task without losing the activity", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const unique = Date.now();
  const companyName = `E2E Next Action Company ${unique}`;
  const subject = `E2E Next Action Activity ${unique}`;

  await page.goto("/companies/new");
  await page.locator('input[name="name"]').fill(companyName);
  await page.locator("form button").last().click();

  await expect(page).toHaveURL(/\/companies\/[^/]+\?toast=created$/);
  const companyPath = new URL(page.url()).pathname;

  await page.locator('input[name="subject"]').fill(subject);
  await page.locator('textarea[name="content"]').fill("Call back with the trial setup checklist.");
  await page.locator('input[name="has_next_action"]').check();
  await page.locator('input[name="next_action_date"]').fill("2026-07-12");

  const activityForm = page.locator('input[name="subject"]').locator("xpath=ancestor::form");
  await activityForm.locator("button").last().click();

  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(companyPath)}\\?toast=activity$`));
  await expect(page.locator("body")).toContainText(subject);

  await page.goto(`/tasks?q=${encodeURIComponent(subject)}`);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText(subject);
  await expect(page.locator("tbody")).toContainText(companyName);

  await page.locator("tbody a").first().click();
  await expect(page).toHaveURL(/\/tasks\/[^/]+$/);
  await expect(page.locator("body")).toContainText(subject);
  await expect(page.locator("body")).toContainText(companyName);
  await strict.expectClean();
});

test("company related create action prefills the parent company on a new contact", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const contactName = `E2E Related Contact ${Date.now()}`;

  await page.goto("/companies");
  const companyName = (await page.locator("tbody a").first().textContent())?.trim() ?? "";
  await page.locator("tbody a").first().click();
  await expect(page).toHaveURL(/\/companies\/[^/]+$/);

  const companyId = new URL(page.url()).pathname.split("/").at(-1) ?? "";
  const companyPath = new URL(page.url()).pathname;

  await page.getByRole("link", { name: /担当者を追加/ }).click();

  await expect(page).toHaveURL(new RegExp(`/contacts/new\\?company_id=${companyId}$`));
  await expect(page.locator('select[name="company_id"]')).toHaveValue(companyId);
  await expect(page.locator('select[name="company_id"] option:checked')).toContainText(companyName);

  await page.getByRole("link", { name: "キャンセル" }).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(companyPath)}$`));

  await page.getByRole("link", { name: /担当者を追加/ }).click();
  await expect(page).toHaveURL(new RegExp(`/contacts/new\\?company_id=${companyId}$`));
  await expect(page.locator('select[name="company_id"]')).toHaveValue(companyId);

  await page.locator('input[name="name"]').fill(contactName);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/contacts\/[^/]+\?toast=created$/);
  await expect(page.locator("body")).toContainText(contactName);
  await expect(page.locator("body")).toContainText(companyName);
  await strict.expectClean();
});

test("related sections with hidden rows link to a filtered full list", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const unique = Date.now();
  const companyName = `E2E Many Contacts Company ${unique}`;
  const lastContactName = `E2E Hidden Contact ${unique}-9`;

  await page.goto("/companies/new");
  await page.locator('input[name="name"]').fill(companyName);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/companies\/[^/]+\?toast=created$/);
  const companyPath = new URL(page.url()).pathname;
  const companyId = companyPath.split("/").at(-1) ?? "";

  for (let index = 1; index <= 9; index += 1) {
    await page.goto(`/contacts/new?company_id=${companyId}`);
    await expect(page.locator('select[name="company_id"]')).toHaveValue(companyId);
    await page.locator('input[name="name"]').fill(index === 9 ? lastContactName : `E2E Visible Contact ${unique}-${index}`);
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page).toHaveURL(/\/contacts\/[^/]+\?toast=created$/);
  }

  await page.goto(companyPath);
  await expect(page.getByRole("link", { name: "さらに1件を一覧で確認" })).toBeVisible();
  await page.getByRole("link", { name: "さらに1件を一覧で確認" }).click();

  await expect(page).toHaveURL(/\/contacts\?relation_field=company_id&relation_id=/);
  const listUrl = new URL(page.url());
  expect(listUrl.searchParams.get("relation_field")).toBe("company_id");
  expect(listUrl.searchParams.get("relation_id")).toBe(companyId);
  await expect(page.locator("tbody tr")).toHaveCount(9);
  await expect(page.locator("tbody")).toContainText(lastContactName);
  await strict.expectClean();
});

test("contact activity is visible from the parent company timeline", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const unique = Date.now();
  const contactName = `E2E Timeline Contact ${unique}`;
  const subject = `E2E Contact Timeline Activity ${unique}`;

  await page.goto("/companies");
  await page.locator("tbody a").first().click();
  await expect(page).toHaveURL(/\/companies\/[^/]+$/);

  const companyId = new URL(page.url()).pathname.split("/").at(-1) ?? "";

  await page.getByRole("link", { name: /担当者を追加/ }).click();
  await expect(page.locator('select[name="company_id"]')).toHaveValue(companyId);
  await page.locator('input[name="name"]').fill(contactName);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/contacts\/[^/]+\?toast=created$/);
  await expect(page.locator("body")).toContainText(contactName);

  await page.locator('input[name="subject"]').fill(subject);
  await page.locator('textarea[name="content"]').fill("This contact-level activity must roll up to the company timeline.");
  await page.getByRole("button", { name: "活動を追加" }).click();

  await expect(page).toHaveURL(/\/contacts\/[^/]+\?toast=activity$/);
  await expect(page.locator("body")).toContainText(subject);

  await page.goto(`/companies/${companyId}`);
  await expect(page.locator("body")).toContainText(subject);
  await strict.expectClean();
});

test("deal activity is visible from linked company and contact timelines", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const unique = Date.now();
  const companyName = `E2E Deal Timeline Company ${unique}`;
  const contactName = `E2E Deal Timeline Contact ${unique}`;
  const dealName = `E2E Timeline Deal ${unique}`;
  const subject = `E2E Deal Timeline Activity ${unique}`;

  await page.goto("/companies/new");
  await page.locator('input[name="name"]').fill(companyName);
  await page.locator("form button").last().click();
  await expect(page).toHaveURL(/\/companies\/[^/]+\?toast=created$/);
  const companyId = new URL(page.url()).pathname.split("/").at(-1) ?? "";

  await page.goto(`/contacts/new?company_id=${companyId}`);
  await page.locator('input[name="name"]').fill(contactName);
  await page.locator("form button").last().click();
  await expect(page).toHaveURL(/\/contacts\/[^/]+\?toast=created$/);
  const contactId = new URL(page.url()).pathname.split("/").at(-1) ?? "";

  expect(companyId).toBeTruthy();
  expect(contactId).toBeTruthy();

  await page.goto(`/deals/new?company_id=${companyId}&contact_id=${contactId}`);
  await page.locator('input[name="name"]').fill(dealName);
  await page.locator("form button").last().click();
  await expect(page).toHaveURL(/\/deals\/[^/]+\?toast=created$/);

  await page.locator('input[name="subject"]').fill(subject);
  await page.locator('textarea[name="content"]').fill("This deal-level activity must roll up to company and contact timelines.");
  await page.getByRole("button", { name: "活動を追加" }).click();

  await expect(page).toHaveURL(/\/deals\/[^/]+\?toast=activity$/);
  await expect(page.locator("body")).toContainText(subject);

  await page.goto(`/companies/${companyId}`);
  await expect(page.locator("body")).toContainText(subject);

  await page.goto(`/contacts/${contactId}`);
  await expect(page.locator("body")).toContainText(subject);
  await strict.expectClean();
});

test("deal related task creation keeps the deal relationship through save", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const taskTitle = `E2E Deal Task ${Date.now()}`;

  await page.goto("/deals");
  const dealName = (await page.locator("tbody a").first().textContent())?.trim() ?? "";
  await page.locator("tbody a").first().click();
  await expect(page).toHaveURL(/\/deals\/[^/]+$/);

  const dealId = new URL(page.url()).pathname.split("/").at(-1) ?? "";

  await page.getByRole("link", { name: /タスクを追加/ }).click();

  await expect(page).toHaveURL(new RegExp(`/tasks/new\\?.*deal_id=${dealId}`));
  await expect(page.locator('select[name="deal_id"]')).toHaveValue(dealId);

  await page.locator('input[name="title"]').fill(taskTitle);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/tasks\/[^/]+\?toast=created$/);
  await expect(page.locator("body")).toContainText(taskTitle);
  await expect(page.locator("body")).toContainText(dealName);
  await strict.expectClean();
});

test("task detail shows activity context from its linked company", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const subject = `E2E Task Context Activity ${Date.now()}`;
  const taskTitle = `E2E Context Task ${Date.now()}`;

  await page.goto("/companies");
  await page.locator("tbody a").first().click();
  await expect(page).toHaveURL(/\/companies\/[^/]+$/);

  const companyId = new URL(page.url()).pathname.split("/").at(-1) ?? "";

  await page.locator('input[name="subject"]').fill(subject);
  await page.locator('textarea[name="content"]').fill("Activity context for a task linked to this company");
  await page.getByRole("button", { name: "活動を追加" }).click();

  await expect(page).toHaveURL(/\/companies\/[^/]+\?toast=activity$/);
  await expect(page.locator("body")).toContainText(subject);

  await page.goto(`/tasks/new?company_id=${companyId}`);
  await expect(page.locator('select[name="company_id"]')).toHaveValue(companyId);
  await page.locator('input[name="title"]').fill(taskTitle);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/tasks\/[^/]+\?toast=created$/);
  await expect(page.locator("body")).toContainText(taskTitle);
  await expect(page.locator("body")).toContainText(subject);

  await page.locator(`main a[href="/companies/${companyId}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/companies/${companyId}$`));
  await expect(page.locator("body")).toContainText(subject);

  await page.goto(`/tasks?q=${encodeURIComponent(taskTitle)}`);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.locator(`tbody a[href="/companies/${companyId}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/companies/${companyId}$`));
  await expect(page.locator("body")).toContainText(subject);
  await strict.expectClean();
});

test("deal stage editing persists stage and probability changes", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const dealName = `E2E Stage Deal ${Date.now()}`;

  await page.goto("/deals/new");
  await page.locator('input[name="name"]').fill(dealName);
  await page.locator('input[name="expected_mrr"]').fill("15000");
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/deals\/[^/]+\?toast=created$/);
  await page.getByRole("link", { name: "編集" }).click();
  await expect(page).toHaveURL(/\/deals\/[^/]+\/edit$/);

  const stageSelect = page.locator('select[name="stage"]');
  await stageSelect.selectOption("デモ実施");
  const selectedStage = (await stageSelect.locator("option:checked").textContent())?.trim() ?? "";
  await page.locator('input[name="probability"]').fill("65");
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/deals\/[^/]+\?toast=updated$/);
  await expect(page.locator("body")).toContainText(dealName);
  await expect(page.locator("body")).toContainText(selectedStage);
  await expect(page.locator("body")).toContainText("65");
  await expect(page.locator("body")).toContainText("デモ後フォロー");
  await expect(page.locator("body")).toContainText("問い合わせ / リード獲得");
  await expect(page.locator("body")).toContainText("ステージ履歴");
  await strict.expectClean();
});

test("trial usage metrics can be edited and remain visible on detail", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/trials/new");
  await selectFirstRealOption(page, "company_id");
  await page.locator('input[name="start_date"]').fill("2026-07-04");
  await page.locator('input[name="end_date"]').fill("2026-07-18");
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/trials\/[^/]+\?toast=created$/);
  await page.getByRole("link", { name: "編集" }).click();

  await page.locator('input[name="login_count"]').fill("12");
  await page.locator('input[name="documents_created"]').fill("35");
  await page.locator('input[name="estimates_created"]').fill("8");
  await page.locator('input[name="invoices_created"]').fill("3");
  await page.locator('input[name="invited_users_count"]').fill("4");
  await page.locator('input[name="setup_completion_rate"]').fill("100");
  await page.locator('input[name="activation_level"]').fill("7");
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/trials\/[^/]+\?toast=updated$/);
  await expect(page.locator("body")).toContainText("12");
  await expect(page.locator("body")).toContainText("35");
  await expect(page.locator("body")).toContainText("Lv7");
  await strict.expectClean();
});

test("contract creation calculates ARR from MRR", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const marker = `E2E ARR Contract ${Date.now()}`;

  await page.goto("/contracts/new");
  await selectFirstRealOption(page, "company_id");
  await selectFirstRealOption(page, "plan");
  await page.locator('input[name="mrr"]').fill("50000");
  await page.locator('input[name="started_on"]').fill("2026-07-04");
  await page.locator('textarea[name="notes"]').fill(marker);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/contracts\/[^/]+\?toast=created$/);
  await expect(page.locator("body")).toContainText(marker);
  await expect(page.locator("body")).toContainText("￥50,000");
  await expect(page.locator("body")).toContainText("￥600,000");
  await strict.expectClean();
});

test("usage and billing relation tables link to their contract and trial records", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/contracts");
  const contractLink = page.locator('tbody a[href^="/contracts/"]').first();
  await expect(contractLink).toBeVisible();
  const contractHref = await contractLink.getAttribute("href");
  expect(contractHref).toMatch(/^\/contracts\/[^/]+$/);
  await contractLink.click();

  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(contractHref ?? "")}$`));
  await expect(page.locator("main")).toContainText("利用状況");
  await expect(page.locator("main")).toContainText("請求履歴");

  const contractRelationLinks = page.locator(`tbody a[href="${contractHref}"]`);
  expect(await contractRelationLinks.count()).toBeGreaterThanOrEqual(2);
  const contractRelationText = (await contractRelationLinks.first().textContent())?.trim() ?? "";
  expect(contractRelationText).not.toContain(contractHref?.split("/").pop() ?? "");

  const companyHref = await page.locator('main a[href^="/companies/"]').first().getAttribute("href");
  expect(companyHref).toMatch(/^\/companies\/[^/]+$/);
  await page.goto(companyHref ?? "/companies");
  await expect(page.locator("main")).toContainText("請求履歴");
  await expect(page.locator(`tbody a[href="${contractHref}"]`).first()).toBeVisible();

  await page.goto("/trials");
  const trialLink = page.locator('tbody a[href^="/trials/"]').first();
  await expect(trialLink).toBeVisible();
  const trialHref = await trialLink.getAttribute("href");
  expect(trialHref).toMatch(/^\/trials\/[^/]+$/);
  await trialLink.click();

  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(trialHref ?? "")}$`));
  await expect(page.locator("main")).toContainText("利用状況");
  const trialRelationLink = page.locator(`tbody a[href="${trialHref}"]`).first();
  await expect(trialRelationLink).toBeVisible();
  const trialRelationText = (await trialRelationLink.textContent())?.trim() ?? "";
  expect(trialRelationText).not.toContain(trialHref?.split("/").pop() ?? "");

  await strict.expectClean();
});

test("delete confirmation prevents accidental deletion and then soft deletes after approval", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const unique = Date.now();
  const leadName = `E2E Delete Lead ${unique}`;

  await page.goto("/leads/new");
  await page.locator('input[name="name"]').fill(leadName);
  await page.locator('input[name="company_name"]').fill(`E2E Delete Construction ${unique}`);
  await page.locator("form button").last().click();

  await expect(page).toHaveURL(/\/leads\/[^/]+\?toast=created$/);
  await expect(page.locator("body")).toContainText(leadName);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("削除");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "削除" }).click();
  await expect(page.locator("body")).toContainText(leadName);
  await expect(page).toHaveURL(/\/leads\/[^/]+\?toast=created$/);

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("削除");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "削除" }).click();

  await expect(page).toHaveURL(/\/leads\?toast=deleted$/);
  await expect(page.locator("body")).not.toContainText(leadName);
  await strict.expectClean();
});

test("automation task generation runs and reports a success state", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/dashboard");
  await page.locator("main form button").first().click();

  await expect(page).toHaveURL(/\/dashboard\?toast=automation&count=\d+$/);
  await expect(page.locator("main")).toBeVisible();
  await strict.expectClean();
});

test("dashboards, reports, and settings expose operational decision signals", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/dashboard");
  await expect(page.locator("main")).toContainText("MRR");
  await expect(page.locator("main")).toContainText("CS");
  await expect(page.locator("main a[href^=\"/tasks/\"]").first()).toBeVisible();
  const riskyCompanyHref = await page.getByTestId("dashboard-risky-company-link").first().getAttribute("href");
  expect(riskyCompanyHref).toMatch(/^\/companies\/[^/\s]+$/);
  expect(riskyCompanyHref).not.toContain("undefined");

  await page.goto("/reports");
  await expect(page.locator("main")).toContainText("ARR");
  await expect(page.locator("main")).toContainText("CS KPI");

  await page.goto("/settings");
  await expect(page.locator("main")).toContainText("NEXT_PUBLIC_SUPABASE_URL");
  await expect(page.locator("main")).toContainText("admin");
  await expect(page.locator("main")).toContainText("viewer");
  await strict.expectClean();
});

test("tablet viewport keeps dashboards and dense lists within the page width", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  await page.setViewportSize({ width: 900, height: 1000 });

  for (const path of ["/dashboard", "/deals", "/companies", "/reports"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(5);
  }

  await strict.expectClean();
});

test("invalid form input is blocked by browser validation and does not create a crash", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/leads/new");
  await page.locator('input[name="email"]').fill("not-an-email");
  await page.locator("form button").last().click();

  await expect(page).toHaveURL(/\/leads\/new$/);
  await expect(page.locator('input[name="email"]')).toHaveJSProperty("validity.valid", false);
  await expect(page.locator("main")).toBeVisible();
  await strict.expectClean();
});

test("route-level failures render a controlled error page", async ({ page }) => {
  const strict = attachStrictPageChecks(page, {
    allowResponse: (response) => response.status() === 404 && response.url().includes("/not-a-real-entity"),
  });

  const response = await page.goto("/not-a-real-entity");

  expect(response?.status() ?? 0).toBeLessThan(500);
  await expect(page.locator("body")).toContainText(/404|not found|見つかりません/i);
  await strict.expectClean();
});

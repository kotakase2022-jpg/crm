import { expect, test, type Page } from "@playwright/test";
import { attachStrictPageChecks } from "./strict-page";

async function selectFirstRealOption(page: Page, name: string) {
  await page.locator(`select[name="${name}"]`).selectOption({ index: 1 });
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

const createScenarios = [
  {
    entity: "companies",
    visibleMarkerPrefix: "E2E Company",
    fill: async (page, marker: string) => {
      await page.locator('input[name="name"]').fill(marker);
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

  await page.locator("main form button").first().click();

  await expect(page).toHaveURL(/\/deals\/[^/]+\?toast=converted$/);
  await expect(page.locator("body")).toContainText(companyName);
  await expect(page.locator("body")).toContainText("ID:");
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

  await page.locator("main form button").first().click();
  await expect(page).toHaveURL(/\/tasks\/[^/]+\?toast=reopened$/);
  await expect(page.locator("body")).toContainText("ID:");

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
  await page.locator('textarea[name="notes"]').fill(note);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/leads\/[^/]+\?toast=updated$/);
  await expect(page.locator("body")).toContainText(note);
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

test("company related create action prefills the parent company on a new contact", async ({ page }) => {
  const strict = attachStrictPageChecks(page);
  const contactName = `E2E Related Contact ${Date.now()}`;

  await page.goto("/companies");
  const companyName = (await page.locator("tbody a").first().textContent())?.trim() ?? "";
  await page.locator("tbody a").first().click();
  await expect(page).toHaveURL(/\/companies\/[^/]+$/);

  const companyId = new URL(page.url()).pathname.split("/").at(-1) ?? "";

  await page.getByRole("link", { name: /担当者を追加/ }).click();

  await expect(page).toHaveURL(new RegExp(`/contacts/new\\?company_id=${companyId}$`));
  await expect(page.locator('select[name="company_id"]')).toHaveValue(companyId);
  await expect(page.locator('select[name="company_id"] option:checked')).toContainText(companyName);

  await page.locator('input[name="name"]').fill(contactName);
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/contacts\/[^/]+\?toast=created$/);
  await expect(page.locator("body")).toContainText(contactName);
  await expect(page.locator("body")).toContainText(companyName);
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
  await stageSelect.selectOption({ index: 4 });
  const selectedStage = (await stageSelect.locator("option:checked").textContent())?.trim() ?? "";
  await page.locator('input[name="probability"]').fill("65");
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/deals\/[^/]+\?toast=updated$/);
  await expect(page.locator("body")).toContainText(dealName);
  await expect(page.locator("body")).toContainText(selectedStage);
  await expect(page.locator("body")).toContainText("65");
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

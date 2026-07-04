import { expect, test } from "@playwright/test";
import { attachStrictPageChecks } from "./strict-page";

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

test("automation task generation runs and reports a success state", async ({ page }) => {
  const strict = attachStrictPageChecks(page);

  await page.goto("/dashboard");
  await page.locator("main form button").first().click();

  await expect(page).toHaveURL(/\/dashboard\?toast=automation&count=\d+$/);
  await expect(page.locator("main")).toBeVisible();
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

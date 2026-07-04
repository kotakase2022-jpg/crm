import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3025);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;
const localChromeAvailable =
  !process.env.CI &&
  process.platform === "win32" &&
  (existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe") ||
    existsSync("C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"));
const browserUse = localChromeAvailable ? { channel: "chrome" as const } : {};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],
  use: {
    ...devices["Desktop Chrome"],
    ...browserUse,
    baseURL,
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `${baseURL}/dashboard`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      E2E_TEST_MODE: "demo",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], ...browserUse },
    },
  ],
});

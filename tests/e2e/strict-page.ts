import { expect, type Page, type Response } from "@playwright/test";

type StrictPageOptions = {
  allowResponse?: (response: Response) => boolean;
};

function isLocalAppUrl(url: string) {
  return url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost");
}

export function attachStrictPageChecks(page: Page, options: StrictPageOptions = {}) {
  const failures: string[] = [];

  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") {
      failures.push(`console.error: ${text}`);
    }
    if (/hydration|react runtime|unhandled/i.test(text)) {
      failures.push(`runtime console signal: ${text}`);
    }
  });

  page.on("pageerror", (error) => {
    failures.push(`pageerror: ${error.message}`);
  });

  page.on("requestfailed", (request) => {
    if (!isLocalAppUrl(request.url()) || request.resourceType() === "websocket") return;
    failures.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`);
  });

  page.on("response", (response) => {
    if (!isLocalAppUrl(response.url())) return;
    if (options.allowResponse?.(response)) return;

    const status = response.status();
    if (status >= 400) {
      failures.push(`HTTP ${status}: ${response.url()}`);
    }
  });

  return {
    async expectClean() {
      const portalText = await page.locator("nextjs-portal").textContent({ timeout: 1_000 }).catch(() => "");
      expect(portalText ?? "").not.toMatch(/failed to compile|runtime error|unhandled|hydration|cross-origin/i);
      expect(failures).toEqual([]);
    },
  };
}

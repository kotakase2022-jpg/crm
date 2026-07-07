import { expect, type Page, type Response } from "@playwright/test";

type StrictPageOptions = {
  allowResponse?: (response: Response) => boolean;
};

type RequestFailureSnapshot = {
  url: string;
  resourceType: string;
  errorText: string;
};

function isLocalAppUrl(url: string) {
  return url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost");
}

export function isIgnorableRequestFailure({ url, resourceType, errorText }: RequestFailureSnapshot) {
  const pathname = new URL(url, "http://localhost").pathname;

  // Next's dev server can abort its internal font request during immediate test
  // navigations. Keep every other local request failure fatal.
  return resourceType === "font" && errorText === "net::ERR_ABORTED" && pathname.startsWith("/__nextjs_font/");
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
    const errorText = request.failure()?.errorText ?? "";
    if (isIgnorableRequestFailure({ url: request.url(), resourceType: request.resourceType(), errorText })) return;
    failures.push(`requestfailed: ${request.method()} ${request.url()} ${errorText}`);
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

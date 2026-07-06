import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config as proxyConfig } from "@/proxy";
import { buildLoginRedirectUrl, shouldBypassAuthRedirect, supabaseProxyMatcher, updateSession } from "@/lib/supabase/proxy";

type SupabaseCookieToSet = {
  name: string;
  value: string;
  options: {
    httpOnly?: boolean;
    path?: string;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  };
};

type SupabaseCookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (cookiesToSet: SupabaseCookieToSet[], headers: Record<string, string>) => void | Promise<void>;
};

type SupabaseServerClientOptions = {
  cookies: SupabaseCookieAdapter;
};

const supabaseMocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  createServerClient: vi.fn(),
}));

function matcherIncludesPath(url: string) {
  const pathname = new URL(url, "https://crm.example.test").pathname;
  return new RegExp(`^${supabaseProxyMatcher[0]}$`).exec(pathname) !== null;
}

vi.mock("@supabase/ssr", () => ({
  createServerClient: supabaseMocks.createServerClient,
}));

describe("Supabase proxy helpers", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    supabaseMocks.getClaims.mockReset();
    supabaseMocks.createServerClient.mockReset();
    supabaseMocks.createServerClient.mockReturnValue({
      auth: {
        getClaims: supabaseMocks.getClaims,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds login redirects that preserve the requested internal path", () => {
    const loginUrl = buildLoginRedirectUrl("https://crm.example.test/deals?filter=契約交渉#stage");

    expect(loginUrl.origin).toBe("https://crm.example.test");
    expect(loginUrl.pathname).toBe("/login");
    expect(loginUrl.searchParams.get("next")).toBe("/deals?filter=%E5%A5%91%E7%B4%84%E4%BA%A4%E6%B8%89#stage");
  });

  it("keeps login pages from redirecting to themselves", () => {
    expect(shouldBypassAuthRedirect("/login")).toBe(true);
    expect(shouldBypassAuthRedirect("/login/help")).toBe(true);
    expect(shouldBypassAuthRedirect("/dashboard")).toBe(false);
  });

  it("keeps proxy away from API routes and Next.js assets", () => {
    expect(supabaseProxyMatcher[0]).toContain("api(?:/|$)");
    expect(supabaseProxyMatcher[0]).toContain("_next/static(?:/|$)");
    expect(supabaseProxyMatcher[0]).toContain("_next/image(?:/|$)");
    expect(supabaseProxyMatcher[0]).toContain("favicon\\.ico$");
  });

  it("keeps auth proxy matching on CRM pages but away from generated static assets", () => {
    expect(proxyConfig.matcher).toEqual(supabaseProxyMatcher);

    for (const url of ["/dashboard", "/deals?filter=hot", "/login?next=/tasks", "/apiary-dashboard", "/favicon.ico.backup"]) {
      expect(matcherIncludesPath(url)).toBe(true);
    }

    for (const url of [
      "/api",
      "/api/cron/lead-imports",
      "/_next/static/chunks/app.js",
      "/_next/static",
      "/_next/image?url=%2Flogo.png&w=256&q=75",
      "/_next/image",
      "/__nextjs_font/geist-latin.woff2",
      "/favicon.ico",
      "/robots.txt",
      "/manifest.webmanifest",
      "/styles/app.css",
    ]) {
      expect(matcherIncludesPath(url)).toBe(false);
    }
  });

  it("does not initialize Supabase when demo environment variables are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    const response = await updateSession(new NextRequest("https://crm.example.test/dashboard"));

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated protected requests to login with the original path", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    supabaseMocks.getClaims.mockResolvedValue({ data: { claims: null } });

    const response = await updateSession(new NextRequest("https://crm.example.test/deals?filter=hot"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://crm.example.test/login?next=%2Fdeals%3Ffilter%3Dhot");
  });

  it("keeps refreshed auth cookies and cache headers on unauthenticated redirects", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    supabaseMocks.createServerClient.mockImplementation((_url: string, _key: string, options: SupabaseServerClientOptions) => ({
      auth: {
        getClaims: async () => {
          await options.cookies.setAll(
            [
              {
                name: "sb-refresh-token",
                value: "refresh-token",
                options: { httpOnly: true, path: "/", sameSite: "lax" },
              },
            ],
            {
              "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
              Expires: "0",
              Pragma: "no-cache",
            },
          );
          return { data: { claims: null } };
        },
      },
    }));

    const response = await updateSession(new NextRequest("https://crm.example.test/dashboard"));

    expect(response.status).toBe(307);
    expect(response.cookies.get("sb-refresh-token")?.value).toBe("refresh-token");
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, must-revalidate, max-age=0");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("does not redirect the login page while refreshing auth cookies", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    supabaseMocks.getClaims.mockResolvedValue({ data: { claims: null } });

    const response = await updateSession(new NextRequest("https://crm.example.test/login?next=/deals"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { safeInternalRedirectPath } from "@/lib/crm/navigation";
import { getSupabaseEnv } from "./env";

export const supabaseProxyMatcher = [
  "/((?!(?:api(?:/|$)|_next/static(?:/|$)|_next/image(?:/|$)|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|txt|xml|json|webmanifest|woff|woff2|ttf|otf)$)).*)",
];

export function shouldBypassAuthRedirect(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

export function buildLoginRedirectUrl(requestUrl: string | URL) {
  const url = typeof requestUrl === "string" ? new URL(requestUrl) : new URL(requestUrl);
  const nextPath = safeInternalRedirectPath(`${url.pathname}${url.search}${url.hash}`);
  const loginUrl = new URL("/login", url);
  loginUrl.searchParams.set("next", nextPath);
  return loginUrl;
}

function copyAuthResponseMetadata(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  for (const [key, value] of source.headers) {
    const header = key.toLowerCase();
    if (header !== "location" && header !== "set-cookie") {
      target.headers.set(key, value);
    }
  }
}

export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();

  if (!env.configured || !env.url || !env.key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && !shouldBypassAuthRedirect(request.nextUrl.pathname)) {
    const redirectResponse = NextResponse.redirect(buildLoginRedirectUrl(request.nextUrl));
    copyAuthResponseMetadata(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}

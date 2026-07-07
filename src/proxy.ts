import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Keep this matcher literal: Next.js statically analyzes proxy matchers at build time
  // and ignores dynamic values such as imported variables. supabase-proxy.test.ts
  // keeps this literal in sync with supabaseProxyMatcher.
  matcher: [
    "/((?!(?:api(?:/|$)|_next/static(?:/|$)|_next/image(?:/|$)|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|txt|xml|json|webmanifest|woff|woff2|ttf|otf)$)).*)",
  ],
};

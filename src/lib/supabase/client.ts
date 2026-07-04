"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

export function createClient() {
  const env = getSupabaseEnv();

  if (!env.configured || !env.url || !env.key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createBrowserClient(env.url, env.key);
}

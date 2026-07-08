import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

function isKnownNonAdminKey(key: string) {
  const normalized = key.toLowerCase();
  return normalized.startsWith("sb_publishable_") || normalized.startsWith("sb_anon_");
}

export function createAdminClient() {
  const env = getSupabaseEnv();
  const url = env.url?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey || isKnownNonAdminKey(serviceRoleKey)) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

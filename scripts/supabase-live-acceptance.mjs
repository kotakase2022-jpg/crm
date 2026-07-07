import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envFile = path.join(process.cwd(), ".env.acceptance.local");
const nonProductionConfirmation = "I_CONFIRM_THIS_IS_NOT_PRODUCTION";

class AcceptanceFailure extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = "AcceptanceFailure";
    this.details = details;
  }
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function fail(message, details = []) {
  throw new AcceptanceFailure(message, details);
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : "";
}

function assertSafeTarget(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    fail("ACCEPTANCE_SUPABASE_URL is not a valid URL.");
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (localHosts.has(parsed.hostname)) return;

  if (process.env.ACCEPTANCE_NON_PRODUCTION_CONFIRMATION !== nonProductionConfirmation) {
    fail("Remote Supabase acceptance requires an explicit non-production confirmation.", [
      `Set ACCEPTANCE_NON_PRODUCTION_CONFIRMATION=${nonProductionConfirmation}`,
      "Do not run this command against production Supabase projects or real customer data.",
    ]);
  }
}

function decodeJwtPayload(rawKey) {
  const [, payload] = rawKey.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function assertPublishableKey(rawKey) {
  if (rawKey.startsWith("sb_secret_")) {
    fail("ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY must not be a Supabase secret/service-role key.", [
      "Use a publishable or anon key for live acceptance so RLS is actually exercised.",
    ]);
  }

  const payload = decodeJwtPayload(rawKey);
  if (payload?.role === "service_role") {
    fail("ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY must not be a legacy service_role JWT.", [
      "Use a publishable or anon key for live acceptance so RLS is actually exercised.",
    ]);
  }
}

function assertNoSupabaseError(step, response) {
  if (response.error) {
    fail(`${step} failed.`, [response.error.message]);
  }
}

function isExpectedHiddenReadError(error) {
  const message = error.message.toLowerCase();
  return ["permission", "row-level", "rls", "not allowed"].some((expected) => message.includes(expected));
}

async function assertAnonymousLeadIsHidden({ supabaseUrl, publishableKey, leadId }) {
  const anonymousSupabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const anonymousRead = await anonymousSupabase.from("leads").select("id").eq("id", leadId).maybeSingle();

  if (anonymousRead.data) {
    fail("Anonymous lead visibility check failed.", ["A publishable-key client without an authenticated user could read the created lead."]);
  }

  if (anonymousRead.error && !isExpectedHiddenReadError(anonymousRead.error)) {
    fail("Anonymous lead visibility check failed unexpectedly.", [anonymousRead.error.message]);
  }
}

async function assertOtherOrganizationLeadIsHidden({ supabaseUrl, publishableKey, email, password, sourceOrganizationId, leadId }) {
  const otherSupabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const signIn = await otherSupabase.auth.signInWithPassword({ email, password });
    assertNoSupabaseError("Other organization Supabase Auth sign-in", signIn);

    const profile = await otherSupabase.rpc("ensure_user_profile", {
      default_org_name: "CRM Acceptance Other Organization",
    });
    assertNoSupabaseError("Other organization profile bootstrap", profile);

    const profileRow = Array.isArray(profile.data) ? profile.data[0] : profile.data;
    const otherOrganizationId = profileRow?.organization_id ?? "";
    if (!otherOrganizationId) fail("Other organization profile bootstrap did not return an organization id.");
    if (otherOrganizationId === sourceOrganizationId) {
      fail("Other organization isolation check is misconfigured.", [
        "ACCEPTANCE_OTHER_TEST_EMAIL must belong to a different organization than ACCEPTANCE_TEST_EMAIL.",
      ]);
    }

    const otherRead = await otherSupabase.from("leads").select("id, organization_id").eq("id", leadId).maybeSingle();

    if (otherRead.data) {
      fail("Other organization lead visibility check failed.", ["A different organization user could read the created lead."]);
    }

    if (otherRead.error && !isExpectedHiddenReadError(otherRead.error)) {
      fail("Other organization lead visibility check failed unexpectedly.", [otherRead.error.message]);
    }
  } finally {
    await otherSupabase.auth.signOut().catch(() => {});
  }
}

async function cleanupLead({ supabase, organizationId, leadId, userId, softDeleted }) {
  if (softDeleted || !organizationId || !leadId || !userId) return;

  try {
    const cleanup = await supabase
      .from("leads")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("organization_id", organizationId)
      .eq("id", leadId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (cleanup.error) {
      console.error(`Cleanup warning: created acceptance lead could not be soft-deleted (${cleanup.error.message}).`);
    } else if (cleanup.data) {
      console.error("Cleanup completed: created acceptance lead was soft-deleted after a failed acceptance run.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Cleanup warning: created acceptance lead cleanup threw unexpectedly (${message}).`);
  }
}

async function run() {
  loadEnvFile(envFile);

  const requiredVariables = {
    ACCEPTANCE_SUPABASE_URL: requiredEnv("ACCEPTANCE_SUPABASE_URL"),
    ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY: requiredEnv("ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY"),
    ACCEPTANCE_TEST_EMAIL: requiredEnv("ACCEPTANCE_TEST_EMAIL"),
    ACCEPTANCE_TEST_PASSWORD: requiredEnv("ACCEPTANCE_TEST_PASSWORD"),
  };
  const otherTestEmail = requiredEnv("ACCEPTANCE_OTHER_TEST_EMAIL");
  const otherTestPassword = requiredEnv("ACCEPTANCE_OTHER_TEST_PASSWORD");

  const missing = Object.entries(requiredVariables)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    fail("Missing non-production Supabase acceptance environment variables.", [
      ...missing,
      "Create .env.acceptance.local or export the variables in your shell. This file is gitignored.",
    ]);
  }

  if (Boolean(otherTestEmail) !== Boolean(otherTestPassword)) {
    fail("Other organization Supabase acceptance requires both optional test-user variables.", [
      "Set both ACCEPTANCE_OTHER_TEST_EMAIL and ACCEPTANCE_OTHER_TEST_PASSWORD, or leave both empty.",
    ]);
  }

  assertSafeTarget(requiredVariables.ACCEPTANCE_SUPABASE_URL);
  assertPublishableKey(requiredVariables.ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY);

  const supabase = createClient(requiredVariables.ACCEPTANCE_SUPABASE_URL, requiredVariables.ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const marker = `acceptance-${Date.now()}-${randomUUID()}`;
  const leadName = `Acceptance Lead ${marker}`;
  const companyName = `Acceptance Construction ${marker}`;
  const updatedPhone = "03-0000-0000";
  const updatedNotes = `${marker} updated`;
  const now = new Date().toISOString();
  let organizationId = "";
  let leadId = "";
  let userId = "";
  let softDeleted = false;

  try {
    const signIn = await supabase.auth.signInWithPassword({
      email: requiredVariables.ACCEPTANCE_TEST_EMAIL,
      password: requiredVariables.ACCEPTANCE_TEST_PASSWORD,
    });
    assertNoSupabaseError("Supabase Auth sign-in", signIn);

    userId = signIn.data.user?.id ?? "";
    if (!userId) fail("Supabase Auth sign-in did not return a user id.");

    const profile = await supabase.rpc("ensure_user_profile", {
      default_org_name: "CRM Acceptance Test",
    });
    assertNoSupabaseError("Profile bootstrap", profile);

    const profileRow = Array.isArray(profile.data) ? profile.data[0] : profile.data;
    organizationId = profileRow?.organization_id ?? "";
    if (!organizationId) fail("Profile bootstrap did not return an organization id.");

    const created = await supabase
      .from("leads")
      .insert({
        organization_id: organizationId,
        name: leadName,
        company_name: companyName,
        contact_name: "Acceptance Contact",
        email: "acceptance@example.test",
        source: "acceptance",
        notes: marker,
        created_by: userId,
        updated_by: userId,
      })
      .select("id, organization_id, name, company_name, notes, deleted_at")
      .single();
    assertNoSupabaseError("Lead create", created);

    leadId = created.data?.id ?? "";
    if (!leadId) fail("Lead create did not return an id.");
    if (created.data?.organization_id !== organizationId) {
      fail("Lead create returned data outside the expected organization scope.");
    }
    if (created.data?.deleted_at) {
      fail("Lead create returned an already soft-deleted row.");
    }
    if (created.data?.name !== leadName || created.data?.company_name !== companyName || created.data?.notes !== marker) {
      fail("Lead create returned unexpected field values.");
    }

    await assertAnonymousLeadIsHidden({
      supabaseUrl: requiredVariables.ACCEPTANCE_SUPABASE_URL,
      publishableKey: requiredVariables.ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY,
      leadId,
    });

    if (otherTestEmail && otherTestPassword) {
      await assertOtherOrganizationLeadIsHidden({
        supabaseUrl: requiredVariables.ACCEPTANCE_SUPABASE_URL,
        publishableKey: requiredVariables.ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY,
        email: otherTestEmail,
        password: otherTestPassword,
        sourceOrganizationId: organizationId,
        leadId,
      });
    }

    const updated = await supabase
      .from("leads")
      .update({
        phone: updatedPhone,
        notes: updatedNotes,
        updated_by: userId,
      })
      .eq("organization_id", organizationId)
      .eq("id", leadId)
      .is("deleted_at", null)
      .select("id, phone, notes, deleted_at")
      .single();
    assertNoSupabaseError("Lead update", updated);

    if (updated.data?.phone !== updatedPhone || updated.data?.notes !== updatedNotes) {
      fail("Lead update returned unexpected data.");
    }

    const readBack = await supabase
      .from("leads")
      .select("id, organization_id, phone, notes, deleted_at")
      .eq("organization_id", organizationId)
      .eq("id", leadId)
      .is("deleted_at", null)
      .single();
    assertNoSupabaseError("Lead read-back", readBack);

    if (readBack.data?.id !== leadId || readBack.data?.organization_id !== organizationId) {
      fail("Lead read-back returned data outside the expected organization scope.");
    }
    if (readBack.data?.phone !== updatedPhone || readBack.data?.notes !== updatedNotes || readBack.data?.deleted_at) {
      fail("Lead read-back returned unexpected persisted values.");
    }

    const deleted = await supabase
      .from("leads")
      .update({
        deleted_at: now,
        updated_by: userId,
      })
      .eq("organization_id", organizationId)
      .eq("id", leadId)
      .is("deleted_at", null)
      .select("id, deleted_at")
      .single();
    assertNoSupabaseError("Lead soft delete", deleted);

    if (!deleted.data?.deleted_at) fail("Lead soft delete did not persist deleted_at.");
    softDeleted = true;

    const hiddenAfterDelete = await supabase
      .from("leads")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("id", leadId)
      .is("deleted_at", null)
      .maybeSingle();
    assertNoSupabaseError("Post-delete visibility check", hiddenAfterDelete);

    if (hiddenAfterDelete.data) {
      fail("Soft-deleted lead is still visible in active lead queries.");
    }

    console.log("Supabase acceptance passed: auth, profile bootstrap, anonymous/optional cross-organization read isolation, lead create/read/update/soft-delete, and organization scoping.");
  } finally {
    await cleanupLead({ supabase, organizationId, leadId, userId, softDeleted });
    await supabase.auth.signOut().catch(() => {});
  }
}

try {
  await run();
} catch (error) {
  if (error instanceof AcceptanceFailure) {
    console.error(error.message);
    for (const detail of error.details) {
      console.error(`- ${detail}`);
    }
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }

  process.exitCode = 1;
}

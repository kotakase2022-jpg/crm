import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
const acceptanceScript = readFileSync(path.join(process.cwd(), "scripts", "supabase-live-acceptance.mjs"), "utf8");

describe("package scripts", () => {
  it("uses a guarded Husky prepare script for production-safe installs", () => {
    expect(packageJson.scripts.prepare).toBe("node scripts/prepare-husky.mjs");
  });

  it("keeps live Supabase acceptance explicit and outside the default quality gate", () => {
    expect(packageJson.scripts["acceptance:supabase"]).toBe("node scripts/supabase-live-acceptance.mjs");
    expect(packageJson.scripts.quality).not.toContain("acceptance:supabase");
  });

  it("keeps live Supabase acceptance guarded by authenticated RLS and anonymous isolation checks", () => {
    expect(acceptanceScript).toContain("ACCEPTANCE_NON_PRODUCTION_CONFIRMATION");
    expect(acceptanceScript).toContain("assertPublishableKey");
    expect(acceptanceScript).toContain("service_role");
    expect(acceptanceScript).toContain("sb_secret_");
    expect(acceptanceScript).toContain("assertAnonymousLeadIsHidden");
    expect(acceptanceScript).toContain("Anonymous lead visibility check failed.");
    expect(acceptanceScript).toContain("ACCEPTANCE_OTHER_TEST_EMAIL");
    expect(acceptanceScript).toContain("assertOtherOrganizationLeadIsHidden");
    expect(acceptanceScript).toContain("Other organization lead visibility check failed.");
    expect(acceptanceScript).toContain("Lead create returned data outside the expected organization scope.");
    expect(acceptanceScript).toContain("Lead create returned an already soft-deleted row.");
    expect(acceptanceScript).toContain("anonymous/optional cross-organization read isolation");
  });
});

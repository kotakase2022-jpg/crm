import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));

describe("package scripts", () => {
  it("uses a guarded Husky prepare script for production-safe installs", () => {
    expect(packageJson.scripts.prepare).toBe("node scripts/prepare-husky.mjs");
  });

  it("keeps live Supabase acceptance explicit and outside the default quality gate", () => {
    expect(packageJson.scripts["acceptance:supabase"]).toBe("node scripts/supabase-live-acceptance.mjs");
    expect(packageJson.scripts.quality).not.toContain("acceptance:supabase");
  });
});

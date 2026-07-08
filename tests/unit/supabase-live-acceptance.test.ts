import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

type AcceptanceFailureError = Error & { details: string[] };

type AcceptanceModule = {
  AcceptanceFailure: new (message: string, details?: string[]) => AcceptanceFailureError;
  assertPublishableKey: (rawKey: string) => void;
  assertSafeTarget: (rawUrl: string) => void;
  decodeJwtPayload: (rawKey: string) => unknown;
  loadEnvFile: (filePath: string) => void;
  nonProductionConfirmation: string;
  requiredEnv: (name: string) => string;
};

const moduleUrl = pathToFileURL(path.join(process.cwd(), "scripts", "supabase-live-acceptance.mjs")).href;
const acceptance = (await import(moduleUrl)) as AcceptanceModule;
const scriptPath = path.join(process.cwd(), "scripts", "supabase-live-acceptance.mjs");
const envKeys = [
  "ACCEPTANCE_NON_PRODUCTION_CONFIRMATION",
  "ACCEPTANCE_TEST_LOAD_EXISTING",
  "ACCEPTANCE_TEST_LOAD_QUOTED",
  "ACCEPTANCE_TEST_LOAD_SINGLE",
  "ACCEPTANCE_TEST_LOAD_SPACED",
] as const;
const originalExitCode = process.exitCode;
const originalEnv = new Map(envKeys.map((key) => [key, process.env[key]]));

function makeLegacyJwt(payload: Record<string, unknown>) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encodedPayload}.signature`;
}

afterEach(() => {
  for (const key of envKeys) {
    const originalValue = originalEnv.get(key);
    if (originalValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalValue;
    }
  }
  process.exitCode = originalExitCode;
});

describe("Supabase live acceptance safety guards", () => {
  it("does not execute the live acceptance flow when imported by tests", () => {
    expect(process.exitCode).toBe(originalExitCode);
  });

  it("runs as a CLI and fails closed before network access when acceptance env is missing", () => {
    const cleanEnv: NodeJS.ProcessEnv = { ...process.env };
    for (const key of Object.keys(cleanEnv)) {
      if (key.startsWith("ACCEPTANCE_")) delete cleanEnv[key];
    }
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "crm-acceptance-missing-env-"));

    try {
      const result = spawnSync(process.execPath, [scriptPath], {
        cwd: tempDir,
        encoding: "utf8",
        env: cleanEnv,
      });
      const output = `${result.stdout}${result.stderr}`;

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toContain("Missing non-production Supabase acceptance environment variables.");
      expect(output).toContain("ACCEPTANCE_SUPABASE_URL");
      expect(output).toContain("ACCEPTANCE_SUPABASE_PUBLISHABLE_KEY");
      expect(output).toContain("ACCEPTANCE_TEST_EMAIL");
      expect(output).toContain("ACCEPTANCE_TEST_PASSWORD");
      expect(output).not.toContain("Supabase acceptance passed");
      expect(output).not.toContain("at run");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("allows local Supabase targets without the remote confirmation flag", () => {
    delete process.env.ACCEPTANCE_NON_PRODUCTION_CONFIRMATION;

    expect(() => acceptance.assertSafeTarget("http://localhost:54321")).not.toThrow();
    expect(() => acceptance.assertSafeTarget("http://127.0.0.1:54321")).not.toThrow();
    expect(() => acceptance.assertSafeTarget("http://[::1]:54321")).not.toThrow();
  });

  it("requires explicit non-production confirmation for remote Supabase targets", () => {
    delete process.env.ACCEPTANCE_NON_PRODUCTION_CONFIRMATION;

    expect(() => acceptance.assertSafeTarget("https://staging-project.supabase.co")).toThrow(
      acceptance.AcceptanceFailure,
    );

    process.env.ACCEPTANCE_NON_PRODUCTION_CONFIRMATION = acceptance.nonProductionConfirmation;

    expect(() => acceptance.assertSafeTarget("https://staging-project.supabase.co")).not.toThrow();
  });

  it("rejects malformed Supabase acceptance URLs", () => {
    expect(() => acceptance.assertSafeTarget("not a url")).toThrow(acceptance.AcceptanceFailure);
  });

  it("rejects service-role style keys before any network access", () => {
    const legacyServiceRoleJwt = makeLegacyJwt({ role: "service_role" });

    expect(() => acceptance.assertPublishableKey("sb_secret_fake-service-role")).toThrow(
      acceptance.AcceptanceFailure,
    );
    expect(() => acceptance.assertPublishableKey(legacyServiceRoleJwt)).toThrow(acceptance.AcceptanceFailure);
    expect(() => acceptance.assertPublishableKey("sb_publishable_fake-publishable-key")).not.toThrow();
  });

  it("decodes legacy JWT payloads for role validation", () => {
    const legacyAnonJwt = makeLegacyJwt({ role: "anon", iss: "supabase" });

    expect(acceptance.decodeJwtPayload(legacyAnonJwt)).toMatchObject({ role: "anon", iss: "supabase" });
    expect(acceptance.decodeJwtPayload("sb_publishable_not-a-jwt")).toBeNull();
  });

  it("loads local acceptance env files without overwriting existing shell variables", () => {
    const tempDir = mkdtempSync(path.join(os.tmpdir(), "crm-acceptance-env-"));
    const envPath = path.join(tempDir, ".env.acceptance.local");
    process.env.ACCEPTANCE_TEST_LOAD_EXISTING = "from-shell";

    try {
      writeFileSync(
        envPath,
        [
          "# local acceptance fixture",
          "ACCEPTANCE_TEST_LOAD_EXISTING=from-file",
          'ACCEPTANCE_TEST_LOAD_QUOTED="quoted value"',
          "ACCEPTANCE_TEST_LOAD_SINGLE='single quoted value'",
          "ACCEPTANCE_TEST_LOAD_SPACED = spaced value ",
        ].join("\n"),
        "utf8",
      );

      acceptance.loadEnvFile(envPath);

      expect(process.env.ACCEPTANCE_TEST_LOAD_EXISTING).toBe("from-shell");
      expect(process.env.ACCEPTANCE_TEST_LOAD_QUOTED).toBe("quoted value");
      expect(process.env.ACCEPTANCE_TEST_LOAD_SINGLE).toBe("single quoted value");
      expect(process.env.ACCEPTANCE_TEST_LOAD_SPACED).toBe("spaced value");
      expect(acceptance.requiredEnv("ACCEPTANCE_TEST_LOAD_SPACED")).toBe("spaced value");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});

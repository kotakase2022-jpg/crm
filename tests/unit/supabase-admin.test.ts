import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

describe("Supabase admin client", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    supabaseMocks.createClient.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not create a service-role client when the Supabase URL is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_staging");

    expect(createAdminClient()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("does not create a service-role client when the service-role key is missing or blank", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "   ");

    expect(createAdminClient()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("does not accidentally create an admin client with a publishable or anon key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.test");

    for (const key of ["sb_publishable_test", "sb_anon_test"]) {
      supabaseMocks.createClient.mockClear();
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", key);

      expect(createAdminClient()).toBeNull();
      expect(createClient).not.toHaveBeenCalled();
    }
  });

  it("creates a non-persistent service-role client with trimmed server-only settings", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", " https://supabase.example.test ");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", " sb_secret_staging ");

    const client = createAdminClient();

    expect(client).toEqual({ from: expect.any(Function) });
    expect(createClient).toHaveBeenCalledWith("https://supabase.example.test", "sb_secret_staging", {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  });
});

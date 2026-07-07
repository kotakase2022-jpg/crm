import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRecord, listRecords, softDeleteRecord } from "@/lib/crm/data";
import { entityConfigs } from "@/lib/crm/entities";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`Unexpected redirect to ${path}`);
  }),
}));
vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: vi.fn(() => ({ configured: false })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("Supabase CRM data access", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseEnv).mockReset();
    vi.mocked(createClient).mockReset();
  });

  function mockAuthenticatedSupabase(query: Record<string, unknown>) {
    const supabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "user-1" } } }),
        getUser: vi.fn(),
      },
      rpc: vi.fn().mockResolvedValue({ data: { organization_id: "org-1", role: "admin" }, error: null }),
      from: vi.fn(() => query),
    };

    vi.mocked(getSupabaseEnv).mockReturnValue({ configured: true } as never);
    vi.mocked(createClient).mockResolvedValue(supabase as never);

    return supabase;
  }

  it("uses deterministic ordering before paging Supabase list reads", async () => {
    const order = vi.fn();
    const range = vi.fn().mockResolvedValue({ data: [], error: null });
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      order: vi.fn((...args: unknown[]) => {
        order(...args);
        return query;
      }),
      range,
    };
    const supabase = mockAuthenticatedSupabase(query);

    await listRecords(entityConfigs.companies);

    expect(supabase.from).toHaveBeenCalledWith("companies");
    expect(order).toHaveBeenCalledWith("id", { ascending: true });
    expect(order.mock.invocationCallOrder[0]).toBeLessThan(range.mock.invocationCallOrder[0]);
    expect(range).toHaveBeenCalledWith(0, 999);
  });

  it("creates Supabase records with trusted organization and user fields", async () => {
    const query = {
      insert: vi.fn(() => query),
      select: vi.fn(() => query),
      single: vi.fn().mockResolvedValue({ data: { id: "company-1", name: "Safe Company", organization_id: "org-1" }, error: null }),
    };
    const supabase = mockAuthenticatedSupabase(query);

    await createRecord(entityConfigs.companies, {
      id: "client-controlled-id",
      organization_id: "wrong-org",
      created_by: "wrong-user",
      name: "Safe Company",
    });

    expect(supabase.from).toHaveBeenCalledWith("companies");
    expect(query.insert).toHaveBeenCalledWith({
      organization_id: "org-1",
      created_by: "user-1",
      updated_by: "user-1",
      name: "Safe Company",
    });
  });

  it("soft deletes Supabase records by setting deleted_at within the current organization", async () => {
    const query = {
      update: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      select: vi.fn(() => query),
      single: vi.fn().mockResolvedValue({ data: { id: "lead-1", deleted_at: "2026-07-08T00:00:00.000Z" }, error: null }),
    };
    const supabase = mockAuthenticatedSupabase(query);

    await softDeleteRecord(entityConfigs.leads, "lead-1");

    expect(supabase.from).toHaveBeenCalledWith("leads");
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        updated_by: "user-1",
      }),
    );
    expect(query.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(query.eq).toHaveBeenCalledWith("id", "lead-1");
    expect(query.is).toHaveBeenCalledWith("deleted_at", null);
  });
});

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

  function mockAuthenticatedSupabase(query: Record<string, unknown> | ((table: string) => unknown)) {
    const supabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "user-1" } } }),
        getUser: vi.fn(),
      },
      rpc: vi.fn().mockResolvedValue({ data: { organization_id: "org-1", role: "admin" }, error: null }),
      from: vi.fn(typeof query === "function" ? query : () => query),
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

  it("continues paging Supabase list reads until the final short page", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `company-${String(index).padStart(4, "0")}`,
      name: `Company ${index}`,
      organization_id: "org-1",
    }));
    const secondPage = [{ id: "company-1000", name: "Company 1000", organization_id: "org-1" }];
    const range = vi.fn((from: number) =>
      Promise.resolve({
        data: from === 0 ? firstPage : secondPage,
        error: null,
      }),
    );
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      order: vi.fn(() => query),
      range,
    };
    mockAuthenticatedSupabase(query);

    const rows = await listRecords(entityConfigs.companies);

    expect(rows).toHaveLength(1001);
    expect(rows.at(-1)).toMatchObject({ id: "company-1000" });
    expect(range).toHaveBeenCalledTimes(2);
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
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

  it("soft deletes a Supabase lead when its automatic first-call task creation fails", async () => {
    const leadInsert = insertReturning({ id: "lead-1", name: "New Lead", organization_id: "org-1" });
    const leadRelationRead = maybeSingleReturning({ id: "lead-1", name: "New Lead", organization_id: "org-1" });
    const leadConsistencyRead = maybeSingleReturning({ id: "lead-1", name: "New Lead", organization_id: "org-1" });
    const taskInsert = insertFail({ message: "Task insert failed" });
    const leadCleanup = updateReturning({ id: "lead-1" });
    const builders: Record<string, Array<Record<string, unknown>>> = {
      leads: [leadInsert, leadRelationRead, leadConsistencyRead, leadCleanup],
      tasks: [taskInsert],
    };
    const supabase = mockAuthenticatedSupabase((table: string) => {
      const builder = builders[table]?.shift();
      if (!builder) throw new Error(`Unexpected table query: ${table}`);
      return builder;
    });

    await expect(createRecord(entityConfigs.leads, { name: "New Lead" })).rejects.toThrow("Task insert failed");

    expect(supabase.from).toHaveBeenCalledWith("leads");
    expect(supabase.from).toHaveBeenCalledWith("tasks");
    expect(leadCleanup.update).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
      updated_by: "user-1",
    });
    expect(leadCleanup.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(leadCleanup.eq).toHaveBeenCalledWith("id", "lead-1");
    expect(leadCleanup.is).toHaveBeenCalledWith("deleted_at", null);
    expect(leadCleanup.select).toHaveBeenCalledWith("*");
    expect(leadCleanup.single).toHaveBeenCalled();
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

function insertReturning(data: Record<string, unknown>) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  };
  return builder;
}

function insertFail(error: { message: string }) {
  const builder = {
    insert: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue({ data: null, error }),
  };
  return builder;
}

function maybeSingleReturning(data: Record<string, unknown> | null, error: { message: string } | null = null) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  return builder;
}

function updateReturning(data: Record<string, unknown> | null, error: { message: string } | null = null) {
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    select: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  return builder;
}

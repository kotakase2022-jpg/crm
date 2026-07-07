import { beforeEach, describe, expect, it, vi } from "vitest";
import { listRecords } from "@/lib/crm/data";
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

    await listRecords(entityConfigs.companies);

    expect(supabase.from).toHaveBeenCalledWith("companies");
    expect(order).toHaveBeenCalledWith("id", { ascending: true });
    expect(order.mock.invocationCallOrder[0]).toBeLessThan(range.mock.invocationCallOrder[0]);
    expect(range).toHaveBeenCalledWith(0, 999);
  });
});

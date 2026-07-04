import { describe, expect, it, vi } from "vitest";
import { buildAlerts } from "@/lib/crm/alerts";
import { buildCsDashboard, buildFunnel, buildSalesDashboard } from "@/lib/crm/analytics";
import { contractStatuses, dealStages, leadStatuses, ticketStatuses } from "@/lib/crm/options";
import type { DashboardSnapshot } from "@/lib/crm/types";

function snapshot(overrides: Partial<DashboardSnapshot> = {}): DashboardSnapshot {
  return {
    leads: [],
    companies: [],
    contacts: [],
    deals: [],
    tasks: [],
    trials: [],
    contracts: [],
    tickets: [],
    usage: [],
    healthScores: [],
    activities: [],
    ...overrides,
  };
}

describe("CRM dashboard analytics", () => {
  it("returns zeroed funnel and KPI values for empty data", () => {
    const empty = snapshot();

    expect(buildFunnel(empty).every((item) => item.value === 0)).toBe(true);
    expect(buildSalesDashboard(empty).kpis.averageDealDays).toBe(0);
    expect(buildCsDashboard(empty).kpis.unresolvedTickets).toBe(0);
  });

  it("calculates sales and CS KPIs from mixed operational data", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T00:00:00.000Z"));

    const data = snapshot({
      leads: [{ id: "lead-1" }, { id: "lead-2" }, { id: "lead-3" }, { id: "lead-4" }],
      deals: [
        {
          id: "deal-1",
          stage: dealStages[8],
          expected_mrr: 20000,
          created_at: "2026-07-01",
          expected_contract_date: "2026-07-11",
        },
        {
          id: "deal-2",
          stage: dealStages[9],
          expected_mrr: 10000,
          lost_reason: "price",
          created_at: "2026-07-01",
          expected_contract_date: "2026-07-21",
        },
      ],
      trials: [{ id: "trial-1" }],
      contracts: [
        { id: "contract-1", company_id: "company-1", status: contractStatuses[1], mrr: 30000, arr: 360000, renewal_on: "2026-07-20" },
        { id: "contract-2", company_id: "company-2", status: contractStatuses[3], mrr: 20000, arr: 240000, renewal_on: "2026-09-20" },
      ],
      tickets: [
        { id: "ticket-1", status: ticketStatuses[0] },
        { id: "ticket-2", status: ticketStatuses[3] },
      ],
      usage: [
        { id: "usage-1", company_id: "company-1", login_count: 3, documents_created: 10 },
        { id: "usage-2", company_id: "company-2", login_count: 0, documents_created: 5 },
      ],
      healthScores: [
        { id: "health-1", company_id: "company-1", total_score: 85, churn_risk: "low", upsell_candidate: true },
        { id: "health-2", company_id: "company-2", total_score: 39, churn_risk: "high", upsell_candidate: false },
      ],
    });

    const sales = buildSalesDashboard(data);
    const cs = buildCsDashboard(data);
    const funnel = buildFunnel(data);

    expect(sales.kpis.winRate).toBe(50);
    expect(sales.kpis.mrrIncrease).toBe(30000);
    expect(sales.lostReasonCounts.price).toBe(1);
    expect(cs.kpis.paidCompanies).toBe(1);
    expect(cs.kpis.unresolvedTickets).toBe(1);
    expect(cs.kpis.upsellCandidates).toBe(1);
    expect(funnel[0]).toMatchObject({ numerator: 2, denominator: 4, value: 50 });

    vi.useRealTimers();
  });
});

describe("CRM automation alerts", () => {
  it("raises actionable sales and CS alerts from operational conditions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T00:00:00.000Z"));

    const alerts = buildAlerts(
      snapshot({
        leads: [{ id: "lead-1", name: "Lead", company_name: "Sample", status: leadStatuses[0] }],
        deals: [
          { id: "deal-1", name: "Demo Done", stage: dealStages[4], company_id: "company-1" },
          { id: "deal-2", name: "High MRR", stage: dealStages[7], expected_mrr: 50000, company_id: "company-2" },
        ],
        tasks: [],
        trials: [
          { id: "trial-1", company_id: "company-1", deal_id: "deal-1", start_date: "2026-06-28", end_date: "2026-07-05", first_login_at: null },
        ],
        usage: [{ id: "usage-1", company_id: "company-1", last_login_at: "2026-05-01T00:00:00.000Z", documents_created: 0 }],
        tickets: [{ id: "ticket-1", company_id: "company-1", title: "Open", status: ticketStatuses[0], opened_at: "2026-06-30T00:00:00.000Z" }],
        contracts: [{ id: "contract-1", company_id: "company-1", renewal_on: "2026-07-20" }],
        healthScores: [{ id: "health-1", company_id: "company-1", total_score: 39 }],
      }),
    );

    const keys = alerts.map((alert) => alert.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        "lead-first-call-lead-1",
        "demo-follow-up-deal-1",
        "trial-no-login-trial-1",
        "trial-contract-check-trial-1",
        "high-mrr-no-task-deal-2",
        "no-login-30-company-1",
        "documents-zero-company-1",
        "ticket-over-48h-ticket-1",
        "renewal-30-contract-1",
        "health-under-40-company-1",
      ]),
    );

    vi.useRealTimers();
  });
});

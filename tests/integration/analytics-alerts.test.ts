import { afterEach, describe, expect, it, vi } from "vitest";
import { alertSeverityLabel, buildAlerts } from "@/lib/crm/alerts";
import { buildCsDashboard, buildFunnel, buildSalesDashboard, normalizedHealthScore, riskyHealthScores } from "@/lib/crm/analytics";
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
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it("keeps invalid numeric source data from poisoning dashboard totals", () => {
    const data = snapshot({
      deals: [{ id: "deal-invalid", stage: dealStages[8], expected_mrr: "not-a-number" }],
      contracts: [
        {
          id: "contract-invalid",
          company_id: "company-1",
          status: contractStatuses[1],
          mrr: "not-a-number",
          arr: Number.POSITIVE_INFINITY,
        },
      ],
      usage: [{ id: "usage-invalid", company_id: "company-1", login_count: "not-a-number", documents_created: "not-a-number" }],
      healthScores: [{ id: "health-invalid", company_id: "company-1", total_score: "not-a-number" }],
    });

    const sales = buildSalesDashboard(data);
    const cs = buildCsDashboard(data);
    const wonStage = sales.stageCounts.find((stage) => stage.stage === dealStages[8]);

    expect(wonStage?.amount).toBe(0);
    expect(sales.kpis.mrrIncrease).toBe(0);
    expect(sales.kpis.arrIncrease).toBe(0);
    expect(cs.kpis.activeCompanies).toBe(0);
    expect(cs.kpis.documentsCreated).toBe(0);
    expect(cs.kpis.lowHealthCompanies).toBe(1);
    expect(Object.values(sales.kpis).every((value) => Number.isFinite(value))).toBe(true);
    expect(Object.values(cs.kpis).every((value) => Number.isFinite(value))).toBe(true);
  });

  it("normalizes company ids before counting CS company KPIs", () => {
    const data = snapshot({
      contracts: [
        { id: "contract-paid-1", company_id: " company-1 ", status: contractStatuses[1], mrr: 10000, arr: 120000 },
        { id: "contract-paid-2", company_id: "company-1", status: ` ${contractStatuses[1]} `, mrr: 20000, arr: 240000 },
        { id: "contract-paid-blank", company_id: "   ", status: contractStatuses[1], mrr: 30000, arr: 360000 },
        { id: "contract-churn", company_id: "company-2", status: contractStatuses[3], mrr: 10000, arr: 120000 },
      ],
      usage: [
        { id: "usage-active-1", company_id: " company-1 ", login_count: 2 },
        { id: "usage-active-2", company_id: "company-1", login_count: 1 },
        { id: "usage-active-blank", company_id: "   ", login_count: 4 },
        { id: "usage-active-missing", login_count: 5 },
        { id: "usage-inactive", company_id: "company-2", login_count: 0 },
      ],
    });

    const cs = buildCsDashboard(data);

    expect(cs.kpis.paidCompanies).toBe(1);
    expect(cs.kpis.activeCompanies).toBe(1);
  });

  it("uses the latest usage row per company when counting active CS companies", () => {
    const data = snapshot({
      usage: [
        { id: "usage-old-active", company_id: " company-1 ", period_end: "2026-05-31", login_count: 5 },
        { id: "usage-latest-inactive", company_id: "company-1", period_end: "2026-06-30", login_count: 0 },
        { id: "usage-old-inactive", company_id: "company-2", period_end: "2026-05-31", login_count: 0 },
        { id: "usage-latest-active", company_id: " company-2 ", period_end: "2026-06-30", login_count: 1 },
      ],
    });

    const cs = buildCsDashboard(data);

    expect(cs.kpis.activeCompanies).toBe(1);
  });

  it("uses the latest usage row per company when totaling CS document volume", () => {
    const data = snapshot({
      usage: [
        { id: "usage-old-high", company_id: " company-1 ", period_end: "2026-05-31", documents_created: 100 },
        { id: "usage-latest-low", company_id: "company-1", period_end: "2026-06-30", documents_created: 5 },
        { id: "usage-company-2", company_id: "company-2", period_end: "2026-06-30", documents_created: 7 },
      ],
    });

    const cs = buildCsDashboard(data);

    expect(cs.kpis.documentsCreated).toBe(12);
  });

  it("ignores surrounding whitespace in stage and status KPI decisions", () => {
    const data = snapshot({
      leads: [{ id: "lead-1" }, { id: "lead-2" }, { id: "lead-3" }],
      deals: [
        { id: "deal-won", stage: ` ${dealStages[8]} `, expected_mrr: 12000 },
        { id: "deal-lost", stage: ` ${dealStages[9]} `, lost_reason: "価格" },
        { id: "deal-demo", stage: ` ${dealStages[3]} ` },
      ],
      trials: [{ id: "trial-1" }],
      contracts: [
        { id: "contract-paid", company_id: "company-paid", status: ` ${contractStatuses[1]} `, mrr: 10000, arr: 120000 },
        { id: "contract-churn", company_id: "company-churn", status: ` ${contractStatuses[3]} `, mrr: 8000, arr: 96000 },
      ],
      tickets: [
        { id: "ticket-resolved", status: ` ${ticketStatuses[3]} ` },
        { id: "ticket-open", status: ` ${ticketStatuses[0]} ` },
      ],
    });

    const sales = buildSalesDashboard(data);
    const cs = buildCsDashboard(data);
    const funnel = buildFunnel(data);

    expect(sales.kpis.won).toBe(1);
    expect(sales.kpis.lost).toBe(1);
    expect(sales.kpis.demoScheduled).toBe(2);
    expect(sales.kpis.mrrIncrease).toBe(10000);
    expect(sales.lostReasonCounts).toMatchObject({ "価格": 1 });
    expect(cs.kpis.paidCompanies).toBe(1);
    expect(cs.kpis.churnScheduled).toBe(1);
    expect(cs.kpis.unresolvedTickets).toBe(1);
    expect(funnel[0]).toMatchObject({ numerator: 3, denominator: 3, value: 100 });
    expect(funnel[3]).toMatchObject({ numerator: 1, denominator: 1, value: 100 });
  });

  it("groups blank report bucket labels under unset", () => {
    const data = snapshot({
      deals: [
        { id: "deal-lost-empty", stage: dealStages[9], lost_reason: "" },
        { id: "deal-lost-blank", stage: dealStages[9], lost_reason: "   " },
        { id: "deal-lost-price", stage: dealStages[9], lost_reason: "price" },
      ],
      healthScores: [
        { id: "health-empty", company_id: "company-empty", churn_risk: "" },
        { id: "health-blank", company_id: "company-blank", churn_risk: "   " },
        { id: "health-high", company_id: "company-high", churn_risk: "high" },
      ],
    });

    const sales = buildSalesDashboard(data);
    const cs = buildCsDashboard(data);

    expect(sales.lostReasonCounts).toMatchObject({ "未設定": 2, price: 1 });
    expect(cs.riskCounts).toMatchObject({ "未設定": 2, high: 1 });
    expect(sales.lostReasonCounts[""]).toBeUndefined();
    expect(cs.riskCounts[""]).toBeUndefined();
  });

  it("keeps the risky-customer list aligned with CS low-health KPI for malformed scores", () => {
    const healthScores = [
      { id: "health-invalid", company_id: "company-invalid", total_score: "not-a-number" },
      { id: "health-negative", company_id: "company-negative", total_score: -12 },
      { id: "health-low", company_id: "company-low", total_score: 39 },
      { id: "health-healthy", company_id: "company-healthy", total_score: 61 },
      { id: "health-too-high", company_id: "company-too-high", total_score: 999 },
    ];

    const cs = buildCsDashboard(snapshot({ healthScores }));
    const risky = riskyHealthScores(healthScores);

    expect(cs.kpis.lowHealthCompanies).toBe(3);
    expect(risky.map((score) => score.id)).toEqual(["health-invalid", "health-negative", "health-low"]);
    expect(risky.map((score) => normalizedHealthScore(score))).toEqual([0, 0, 39]);
    expect(normalizedHealthScore(healthScores[4])).toBe(100);
  });
});

describe("CRM automation alerts", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("provides Japanese severity labels for dashboard alert badges", () => {
    expect(alertSeverityLabel("danger")).toBe("緊急");
    expect(alertSeverityLabel("warning")).toBe("注意");
    expect(alertSeverityLabel("info")).toBe("確認");
  });

  it("raises actionable sales and CS alerts from operational conditions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 3, 0, 30));

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
    const alertsByKey = new Map(alerts.map((alert) => [alert.key, alert]));

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
    expect(alertsByKey.get("lead-first-call-lead-1")?.dueDate).toBe("2026-07-03");
    expect(alertsByKey.get("demo-follow-up-deal-1")?.dueDate).toBe("2026-07-04");
    expect(alertsByKey.get("renewal-30-contract-1")?.dueDate).toBe("2026-07-06");

    vi.useRealTimers();
  });

  it("uses the latest product usage row per company for usage-risk alerts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T00:00:00.000Z"));

    const alerts = buildAlerts(
      snapshot({
        usage: [
          {
            id: "usage-old-risk",
            company_id: "company-1",
            period_end: "2026-05-31",
            last_login_at: "2026-04-01T00:00:00.000Z",
            documents_created: 0,
          },
          {
            id: "usage-latest-healthy",
            company_id: "company-1",
            period_end: "2026-06-30",
            last_login_at: "2026-07-02T00:00:00.000Z",
            documents_created: 12,
          },
          {
            id: "usage-latest-risk",
            company_id: "company-2",
            period_end: "2026-06-30",
            last_login_at: "2026-05-01T00:00:00.000Z",
            documents_created: 0,
          },
        ],
      }),
    );

    const keys = alerts.map((alert) => alert.key);

    expect(keys).not.toContain("no-login-30-company-1");
    expect(keys).not.toContain("documents-zero-company-1");
    expect(keys).toEqual(expect.arrayContaining(["no-login-30-company-2", "documents-zero-company-2"]));

    vi.useRealTimers();
  });

  it("normalizes relation ids before suppressing duplicate alert noise", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T00:00:00.000Z"));

    const alerts = buildAlerts(
      snapshot({
        leads: [{ id: "lead-1", name: "Lead", company_name: "Sample", status: leadStatuses[1] }],
        activities: [{ id: "activity-1", lead_id: " lead-1 " }],
        deals: [{ id: "deal-1", name: "High MRR", expected_mrr: 50000, company_id: " company-1 " }],
        tasks: [{ id: "task-1", deal_id: " deal-1 ", status: "open" }],
        usage: [
          {
            id: "usage-old-risk",
            company_id: " company-1 ",
            period_end: "2026-05-31",
            last_login_at: "2026-04-01T00:00:00.000Z",
            documents_created: 0,
          },
          {
            id: "usage-latest-healthy",
            company_id: "company-1",
            period_end: "2026-06-30",
            last_login_at: "2026-07-02T00:00:00.000Z",
            documents_created: 12,
          },
        ],
      }),
    );

    const keys = alerts.map((alert) => alert.key);

    expect(keys).not.toContain("lead-first-call-lead-1");
    expect(keys).not.toContain("high-mrr-no-task-deal-1");
    expect(keys.some((key) => key.startsWith("no-login-30-"))).toBe(false);
    expect(keys.some((key) => key.startsWith("documents-zero-"))).toBe(false);

    vi.useRealTimers();
  });

  it("trims emitted alert relation ids so dashboard actions link to valid records", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T00:00:00.000Z"));

    const alerts = buildAlerts(
      snapshot({
        deals: [{ id: "deal-demo", name: "Demo Done", stage: dealStages[4], company_id: " company-demo " }],
        trials: [
          {
            id: "trial-1",
            company_id: " company-trial ",
            deal_id: " deal-trial ",
            start_date: "2026-06-28",
            end_date: "2026-07-20",
            first_login_at: null,
          },
        ],
        usage: [
          {
            id: "usage-risk",
            company_id: " company-risk ",
            period_end: "2026-06-30",
            last_login_at: "2026-05-01T00:00:00.000Z",
            documents_created: 5,
          },
        ],
        tickets: [{ id: "ticket-1", company_id: " company-ticket ", title: "Open", status: ticketStatuses[0], opened_at: "2026-06-30T00:00:00.000Z" }],
        contracts: [{ id: "contract-1", company_id: " company-contract ", renewal_on: "2026-07-20" }],
        healthScores: [{ id: "health-1", company_id: " company-health ", total_score: 39 }],
      }),
    );

    const alertsByKey = new Map(alerts.map((alert) => [alert.key, alert]));

    expect(alertsByKey.get("demo-follow-up-deal-demo")).toMatchObject({ company_id: "company-demo", deal_id: "deal-demo" });
    expect(alertsByKey.get("trial-no-login-trial-1")).toMatchObject({ company_id: "company-trial", deal_id: "deal-trial" });
    expect(alertsByKey.get("no-login-30-company-risk")).toMatchObject({ company_id: "company-risk" });
    expect(alertsByKey.get("ticket-over-48h-ticket-1")).toMatchObject({ company_id: "company-ticket", support_ticket_id: "ticket-1" });
    expect(alertsByKey.get("renewal-30-contract-1")).toMatchObject({ company_id: "company-contract" });
    expect(alertsByKey.get("health-under-40-company-health")).toMatchObject({ company_id: "company-health" });

    vi.useRealTimers();
  });

  it("treats invalid numeric risk inputs as risky instead of hiding CS alerts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T00:00:00.000Z"));

    const alerts = buildAlerts(
      snapshot({
        usage: [
          {
            id: "usage-invalid",
            company_id: "company-invalid-usage",
            period_end: "2026-07-02",
            last_login_at: "2026-07-02T00:00:00.000Z",
            documents_created: "not-a-number",
          },
        ],
        healthScores: [{ id: "health-invalid", company_id: "company-invalid-health", total_score: "not-a-number" }],
      }),
    );

    const keys = alerts.map((alert) => alert.key);

    expect(keys).toContain("documents-zero-company-invalid-usage");
    expect(keys).toContain("health-under-40-company-invalid-health");

    vi.useRealTimers();
  });

  it("ignores surrounding whitespace in alert state decisions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-03T00:00:00.000Z"));

    const alerts = buildAlerts(
      snapshot({
        leads: [{ id: "lead-1", name: "Lead", company_name: "Sample", status: ` ${leadStatuses[1]} ` }],
        deals: [{ id: "deal-1", name: "Demo Done", stage: ` ${dealStages[4]} ` }],
        tasks: [{ id: "completed-lead-task", automation_key: "lead-first-call-lead-1", status: " 完了 " }],
        tickets: [
          { id: "ticket-resolved", title: "Resolved", status: ` ${ticketStatuses[3]} `, opened_at: "2026-06-30T00:00:00.000Z" },
          { id: "ticket-open", title: "Open", status: ` ${ticketStatuses[0]} `, opened_at: "2026-06-30T00:00:00.000Z" },
        ],
      }),
    );

    const keys = alerts.map((alert) => alert.key);

    expect(keys).toContain("lead-first-call-lead-1");
    expect(keys).toContain("demo-follow-up-deal-1");
    expect(keys).toContain("ticket-over-48h-ticket-open");
    expect(keys).not.toContain("ticket-over-48h-ticket-resolved");

    vi.useRealTimers();
  });

  it("does not show automation alerts when the generated task is still open", () => {
    const alerts = buildAlerts(
      snapshot({
        leads: [{ id: "lead-1", name: "Lead", company_name: "Sample", status: leadStatuses[0] }],
        tasks: [{ id: "task-1", automation_key: "lead-first-call-lead-1", status: "未完了" }],
      }),
    );

    expect(alerts.map((alert) => alert.key)).not.toContain("lead-first-call-lead-1");

    const alertsAfterSoftDelete = buildAlerts(
      snapshot({
        leads: [{ id: "lead-1", name: "Lead", company_name: "Sample", status: leadStatuses[0] }],
        tasks: [{ id: "task-1", automation_key: "lead-first-call-lead-1", status: "未完了", deleted_at: "2026-07-03T00:00:00.000Z" }],
      }),
    );

    expect(alertsAfterSoftDelete.map((alert) => alert.key)).toContain("lead-first-call-lead-1");

    const alertsAfterCompletion = buildAlerts(
      snapshot({
        leads: [{ id: "lead-1", name: "Lead", company_name: "Sample", status: leadStatuses[0] }],
        tasks: [{ id: "task-1", automation_key: "lead-first-call-lead-1", status: "完了" }],
      }),
    );

    expect(alertsAfterCompletion.map((alert) => alert.key)).toContain("lead-first-call-lead-1");
  });
});

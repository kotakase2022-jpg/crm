import { describe, expect, it } from "vitest";
import { calculateHealthScore, riskFromScore, scoreStatus } from "@/lib/crm/health";

describe("health score calculation", () => {
  it("scores a fully adopted customer as healthy and low risk", () => {
    const score = calculateHealthScore({
      usage: {
        id: "usage-1",
        login_count: 100,
        documents_created: 100,
        active_users_count: 10,
        setup_completion_rate: 100,
      },
      openTicketCount: 0,
      renewalDays: 90,
      subjectiveScore: 10,
    });

    expect(score.total_score).toBe(100);
    expect(score.health_status).toBe(scoreStatus(100));
    expect(score.churn_risk).toBe(riskFromScore(100));
  });

  it("keeps zero usage and many unresolved tickets in the danger range", () => {
    const score = calculateHealthScore({
      usage: null,
      openTicketCount: 5,
      renewalDays: -1,
      subjectiveScore: -5,
    });

    expect(score.total_score).toBe(2);
    expect(score.health_status).toBe(scoreStatus(2));
    expect(score.churn_risk).toBe(riskFromScore(2));
  });

  it("keeps invalid usage metrics from producing NaN health scores", () => {
    const score = calculateHealthScore({
      usage: {
        id: "usage-invalid",
        login_count: "not-a-number",
        documents_created: Number.NaN,
        active_users_count: Number.POSITIVE_INFINITY,
        setup_completion_rate: "invalid",
      },
      openTicketCount: 0,
      renewalDays: null,
      subjectiveScore: Number.NaN,
    });

    expect(score.login_frequency_score).toBe(0);
    expect(score.document_count_score).toBe(0);
    expect(score.active_users_score).toBe(0);
    expect(score.setup_score).toBe(0);
    expect(score.cs_subjective_score).toBe(7);
    expect(score.total_score).toBe(22);
    expect(Number.isFinite(score.total_score)).toBe(true);
  });

  it("clamps negative usage metrics at zero before scoring", () => {
    const score = calculateHealthScore({
      usage: {
        id: "usage-negative",
        login_count: -10,
        documents_created: -12,
        active_users_count: -3,
        setup_completion_rate: -50,
      },
      openTicketCount: 0,
      renewalDays: 90,
      subjectiveScore: 7,
    });

    expect(score.login_frequency_score).toBe(0);
    expect(score.document_count_score).toBe(0);
    expect(score.active_users_score).toBe(0);
    expect(score.setup_score).toBe(0);
    expect(score.total_score).toBe(27);
    expect(Object.values(score).filter((value): value is number => typeof value === "number").every((value) => value >= 0)).toBe(true);
  });

  it("keeps support and renewal inputs from pushing scores outside the 0-100 range", () => {
    const score = calculateHealthScore({
      usage: {
        id: "usage-boundary",
        login_count: 100,
        documents_created: 100,
        active_users_count: 10,
        setup_completion_rate: 100,
      },
      openTicketCount: -4,
      renewalDays: Number.NaN,
      subjectiveScore: 10,
    });

    expect(score.support_score).toBe(10);
    expect(score.renewal_score).toBe(5);
    expect(score.total_score).toBe(95);
    expect(score.total_score).toBeLessThanOrEqual(100);
  });

  it("maps score boundaries to expected statuses and risks", () => {
    expect(scoreStatus(80)).toBe(scoreStatus(100));
    expect(scoreStatus(60)).not.toBe(scoreStatus(59));
    expect(scoreStatus(40)).not.toBe(scoreStatus(39));
    expect(riskFromScore(39)).not.toBe(riskFromScore(60));
  });
});

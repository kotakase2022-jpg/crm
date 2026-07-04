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

  it("maps score boundaries to expected statuses and risks", () => {
    expect(scoreStatus(80)).toBe(scoreStatus(100));
    expect(scoreStatus(60)).not.toBe(scoreStatus(59));
    expect(scoreStatus(40)).not.toBe(scoreStatus(39));
    expect(riskFromScore(39)).not.toBe(riskFromScore(60));
  });
});

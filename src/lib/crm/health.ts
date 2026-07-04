import { toNumber } from "./format";
import type { CrmRecord } from "./types";

export type HealthBreakdown = {
  login_frequency_score: number;
  document_count_score: number;
  active_users_score: number;
  setup_score: number;
  support_score: number;
  renewal_score: number;
  cs_subjective_score: number;
  total_score: number;
  health_status: "健全" | "普通" | "注意" | "危険";
  churn_risk: "低" | "中" | "高";
};

export function scoreStatus(total: number): HealthBreakdown["health_status"] {
  if (total >= 80) return "健全";
  if (total >= 60) return "普通";
  if (total >= 40) return "注意";
  return "危険";
}

export function riskFromScore(total: number): HealthBreakdown["churn_risk"] {
  if (total < 40) return "高";
  if (total < 60) return "中";
  return "低";
}

export function calculateHealthScore(args: {
  usage?: CrmRecord | null;
  openTicketCount?: number;
  renewalDays?: number | null;
  subjectiveScore?: number;
}): HealthBreakdown {
  const loginCount = toNumber(args.usage?.login_count);
  const documents = toNumber(args.usage?.documents_created);
  const activeUsers = toNumber(args.usage?.active_users_count);
  const setup = toNumber(args.usage?.setup_completion_rate);

  const login_frequency_score = Math.min(20, Math.round(loginCount / 2));
  const document_count_score = Math.min(25, Math.round(documents / 4));
  const active_users_score = Math.min(15, activeUsers * 2);
  const setup_score = Math.min(10, Math.round(setup / 10));
  const support_score = Math.max(0, 10 - (args.openTicketCount ?? 0) * 3);
  const renewal_score =
    args.renewalDays === null || args.renewalDays === undefined
      ? 5
      : args.renewalDays < 0
        ? 2
        : args.renewalDays <= 30
          ? 6
          : 10;
  const cs_subjective_score = Math.min(10, Math.max(0, args.subjectiveScore ?? 7));
  const total_score =
    login_frequency_score +
    document_count_score +
    active_users_score +
    setup_score +
    support_score +
    renewal_score +
    cs_subjective_score;

  return {
    login_frequency_score,
    document_count_score,
    active_users_score,
    setup_score,
    support_score,
    renewal_score,
    cs_subjective_score,
    total_score,
    health_status: scoreStatus(total_score),
    churn_risk: riskFromScore(total_score),
  };
}

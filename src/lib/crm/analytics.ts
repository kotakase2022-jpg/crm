import { dealStages } from "./options";
import { daysUntil, toDate, toFiniteNumber } from "./format";
import { latestHealthScoresByCompany } from "./health";
import { relationIdValue } from "./related";
import { hasAnyValue, hasValue, latestUsageRowsByCompany } from "./usage";
import type { CrmRecord, DashboardSnapshot } from "./types";

type DealStage = (typeof dealStages)[number];

function stageRangeThroughWon(startStage: DealStage) {
  const startIndex = dealStages.indexOf(startStage);
  const wonIndex = dealStages.indexOf("受注");
  return dealStages.slice(startIndex, wonIndex + 1);
}

const demoScheduledStages = stageRangeThroughWon("デモ設定");
const demoDoneStages = stageRangeThroughWon("デモ実施");

function bucketLabel(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "未設定";
  }

  return value === null || value === undefined ? "未設定" : String(value);
}

function countBy(rows: CrmRecord[], field: string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = bucketLabel(row[field]);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function sumBy(rows: CrmRecord[], field: string) {
  return rows.reduce((sum, row) => sum + toFiniteNumber(row[field]), 0);
}

function uniqueRelationIdCount(rows: CrmRecord[], field: string) {
  const ids = rows.map((row) => relationIdValue(row[field])).filter((id): id is string => Boolean(id));
  return new Set(ids).size;
}

function isStage(row: CrmRecord, stage: string) {
  return hasValue(row.stage, stage);
}

function percent(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export function normalizedHealthScore(score: CrmRecord) {
  return Math.min(100, Math.max(0, toFiniteNumber(score.total_score)));
}

export function riskyHealthScores(healthScores: CrmRecord[], limit = 8) {
  return latestHealthScoresByCompany(healthScores)
    .filter((score) => normalizedHealthScore(score) < 60)
    .sort((a, b) => normalizedHealthScore(a) - normalizedHealthScore(b))
    .slice(0, limit);
}

export function buildSalesDashboard(snapshot: DashboardSnapshot) {
  const wonDeals = snapshot.deals.filter((deal) => isStage(deal, "受注"));
  const lostDeals = snapshot.deals.filter((deal) => isStage(deal, "失注"));
  const stageCounts = dealStages.map((stage) => ({
    stage,
    count: snapshot.deals.filter((deal) => isStage(deal, stage)).length,
    amount: sumBy(snapshot.deals.filter((deal) => isStage(deal, stage)), "expected_mrr"),
  }));

  const dealDays = snapshot.deals
    .map((deal) => {
      const created = toDate(deal.created_at);
      const expected = toDate(deal.expected_contract_date);
      if (!created || !expected) return null;
      return Math.max(1, Math.round((expected.getTime() - created.getTime()) / 86_400_000));
    })
    .filter((value): value is number => value !== null);

  return {
    kpis: {
      newLeads: snapshot.leads.length,
      dealCreated: snapshot.deals.length,
      demoScheduled: snapshot.deals.filter((deal) => hasAnyValue(deal.stage, demoScheduledStages)).length,
      demoDone: snapshot.deals.filter((deal) => hasAnyValue(deal.stage, demoDoneStages)).length,
      trialStarted: snapshot.trials.length,
      won: wonDeals.length,
      lost: lostDeals.length,
      mrrIncrease: sumBy(snapshot.contracts.filter((contract) => hasValue(contract.status, "有料")), "mrr"),
      arrIncrease: sumBy(snapshot.contracts.filter((contract) => hasValue(contract.status, "有料")), "arr"),
      winRate: percent(wonDeals.length, wonDeals.length + lostDeals.length),
      averageDealDays: dealDays.length ? Math.round(dealDays.reduce((a, b) => a + b, 0) / dealDays.length) : 0,
    },
    stageCounts,
    lostReasonCounts: countBy(lostDeals, "lost_reason"),
  };
}

export function buildCsDashboard(snapshot: DashboardSnapshot) {
  const paidContracts = snapshot.contracts.filter((contract) => hasValue(contract.status, "有料"));
  const latestUsageRows = latestUsageRowsByCompany(snapshot.usage);
  const latestHealthScores = latestHealthScoresByCompany(snapshot.healthScores);
  const activeUsageRows = latestUsageRows.filter((usage) => toFiniteNumber(usage.login_count) > 0);
  const lowHealth = riskyHealthScores(latestHealthScores, Number.POSITIVE_INFINITY);
  const renewalSoon = snapshot.contracts.filter((contract) => {
    const days = daysUntil(contract.renewal_on);
    return days !== null && days >= 0 && days <= 30;
  });

  return {
    kpis: {
      paidCompanies: uniqueRelationIdCount(paidContracts, "company_id"),
      activeCompanies: uniqueRelationIdCount(activeUsageRows, "company_id"),
      documentsCreated: sumBy(latestUsageRows, "documents_created"),
      lowHealthCompanies: lowHealth.length,
      renewalSoon: renewalSoon.length,
      churnScheduled: snapshot.contracts.filter((contract) => hasValue(contract.status, "解約予定")).length,
      unresolvedTickets: snapshot.tickets.filter((ticket) => !hasAnyValue(ticket.status, ["解決済み", "クローズ"])).length,
      upsellCandidates: latestHealthScores.filter((score) => Boolean(score.upsell_candidate)).length,
    },
    riskCounts: countBy(latestHealthScores, "churn_risk"),
  };
}

export function buildFunnel(snapshot: DashboardSnapshot) {
  const leadCount = snapshot.leads.length;
  const dealCount = snapshot.deals.length;
  const demoCount = snapshot.deals.filter((deal) => hasAnyValue(deal.stage, demoScheduledStages)).length;
  const trialCount = snapshot.trials.length;
  const paidCount = snapshot.contracts.filter((contract) => hasValue(contract.status, "有料")).length;

  return [
    { label: "リード → 商談化率", value: percent(dealCount, leadCount), numerator: dealCount, denominator: leadCount },
    { label: "商談 → デモ設定率", value: percent(demoCount, dealCount), numerator: demoCount, denominator: dealCount },
    { label: "デモ → トライアル開始率", value: percent(trialCount, demoCount), numerator: trialCount, denominator: demoCount },
    { label: "トライアル → 有料化率", value: percent(paidCount, trialCount), numerator: paidCount, denominator: trialCount },
  ];
}

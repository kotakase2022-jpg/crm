import { dealStages } from "./options";
import { daysUntil, toDate, toNumber } from "./format";
import type { CrmRecord, DashboardSnapshot } from "./types";

function countBy(rows: CrmRecord[], field: string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = String(row[field] ?? "未設定");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function sumBy(rows: CrmRecord[], field: string) {
  return rows.reduce((sum, row) => sum + toNumber(row[field]), 0);
}

function isStage(row: CrmRecord, stage: string) {
  return row.stage === stage;
}

function percent(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
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
      demoScheduled: snapshot.deals.filter((deal) => ["デモ設定", "デモ実施", "トライアル開始", "利用確認中", "契約交渉", "受注"].includes(String(deal.stage))).length,
      demoDone: snapshot.deals.filter((deal) => ["デモ実施", "トライアル開始", "利用確認中", "契約交渉", "受注"].includes(String(deal.stage))).length,
      trialStarted: snapshot.trials.length,
      won: wonDeals.length,
      lost: lostDeals.length,
      mrrIncrease: sumBy(snapshot.contracts.filter((contract) => contract.status === "有料"), "mrr"),
      arrIncrease: sumBy(snapshot.contracts.filter((contract) => contract.status === "有料"), "arr"),
      winRate: percent(wonDeals.length, wonDeals.length + lostDeals.length),
      averageDealDays: dealDays.length ? Math.round(dealDays.reduce((a, b) => a + b, 0) / dealDays.length) : 0,
    },
    stageCounts,
    lostReasonCounts: countBy(lostDeals, "lost_reason"),
  };
}

export function buildCsDashboard(snapshot: DashboardSnapshot) {
  const paidContracts = snapshot.contracts.filter((contract) => contract.status === "有料");
  const activeCompanyIds = new Set(snapshot.usage.filter((usage) => toNumber(usage.login_count) > 0).map((usage) => usage.company_id));
  const lowHealth = snapshot.healthScores.filter((score) => toNumber(score.total_score) < 60);
  const renewalSoon = snapshot.contracts.filter((contract) => {
    const days = daysUntil(contract.renewal_on);
    return days !== null && days >= 0 && days <= 30;
  });

  return {
    kpis: {
      paidCompanies: new Set(paidContracts.map((contract) => contract.company_id)).size,
      activeCompanies: activeCompanyIds.size,
      documentsCreated: sumBy(snapshot.usage, "documents_created"),
      lowHealthCompanies: lowHealth.length,
      renewalSoon: renewalSoon.length,
      churnScheduled: snapshot.contracts.filter((contract) => contract.status === "解約予定").length,
      unresolvedTickets: snapshot.tickets.filter((ticket) => !["解決済み", "クローズ"].includes(String(ticket.status))).length,
      upsellCandidates: snapshot.healthScores.filter((score) => Boolean(score.upsell_candidate)).length,
    },
    riskCounts: countBy(snapshot.healthScores, "churn_risk"),
  };
}

export function buildFunnel(snapshot: DashboardSnapshot) {
  const leadCount = snapshot.leads.length;
  const dealCount = snapshot.deals.length;
  const demoCount = snapshot.deals.filter((deal) => ["デモ設定", "デモ実施", "トライアル開始", "利用確認中", "契約交渉", "受注"].includes(String(deal.stage))).length;
  const trialCount = snapshot.trials.length;
  const paidCount = snapshot.contracts.filter((contract) => contract.status === "有料").length;

  return [
    { label: "リード → 商談化率", value: percent(dealCount, leadCount), numerator: dealCount, denominator: leadCount },
    { label: "商談 → デモ設定率", value: percent(demoCount, dealCount), numerator: demoCount, denominator: dealCount },
    { label: "デモ → トライアル開始率", value: percent(trialCount, demoCount), numerator: trialCount, denominator: demoCount },
    { label: "トライアル → 有料化率", value: percent(paidCount, trialCount), numerator: paidCount, denominator: trialCount },
  ];
}

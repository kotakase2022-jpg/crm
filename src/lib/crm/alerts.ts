import { daysUntil, offsetLocalDateString, toDate, toFiniteNumber } from "./format";
import { hasOpenAutomationTask, isOpenTask } from "./automation";
import { relationIdMatches, relationIdValue } from "./related";
import { hasAnyValue, hasValue, latestUsageRowsByCompany } from "./usage";
import type { CrmRecord, DashboardSnapshot } from "./types";

export type CrmAlert = {
  key: string;
  severity: "info" | "warning" | "danger";
  title: string;
  description: string;
  taskTitle?: string;
  dueDate?: string;
  priority?: "低" | "中" | "高" | "緊急";
  lead_id?: string | null;
  company_id?: string | null;
  deal_id?: string | null;
  support_ticket_id?: string | null;
};

function dateOffset(days: number) {
  return offsetLocalDateString(days);
}

function hasOpenTask(tasks: CrmRecord[], predicate: (task: CrmRecord) => boolean) {
  return tasks.some((task) => isOpenTask(task) && predicate(task));
}

function recordId(value: unknown) {
  return relationIdValue(value) ?? String(value ?? "");
}

export function buildAlerts(snapshot: DashboardSnapshot): CrmAlert[] {
  const alerts: CrmAlert[] = [];
  const pushAlert = (alert: CrmAlert) => {
    if (alert.taskTitle && hasOpenAutomationTask(snapshot.tasks, alert.key)) return;
    alerts.push(alert);
  };

  snapshot.leads
    .filter((lead) => hasAnyValue(lead.status, ["未設定", "新規", "新規（広告経由）", "新規（広告以外）", "未接触"]))
    .forEach((lead) => {
      const leadId = recordId(lead.id);
      const hasContact = snapshot.activities.some((activity) => relationIdMatches(activity.lead_id, leadId));
      if (!hasContact) {
        pushAlert({
          key: `lead-first-call-${leadId}`,
          severity: "warning",
          title: "未接触リードがあります",
          description: `${lead.company_name ?? lead.name} は新規登録後まだ活動履歴がありません。`,
          taskTitle: "初回架電",
          dueDate: dateOffset(0),
          priority: "高",
          lead_id: leadId,
        });
      }
    });

  snapshot.deals
    .filter((deal) => hasValue(deal.stage, "デモ実施"))
    .forEach((deal) => {
      pushAlert({
        key: `demo-follow-up-${deal.id}`,
        severity: "info",
        title: "デモ後フォローが必要です",
        description: `${deal.name} はデモ実施済みです。翌日フォローを設定してください。`,
        taskTitle: "デモ後フォロー",
        dueDate: dateOffset(1),
        priority: "中",
        deal_id: recordId(deal.id),
        company_id: relationIdValue(deal.company_id),
      });
    });

  snapshot.trials.forEach((trial) => {
    const started = toDate(trial.start_date);
    const noLogin = !trial.first_login_at && started && Date.now() - started.getTime() > 3 * 86_400_000;
    if (noLogin) {
      pushAlert({
        key: `trial-no-login-${trial.id}`,
        severity: "danger",
        title: "トライアル開始後3日ログインなし",
        description: "初回ログイン支援が必要です。",
        taskTitle: "トライアル初回ログイン支援",
        dueDate: dateOffset(0),
        priority: "緊急",
        company_id: relationIdValue(trial.company_id),
        deal_id: relationIdValue(trial.deal_id),
      });
    }

    const days = daysUntil(trial.end_date);
    if (days !== null && days >= 0 && days <= 3) {
      pushAlert({
        key: `trial-contract-check-${trial.id}`,
        severity: "warning",
        title: "トライアル終了3日前です",
        description: "契約確認タスクを作成してください。",
        taskTitle: "契約確認",
        dueDate: dateOffset(0),
        priority: "高",
        company_id: relationIdValue(trial.company_id),
        deal_id: relationIdValue(trial.deal_id),
      });
    }
  });

  snapshot.deals
    .filter((deal) => toFiniteNumber(deal.expected_mrr) >= 50000)
    .forEach((deal) => {
      const dealId = recordId(deal.id);
      const hasTask = hasOpenTask(snapshot.tasks, (task) => relationIdMatches(task.deal_id, dealId));
      if (!hasTask) {
        pushAlert({
          key: `high-mrr-no-task-${dealId}`,
          severity: "warning",
          title: "高MRR商談に次回タスクがありません",
          description: `${deal.name} は見込みMRRが高いため、次回アクションを明確にしてください。`,
          taskTitle: "高MRR商談フォロー",
          dueDate: dateOffset(1),
          priority: "高",
          deal_id: dealId,
          company_id: relationIdValue(deal.company_id),
        });
      }
    });

  latestUsageRowsByCompany(snapshot.usage).forEach((usage) => {
    const companyId = relationIdValue(usage.company_id);
    if (!companyId) return;

    const lastLogin = toDate(usage.last_login_at);
    if (!lastLogin || Date.now() - lastLogin.getTime() > 30 * 86_400_000) {
      pushAlert({
        key: `no-login-30-${companyId}`,
        severity: "danger",
        title: "30日ログインなし",
        description: "解約リスクが上がっています。利用状況の確認が必要です。",
        taskTitle: "解約リスク確認",
        dueDate: dateOffset(0),
        priority: "緊急",
        company_id: companyId,
      });
    }

    if (toFiniteNumber(usage.documents_created) === 0) {
      pushAlert({
        key: `documents-zero-${companyId}`,
        severity: "warning",
        title: "帳票作成ゼロ",
        description: "初回帳票作成までの活用支援が必要です。",
        taskTitle: "活用支援",
        dueDate: dateOffset(1),
        priority: "高",
        company_id: companyId,
      });
    }
  });

  snapshot.tickets
    .filter((ticket) => !hasAnyValue(ticket.status, ["解決済み", "クローズ"]))
    .forEach((ticket) => {
      const opened = toDate(ticket.opened_at);
      if (opened && Date.now() - opened.getTime() > 48 * 60 * 60 * 1000) {
        pushAlert({
          key: `ticket-over-48h-${ticket.id}`,
          severity: "danger",
          title: "未対応48時間超の問い合わせ",
          description: `${ticket.title} が長時間未解決です。`,
          taskTitle: "優先対応",
          dueDate: dateOffset(0),
          priority: "緊急",
          support_ticket_id: recordId(ticket.id),
          company_id: relationIdValue(ticket.company_id),
        });
      }
    });

  snapshot.contracts.forEach((contract) => {
    const days = daysUntil(contract.renewal_on);
    if (days !== null && days >= 0 && days <= 30) {
      pushAlert({
        key: `renewal-30-${contract.id}`,
        severity: "info",
        title: "更新30日前の契約があります",
        description: "更新確認と利用状況レビューを行ってください。",
        taskTitle: "更新確認",
        dueDate: dateOffset(3),
        priority: "中",
        company_id: relationIdValue(contract.company_id),
      });
    }
  });

  snapshot.healthScores
    .filter((score) => toFiniteNumber(score.total_score) < 40)
    .forEach((score) => {
      const companyId = relationIdValue(score.company_id);
      if (!companyId) return;

      pushAlert({
        key: `health-under-40-${companyId}`,
        severity: "danger",
        title: "ヘルススコア40未満",
        description: "CS面談タスクを作成してください。",
        taskTitle: "CS面談",
        dueDate: dateOffset(2),
        priority: "緊急",
        company_id: companyId,
      });
    });

  return alerts;
}

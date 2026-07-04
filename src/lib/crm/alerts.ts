import { daysUntil, toDate, toNumber } from "./format";
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
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function hasOpenTask(tasks: CrmRecord[], predicate: (task: CrmRecord) => boolean) {
  return tasks.some((task) => task.status !== "完了" && !task.deleted_at && predicate(task));
}

export function buildAlerts(snapshot: DashboardSnapshot): CrmAlert[] {
  const alerts: CrmAlert[] = [];

  snapshot.leads
    .filter((lead) => ["未設定", "新規", "新規（広告経由）", "新規（広告以外）", "未接触"].includes(String(lead.status)))
    .forEach((lead) => {
      const hasContact = snapshot.activities.some((activity) => activity.lead_id === lead.id);
      if (!hasContact) {
        alerts.push({
          key: `lead-first-call-${lead.id}`,
          severity: "warning",
          title: "未接触リードがあります",
          description: `${lead.company_name ?? lead.name} は新規登録後まだ活動履歴がありません。`,
          taskTitle: "初回架電",
          dueDate: dateOffset(0),
          priority: "高",
          lead_id: String(lead.id),
        });
      }
    });

  snapshot.deals
    .filter((deal) => deal.stage === "デモ実施")
    .forEach((deal) => {
      alerts.push({
        key: `demo-follow-up-${deal.id}`,
        severity: "info",
        title: "デモ後フォローが必要です",
        description: `${deal.name} はデモ実施済みです。翌日フォローを設定してください。`,
        taskTitle: "デモ後フォロー",
        dueDate: dateOffset(1),
        priority: "中",
        deal_id: String(deal.id),
        company_id: typeof deal.company_id === "string" ? deal.company_id : null,
      });
    });

  snapshot.trials.forEach((trial) => {
    const started = toDate(trial.start_date);
    const noLogin = !trial.first_login_at && started && Date.now() - started.getTime() > 3 * 86_400_000;
    if (noLogin) {
      alerts.push({
        key: `trial-no-login-${trial.id}`,
        severity: "danger",
        title: "トライアル開始後3日ログインなし",
        description: "初回ログイン支援が必要です。",
        taskTitle: "トライアル初回ログイン支援",
        dueDate: dateOffset(0),
        priority: "緊急",
        company_id: typeof trial.company_id === "string" ? trial.company_id : null,
        deal_id: typeof trial.deal_id === "string" ? trial.deal_id : null,
      });
    }

    const days = daysUntil(trial.end_date);
    if (days !== null && days >= 0 && days <= 3) {
      alerts.push({
        key: `trial-contract-check-${trial.id}`,
        severity: "warning",
        title: "トライアル終了3日前です",
        description: "契約確認タスクを作成してください。",
        taskTitle: "契約確認",
        dueDate: dateOffset(0),
        priority: "高",
        company_id: typeof trial.company_id === "string" ? trial.company_id : null,
        deal_id: typeof trial.deal_id === "string" ? trial.deal_id : null,
      });
    }
  });

  snapshot.deals
    .filter((deal) => toNumber(deal.expected_mrr) >= 50000)
    .forEach((deal) => {
      const hasTask = hasOpenTask(snapshot.tasks, (task) => task.deal_id === deal.id);
      if (!hasTask) {
        alerts.push({
          key: `high-mrr-no-task-${deal.id}`,
          severity: "warning",
          title: "高MRR商談に次回タスクがありません",
          description: `${deal.name} は見込みMRRが高いため、次回アクションを明確にしてください。`,
          taskTitle: "高MRR商談フォロー",
          dueDate: dateOffset(1),
          priority: "高",
          deal_id: String(deal.id),
          company_id: typeof deal.company_id === "string" ? deal.company_id : null,
        });
      }
    });

  snapshot.usage.forEach((usage) => {
    const lastLogin = toDate(usage.last_login_at);
    if (!lastLogin || Date.now() - lastLogin.getTime() > 30 * 86_400_000) {
      alerts.push({
        key: `no-login-30-${usage.company_id}`,
        severity: "danger",
        title: "30日ログインなし",
        description: "解約リスクが上がっています。利用状況の確認が必要です。",
        taskTitle: "解約リスク確認",
        dueDate: dateOffset(0),
        priority: "緊急",
        company_id: typeof usage.company_id === "string" ? usage.company_id : null,
      });
    }

    if (toNumber(usage.documents_created) === 0) {
      alerts.push({
        key: `documents-zero-${usage.company_id}`,
        severity: "warning",
        title: "帳票作成ゼロ",
        description: "初回帳票作成までの活用支援が必要です。",
        taskTitle: "活用支援",
        dueDate: dateOffset(1),
        priority: "高",
        company_id: typeof usage.company_id === "string" ? usage.company_id : null,
      });
    }
  });

  snapshot.tickets
    .filter((ticket) => !["解決済み", "クローズ"].includes(String(ticket.status)))
    .forEach((ticket) => {
      const opened = toDate(ticket.opened_at);
      if (opened && Date.now() - opened.getTime() > 48 * 60 * 60 * 1000) {
        alerts.push({
          key: `ticket-over-48h-${ticket.id}`,
          severity: "danger",
          title: "未対応48時間超の問い合わせ",
          description: `${ticket.title} が長時間未解決です。`,
          taskTitle: "優先対応",
          dueDate: dateOffset(0),
          priority: "緊急",
          support_ticket_id: String(ticket.id),
          company_id: typeof ticket.company_id === "string" ? ticket.company_id : null,
        });
      }
    });

  snapshot.contracts.forEach((contract) => {
    const days = daysUntil(contract.renewal_on);
    if (days !== null && days >= 0 && days <= 30) {
      alerts.push({
        key: `renewal-30-${contract.id}`,
        severity: "info",
        title: "更新30日前の契約があります",
        description: "更新確認と利用状況レビューを行ってください。",
        taskTitle: "更新確認",
        dueDate: dateOffset(3),
        priority: "中",
        company_id: typeof contract.company_id === "string" ? contract.company_id : null,
      });
    }
  });

  snapshot.healthScores
    .filter((score) => toNumber(score.total_score) < 40)
    .forEach((score) => {
      alerts.push({
        key: `health-under-40-${score.company_id}`,
        severity: "danger",
        title: "ヘルススコア40未満",
        description: "CS面談タスクを作成してください。",
        taskTitle: "CS面談",
        dueDate: dateOffset(2),
        priority: "緊急",
        company_id: typeof score.company_id === "string" ? score.company_id : null,
      });
    });

  return alerts;
}

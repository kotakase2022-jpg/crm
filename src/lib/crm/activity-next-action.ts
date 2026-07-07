import { priorities, taskStatuses } from "./options";
import { localDateString } from "./format";
import type { CrmRecord } from "./types";

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateOnlyOrToday(value: unknown, fallbackDate: Date) {
  const date = stringOrNull(value);
  return date ?? localDateString(fallbackDate);
}

export function buildNextActionTaskFromActivity(activity: CrmRecord, fallbackDate = new Date()) {
  if (activity.has_next_action !== true) return null;

  const title = stringOrNull(activity.subject) ?? "次回アクション";
  const content = stringOrNull(activity.content);

  return {
    automation_key: `activity-next-action-${activity.id}`,
    title,
    description: content ?? "活動履歴から作成された次回アクションです。",
    status: taskStatuses[0],
    priority: priorities[1],
    due_date: dateOnlyOrToday(activity.next_action_date, fallbackDate),
    lead_id: stringOrNull(activity.lead_id),
    company_id: stringOrNull(activity.company_id),
    contact_id: stringOrNull(activity.contact_id),
    deal_id: stringOrNull(activity.deal_id),
  };
}

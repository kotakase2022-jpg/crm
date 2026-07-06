import type { CrmRecord } from "./types";
import { daysUntil, isSameLocalDate } from "./format";

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "");
}

export function isCompletedTaskStatus(value: unknown) {
  return textValue(value) === "完了";
}

export function isOpenTask(task: CrmRecord) {
  return !isCompletedTaskStatus(task.status) && !task.deleted_at;
}

export function isDueTodayOrOverdueOpenTask(task: CrmRecord) {
  return isOpenTask(task) && (isSameLocalDate(task.due_date) || (daysUntil(task.due_date) ?? 1) < 0);
}

export function hasOpenAutomationTask(tasks: CrmRecord[], key: string) {
  const normalizedKey = textValue(key);
  if (!normalizedKey) return false;

  return tasks.some((task) => textValue(task.automation_key) === normalizedKey && isOpenTask(task));
}

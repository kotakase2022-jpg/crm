import { describe, expect, it } from "vitest";
import { hasOpenAutomationTask, isCompletedTaskStatus, isDueTodayOrOverdueOpenTask, isOpenTask } from "@/lib/crm/automation";
import { localDateString, offsetLocalDateString } from "@/lib/crm/format";

describe("CRM automation task helpers", () => {
  it("normalizes task completion status before UI and automation decisions", () => {
    expect(isCompletedTaskStatus("完了")).toBe(true);
    expect(isCompletedTaskStatus(" 完了 ")).toBe(true);
    expect(isCompletedTaskStatus("未完了")).toBe(false);
    expect(isCompletedTaskStatus(null)).toBe(false);
  });

  it("treats only unfinished and non-deleted tasks as open work", () => {
    expect(isOpenTask({ id: "open", status: "未完了" })).toBe(true);
    expect(isOpenTask({ id: "done", status: "完了" })).toBe(false);
    expect(isOpenTask({ id: "done-with-whitespace", status: " 完了 " })).toBe(false);
    expect(isOpenTask({ id: "deleted", status: "未完了", deleted_at: "2026-07-05T00:00:00.000Z" })).toBe(false);
  });

  it("keeps dashboard task action lists limited to open work due today or overdue", () => {
    const today = localDateString();
    const yesterday = offsetLocalDateString(-1);
    const tomorrow = offsetLocalDateString(1);

    expect(isDueTodayOrOverdueOpenTask({ id: "today-open", status: " 未完了 ", due_date: today })).toBe(true);
    expect(isDueTodayOrOverdueOpenTask({ id: "today-open-datetime", status: "未完了", due_date: `${today}T09:00` })).toBe(true);
    expect(isDueTodayOrOverdueOpenTask({ id: "overdue-open", status: "未完了", due_date: yesterday })).toBe(true);
    expect(isDueTodayOrOverdueOpenTask({ id: "today-done", status: " 完了 ", due_date: today })).toBe(false);
    expect(isDueTodayOrOverdueOpenTask({ id: "overdue-done", status: "完了", due_date: yesterday })).toBe(false);
    expect(isDueTodayOrOverdueOpenTask({ id: "future-open", status: "未完了", due_date: tomorrow })).toBe(false);
    expect(isDueTodayOrOverdueOpenTask({ id: "deleted-open", status: "未完了", due_date: today, deleted_at: today })).toBe(false);
  });

  it("blocks duplicate automation only while the matching generated task is still open", () => {
    const tasks = [
      { id: "open", automation_key: " risk-company-1 ", status: "未完了" },
      { id: "done", automation_key: "risk-company-2", status: "完了" },
      { id: "done-with-whitespace", automation_key: "risk-company-4", status: " 完了 " },
      { id: "blank-key", automation_key: "   ", status: "未完了" },
      { id: "deleted", automation_key: "risk-company-3", status: "未完了", deleted_at: "2026-07-05T00:00:00.000Z" },
    ];

    expect(hasOpenAutomationTask(tasks, "risk-company-1")).toBe(true);
    expect(hasOpenAutomationTask(tasks, "risk-company-2")).toBe(false);
    expect(hasOpenAutomationTask(tasks, "risk-company-3")).toBe(false);
    expect(hasOpenAutomationTask(tasks, "risk-company-4")).toBe(false);
    expect(hasOpenAutomationTask(tasks, "   ")).toBe(false);
  });
});

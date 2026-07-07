import { afterEach, describe, expect, it, vi } from "vitest";
import { entityConfigs } from "@/lib/crm/entities";
import { localDateString, offsetLocalDateString } from "@/lib/crm/format";
import { priorities, taskStatuses } from "@/lib/crm/options";
import {
  defaultSortDirection,
  filterSortRows,
  listSortHref,
  matchesFilter,
  matchesRelationFilter,
  matchesSearch,
  nextSortDirection,
  normalizeRelationQuery,
  normalizedSort,
} from "@/lib/crm/search";

afterEach(() => {
  vi.useRealTimers();
});

describe("CRM list search", () => {
  const taskRows = [
    {
      id: "task-1",
      title: "契約確認",
      status: "未完了",
      priority: "高",
      due_date: "2026-07-10",
      company_id: "company-1",
      deal_id: "deal-1",
    },
    {
      id: "task-2",
      title: "請求確認",
      status: "未完了",
      priority: "中",
      due_date: "2026-07-11",
      company_id: "company-2",
      deal_id: "deal-2",
    },
  ];

  const dealRowsWithRelations = [
    {
      id: "deal-with-lead-contact",
      name: "Estimate workflow rollout",
      stage: "Demo",
      company_id: "company-1",
      lead_id: "lead-1",
      contact_id: "contact-1",
    },
    {
      id: "other-deal",
      name: "Invoice workflow rollout",
      stage: "Trial",
      company_id: "company-2",
      lead_id: "lead-2",
      contact_id: "contact-2",
    },
  ];

  const relations = {
    contacts: [
      { value: "contact-1", label: "佐藤 経理" },
      { value: "contact-2", label: "田中 現場責任者" },
    ],
    companies: [
      { value: "company-1", label: "青空工務店" },
      { value: "company-2", label: "山川リフォーム" },
    ],
    deals: [
      { value: "deal-1", label: "青空工務店 帳票管理導入" },
      { value: "deal-2", label: "山川リフォーム 請求改善" },
    ],
    leads: [
      { value: "lead-1", label: "春日リフォーム 問い合わせ" },
      { value: "lead-2", label: "青葉建設 展示会" },
    ],
  };

  it("matches visible related company labels on task lists", () => {
    expect(matchesSearch(taskRows[0], entityConfigs.tasks, "青空", relations)).toBe(true);
    expect(matchesSearch(taskRows[1], entityConfigs.tasks, "青空", relations)).toBe(false);
  });

  it("matches visible related contact labels on task lists", () => {
    const contactTaskRows = [
      { id: "contact-task", title: "契約前確認", status: "未完了", contact_id: "contact-1" },
      { id: "other-contact-task", title: "請求確認", status: "未完了", contact_id: "contact-2" },
    ];

    expect(matchesSearch(contactTaskRows[0], entityConfigs.tasks, "佐藤", relations)).toBe(true);
    expect(filterSortRows(contactTaskRows, entityConfigs.tasks, { q: "佐藤" }, relations).map((row) => row.id)).toEqual(["contact-task"]);
  });

  it("filters and sorts by related labels without losing normal field search", () => {
    expect(filterSortRows(taskRows, entityConfigs.tasks, { q: "山川" }, relations).map((row) => row.id)).toEqual(["task-2"]);
    expect(filterSortRows(taskRows, entityConfigs.tasks, { q: "契約" }, relations).map((row) => row.id)).toEqual(["task-1"]);
  });

  it("matches visible lead and contact labels on deal lists", () => {
    expect(matchesSearch(dealRowsWithRelations[0], entityConfigs.deals, "春日", relations)).toBe(true);
    expect(matchesSearch(dealRowsWithRelations[0], entityConfigs.deals, "佐藤", relations)).toBe(true);
    expect(filterSortRows(dealRowsWithRelations, entityConfigs.deals, { q: "佐藤" }, relations).map((row) => row.id)).toEqual([
      "deal-with-lead-contact",
    ]);
  });

  it("keeps blank searches from hiding records", () => {
    expect(matchesSearch(taskRows[0], entityConfigs.tasks, "   ", relations)).toBe(true);
  });

  it("keeps task today and overdue views precise", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"));

    const todayDate = localDateString();
    const yesterday = offsetLocalDateString(-1);

    const rows = [
      { id: "today", title: "今日対応", status: "未完了", due_date: todayDate },
      { id: "today-with-time", title: "今日対応（時刻あり）", status: "未完了", due_date: `${todayDate}T09:00` },
      { id: "done-today", title: "完了済み", status: "完了", due_date: todayDate },
      { id: "overdue", title: "期限切れ", status: "未完了", due_date: yesterday },
    ];

    expect(rows.filter((row) => matchesFilter(row, entityConfigs.tasks, undefined, "today")).map((row) => row.id)).toEqual(["today", "today-with-time"]);
    expect(rows.filter((row) => matchesFilter(row, entityConfigs.tasks, undefined, "overdue")).map((row) => row.id)).toEqual(["overdue"]);

    vi.useRealTimers();
  });

  it("normalizes filter values and task completion status for actionable quick views", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"));

    const todayDate = localDateString();
    const yesterday = offsetLocalDateString(-1);
    const rows = [
      { id: "today-open", title: "今日対応", status: " 未完了 ", due_date: todayDate },
      { id: "today-done", title: "完了済み", status: " 完了 ", due_date: todayDate },
      { id: "overdue-open", title: "期限切れ", status: " 未完了 ", due_date: yesterday },
      { id: "overdue-done", title: "期限切れ完了", status: " 完了 ", due_date: yesterday },
    ];

    expect(rows.filter((row) => matchesFilter(row, entityConfigs.tasks, "未完了")).map((row) => row.id)).toEqual([
      "today-open",
      "overdue-open",
    ]);
    expect(rows.filter((row) => matchesFilter(row, entityConfigs.tasks, undefined, "today")).map((row) => row.id)).toEqual(["today-open"]);
    expect(rows.filter((row) => matchesFilter(row, entityConfigs.tasks, undefined, "overdue")).map((row) => row.id)).toEqual(["overdue-open"]);

    vi.useRealTimers();
  });

  it("keeps task today view on the local calendar day near midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 5, 0, 30));

    expect(
      matchesFilter({ id: "local-today", title: "Local Today", status: taskStatuses[0], due_date: "2026-07-05" }, entityConfigs.tasks, undefined, "today"),
    ).toBe(true);

    vi.useRealTimers();
  });

  it("sorts numeric deal values in the requested direction", () => {
    const dealRows = [
      { id: "low", name: "低MRR", expected_mrr: 10000, stage: "初回接触" },
      { id: "high", name: "高MRR", expected_mrr: 90000, stage: "初回接触" },
    ];

    expect(filterSortRows(dealRows, entityConfigs.deals, { sort: "expected_mrr", direction: "asc" }).map((row) => row.id)).toEqual([
      "low",
      "high",
    ]);
    expect(filterSortRows(dealRows, entityConfigs.deals, { sort: "expected_mrr", direction: "desc" }).map((row) => row.id)).toEqual([
      "high",
      "low",
    ]);
  });

  it("sorts numeric-looking strings numerically and leaves invalid values last", () => {
    const dealRows = [
      { id: "invalid", name: "Invalid MRR", expected_mrr: "not-a-number", stage: "Trial" },
      { id: "small", name: "Small MRR", expected_mrr: "9000", stage: "Trial" },
      { id: "large", name: "Large MRR", expected_mrr: "100000", stage: "Trial" },
    ];

    expect(filterSortRows(dealRows, entityConfigs.deals, { sort: "expected_mrr", direction: "asc" }).map((row) => row.id)).toEqual([
      "small",
      "large",
      "invalid",
    ]);
    expect(filterSortRows(dealRows, entityConfigs.deals, { sort: "expected_mrr", direction: "desc" }).map((row) => row.id)).toEqual([
      "large",
      "small",
      "invalid",
    ]);
  });

  it("sorts priorities by CRM urgency instead of locale string order", () => {
    const rows = [
      { id: "medium", title: "Medium", status: "未完了", priority: priorities[1] },
      { id: "low", title: "Low", status: "未完了", priority: priorities[0] },
      { id: "urgent", title: "Urgent", status: "未完了", priority: priorities[3] },
      { id: "high", title: "High", status: "未完了", priority: priorities[2] },
    ];

    expect(filterSortRows(rows, entityConfigs.tasks, { sort: "priority", direction: "desc" }).map((row) => row.id)).toEqual([
      "urgent",
      "high",
      "medium",
      "low",
    ]);
    expect(filterSortRows(rows, entityConfigs.tasks, { sort: "priority", direction: "asc" }).map((row) => row.id)).toEqual([
      "low",
      "medium",
      "high",
      "urgent",
    ]);
  });

  it("normalizes priority values before sorting actionable lists", () => {
    const rows = [
      { id: "low", title: "Low", status: taskStatuses[0], priority: ` ${priorities[0]} ` },
      { id: "urgent", title: "Urgent", status: taskStatuses[0], priority: ` ${priorities[3]} ` },
      { id: "medium", title: "Medium", status: taskStatuses[0], priority: priorities[1] },
      { id: "high", title: "High", status: taskStatuses[0], priority: ` ${priorities[2]} ` },
    ];

    expect(filterSortRows(rows, entityConfigs.tasks, { sort: "priority", direction: "desc" }).map((row) => row.id)).toEqual([
      "urgent",
      "high",
      "medium",
      "low",
    ]);
  });

  it("keeps unknown priority values after real CRM priorities", () => {
    const rows = [
      { id: "unknown", title: "Unknown", status: "未完了", priority: "至急" },
      { id: "high", title: "High", status: "未完了", priority: priorities[2] },
      { id: "urgent", title: "Urgent", status: "未完了", priority: priorities[3] },
      { id: "low", title: "Low", status: "未完了", priority: priorities[0] },
    ];

    expect(filterSortRows(rows, entityConfigs.tasks, { sort: "priority", direction: "desc" }).map((row) => row.id)).toEqual([
      "urgent",
      "high",
      "low",
      "unknown",
    ]);
    expect(filterSortRows(rows, entityConfigs.tasks, { sort: "priority", direction: "asc" }).map((row) => row.id)).toEqual([
      "low",
      "high",
      "urgent",
      "unknown",
    ]);
  });

  it("defaults actionable date sorting to the next item users should handle", () => {
    const rows = [
      { id: "future", title: "Future", status: taskStatuses[0], due_date: "2026-07-20" },
      { id: "unscheduled", title: "Unscheduled", status: taskStatuses[0], due_date: null },
      { id: "soon", title: "Soon", status: taskStatuses[0], due_date: "2026-07-06" },
      { id: "today", title: "Today", status: taskStatuses[0], due_date: "2026-07-05" },
    ];

    expect(defaultSortDirection(entityConfigs.tasks)).toBe("asc");
    expect(filterSortRows(rows, entityConfigs.tasks, {}).map((row) => row.id)).toEqual(["today", "soon", "future", "unscheduled"]);
    expect(filterSortRows(rows, entityConfigs.tasks, { direction: "desc" }).map((row) => row.id)).toEqual([
      "future",
      "soon",
      "today",
      "unscheduled",
    ]);
  });

  it("normalizes string sort values so imported whitespace does not change list order", () => {
    const rows = [
      { id: "b", name: " 青空工務店", industry: "工務店" },
      { id: "a", name: "春日リフォーム", industry: "リフォーム" },
      { id: "empty", name: "   ", industry: "その他" },
    ];

    expect(filterSortRows(rows, entityConfigs.companies, { sort: "name", direction: "asc" }).map((row) => row.id)).toEqual(["b", "a", "empty"]);
    expect(filterSortRows(rows, entityConfigs.companies, { sort: "name", direction: "desc" }).map((row) => row.id)).toEqual(["a", "b", "empty"]);
  });

  it("keeps malformed date sort values after valid actionable dates", () => {
    const rows = [
      { id: "invalid", title: "Invalid date", status: taskStatuses[0], due_date: "2026-02-31" },
      { id: "future", title: "Future", status: taskStatuses[0], due_date: "2026-07-20" },
      { id: "today", title: "Today", status: taskStatuses[0], due_date: "2026-07-05" },
    ];

    expect(filterSortRows(rows, entityConfigs.tasks, { sort: "due_date", direction: "asc" }).map((row) => row.id)).toEqual([
      "today",
      "future",
      "invalid",
    ]);
    expect(filterSortRows(rows, entityConfigs.tasks, { sort: "due_date", direction: "desc" }).map((row) => row.id)).toEqual([
      "future",
      "today",
      "invalid",
    ]);
  });

  it("builds list header sort links without dropping the user's current context", () => {
    expect(
      listSortHref(
        entityConfigs.tasks,
        {
          q: "契約",
          filter: taskStatuses[0],
          view: "today",
          sort: "due_date",
          direction: "asc",
          relationField: "company_id",
          relationId: "company-1",
        },
        "priority",
      ),
    ).toBe(
      `/tasks?q=${encodeURIComponent("契約")}&filter=${encodeURIComponent(taskStatuses[0])}&view=today&relation_field=company_id&relation_id=company-1&sort=priority&direction=desc`,
    );

    expect(nextSortDirection(entityConfigs.deals, { sort: "expected_mrr", direction: "desc" }, "expected_mrr")).toBe("asc");
    expect(nextSortDirection(entityConfigs.deals, { sort: "expected_contract_date", direction: "asc" }, "expected_mrr")).toBe("desc");
  });

  it("filters related list drilldowns by exact relation ids instead of parent names", () => {
    const rows = [
      { id: "contact-1", name: "佐藤", company_id: "company-1" },
      { id: "contact-2", name: "佐藤", company_id: "company-2" },
      { id: "contact-3", name: "山田", company_id: " company-1 " },
    ];

    expect(rows.filter((row) => matchesRelationFilter(row, { relationField: "company_id", relationId: "company-1" })).map((row) => row.id)).toEqual([
      "contact-1",
      "contact-3",
    ]);
    expect(filterSortRows(rows, entityConfigs.contacts, { relationField: "company_id", relationId: "company-1" }).map((row) => row.id)).toEqual([
      "contact-1",
      "contact-3",
    ]);
    expect(matchesRelationFilter(rows[0], { relationField: "name", relationId: "佐藤" })).toBe(true);
  });

  it("ignores malformed relation filters so broken URLs do not hide real records", () => {
    const rows = [
      { id: "contact-1", name: "佐藤", company_id: "company-1" },
      { id: "contact-2", name: "田中", company_id: "company-2" },
    ];

    expect(normalizeRelationQuery(entityConfigs.contacts, { relationField: "made_up_id", relationId: "company-1" })).toEqual({
      relationField: undefined,
      relationId: undefined,
    });
    expect(normalizeRelationQuery(entityConfigs.contacts, { relationField: " company_id ", relationId: " company-1 " })).toEqual({
      relationField: "company_id",
      relationId: "company-1",
    });
    expect(filterSortRows(rows, entityConfigs.contacts, { relationField: "made_up_id", relationId: "company-1" }).map((row) => row.id)).toEqual([
      "contact-1",
      "contact-2",
    ]);
  });

  it("shares invalid sort normalization between list rendering and data ordering", () => {
    expect(normalizedSort(entityConfigs.tasks, "not-a-real-sort")).toBe(entityConfigs.tasks.sortFields[0]);
    expect(normalizedSort(entityConfigs.tasks, "priority")).toBe("priority");
  });
});

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { Badge, toneForValue } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import type { CrmRecord, EntityConfig, QueryState, RelationOptions } from "@/lib/crm/types";
import { formatValue } from "@/lib/crm/format";
import { relationHrefForField } from "@/lib/crm/related";
import { defaultSortDirection, listSortHref } from "@/lib/crm/search";

function fieldLabel(config: EntityConfig, field: string) {
  return config.fields.find((item) => item.name === field)?.label ?? labelFallback[field] ?? field;
}

const labelFallback: Record<string, string> = {
  expected_arr: "年額見込みARR",
  arr: "ARR",
  mrr: "MRR",
  created_at: "作成日",
  updated_at: "更新日",
  company_id: "会社",
  contact_id: "担当者",
  lead_id: "リード",
  deal_id: "商談",
  support_ticket_id: "チケット",
  opened_at: "受付日時",
};

export function filterOptions(config: EntityConfig, rows: CrmRecord[]) {
  if (!config.filterField) return [];
  const fieldConfig = config.fields.find((field) => field.name === config.filterField);
  if (fieldConfig?.options) return [...fieldConfig.options];

  const options = new Set<string>();
  for (const row of rows) {
    const option = String(row[config.filterField] ?? "").trim();
    if (option) options.add(option);
  }

  return Array.from(options);
}

export function EntityFilterBar({
  config,
  rows,
  query,
}: {
  config: EntityConfig;
  rows: CrmRecord[];
  query: QueryState;
}) {
  const options = filterOptions(config, rows);
  const selectedSort = query.sort && config.sortFields.includes(query.sort) ? query.sort : config.sortFields[0] ?? "updated_at";
  const defaultDirection = defaultSortDirection(config, selectedSort);
  const hasActiveQuery =
    Boolean(query.q) ||
    Boolean(query.filter) ||
    Boolean(query.view) ||
    (query.sort && query.sort !== config.sortFields[0]) ||
    (query.direction && query.direction !== defaultDirection);

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_180px_180px_140px_auto]" data-testid="entity-filter-form">
          {query.view ? <input type="hidden" name="view" value={query.view} /> : null}
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <Input name="q" defaultValue={query.q} placeholder={`${config.plural}を検索`} className="pl-9" />
          </label>
          {config.filterField ? (
            <Select name="filter" defaultValue={query.filter ?? ""}>
              <option value="">すべて</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          ) : (
            <span />
          )}
          <Select name="sort" defaultValue={selectedSort}>
            {config.sortFields.map((field) => (
              <option key={field} value={field}>
                {fieldLabel(config, field)}
              </option>
            ))}
          </Select>
          <Select name="direction" defaultValue={query.direction ?? defaultDirection}>
            <option value="desc">降順</option>
            <option value="asc">昇順</option>
          </Select>
          <Button variant="secondary" className="w-full md:w-auto">
            <ArrowUpDown className="h-4 w-4" aria-hidden />
            適用
          </Button>
          {hasActiveQuery ? (
            <Link href={`/${config.slug}`} className={buttonClassName("ghost", "w-full md:w-auto")}>
              条件クリア
            </Link>
          ) : null}
        </form>
        {config.slug === "tasks" ? (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50" href="/tasks?view=today">
              今日のタスク
            </Link>
            <Link className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50" href="/tasks?view=overdue">
              期限切れ
            </Link>
            <Link className="rounded-md border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50" href="/tasks">
              全件
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function EntityTable({
  config,
  rows,
  relations,
  query,
}: {
  config: EntityConfig;
  rows: CrmRecord[];
  relations: RelationOptions;
  query: QueryState;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-48 flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold text-slate-700">該当する{config.plural}がありません</p>
          <p className="mt-1 text-sm text-slate-500">検索条件を変更するか、新規作成してください。</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {config.listFields.map((field) => {
                const sortable = config.sortFields.includes(field);
                const selectedSort = query.sort && config.sortFields.includes(query.sort) ? query.sort : config.sortFields[0] ?? "updated_at";
                const selectedDirection = query.direction ?? defaultSortDirection(config, selectedSort);
                const isActiveSort = selectedSort === field;
                const SortIcon = isActiveSort ? (selectedDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

                return (
                  <th
                    key={field}
                    className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                    aria-sort={isActiveSort ? (selectedDirection === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {sortable ? (
                      <Link
                        href={listSortHref(config, query, field)}
                        prefetch={false}
                        data-testid={`sort-header-${field}`}
                        className="inline-flex items-center gap-1 rounded-sm hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                      >
                        <span>{fieldLabel(config, field)}</span>
                        <SortIcon className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    ) : (
                      fieldLabel(config, field)
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {config.listFields.map((field, index) => {
                  const value = row[field];
                  const isStatus = field === config.statusField || ["priority", "churn_risk", "health_status"].includes(field);
                  const content = formatValue(field, value, relations);
                  const href = relationHrefForField(field, value, relations);
                  return (
                    <td key={field} className="truncate px-4 py-3 align-top text-slate-700">
                      {index === 0 ? (
                        <Link href={`/${config.slug}/${row.id}`} className="font-semibold text-slate-950 hover:text-blue-700">
                          {content}
                        </Link>
                      ) : href ? (
                        <Link href={href} className="font-medium text-blue-700 hover:text-blue-800 hover:underline">
                          {content}
                        </Link>
                      ) : isStatus ? (
                        <Badge tone={toneForValue(value)}>{content}</Badge>
                      ) : (
                        <span>{content}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { fieldLabel };

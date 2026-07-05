import Link from "next/link";
import { ArrowUpDown, Search } from "lucide-react";
import { Badge, toneForValue } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import type { CrmRecord, EntityConfig, QueryState, RelationOptions } from "@/lib/crm/types";
import { formatValue } from "@/lib/crm/format";

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

function filterOptions(config: EntityConfig, rows: CrmRecord[]) {
  if (!config.filterField) return [];
  const fieldConfig = config.fields.find((field) => field.name === config.filterField);
  if (fieldConfig?.options) return [...fieldConfig.options];
  return Array.from(new Set(rows.map((row) => String(row[config.filterField!] ?? "")).filter(Boolean)));
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
  const hasActiveQuery =
    Boolean(query.q) ||
    Boolean(query.filter) ||
    Boolean(query.view) ||
    (query.sort && query.sort !== config.sortFields[0]) ||
    (query.direction && query.direction !== "desc");

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_180px_180px_140px_auto]" data-testid="entity-filter-form">
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
          <Select name="sort" defaultValue={query.sort ?? config.sortFields[0]}>
            {config.sortFields.map((field) => (
              <option key={field} value={field}>
                {fieldLabel(config, field)}
              </option>
            ))}
          </Select>
          <Select name="direction" defaultValue={query.direction ?? "desc"}>
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
}: {
  config: EntityConfig;
  rows: CrmRecord[];
  relations: RelationOptions;
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
              {config.listFields.map((field) => (
                <th key={field} className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  {fieldLabel(config, field)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {config.listFields.map((field, index) => {
                  const value = row[field];
                  const isStatus = field === config.statusField || ["priority", "churn_risk", "health_status"].includes(field);
                  return (
                    <td key={field} className="truncate px-4 py-3 align-top text-slate-700">
                      {index === 0 ? (
                        <Link href={`/${config.slug}/${row.id}`} className="font-semibold text-slate-950 hover:text-blue-700">
                          {formatValue(field, value, relations)}
                        </Link>
                      ) : isStatus ? (
                        <Badge tone={toneForValue(value)}>{formatValue(field, value, relations)}</Badge>
                      ) : (
                        <span>{formatValue(field, value, relations)}</span>
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

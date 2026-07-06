import Link from "next/link";
import { Badge, toneForValue } from "@/components/ui/badge";
import { dealStages } from "@/lib/crm/options";
import { formatCurrency, toFiniteNumber } from "@/lib/crm/format";
import type { CrmRecord, QueryState } from "@/lib/crm/types";

function stageListHref(stage: string, query: QueryState) {
  const params = new URLSearchParams();

  if (query.q) params.set("q", query.q);
  params.set("filter", stage);
  if (query.sort) params.set("sort", query.sort);
  if (query.direction) params.set("direction", query.direction);
  if (query.view) params.set("view", query.view);

  return `/deals?${params.toString()}`;
}

function normalizedStage(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "");
}

export function dealsForStage(deals: CrmRecord[], stage: string) {
  return deals.filter((deal) => normalizedStage(deal.stage) === stage);
}

export function StageBoard({ deals, query }: { deals: CrmRecord[]; query: QueryState }) {
  return (
    <div className="mb-5 overflow-x-auto pb-2" aria-label="商談ステージボード" data-testid="deal-stage-board">
      <div className="grid min-w-[1100px] grid-cols-10 gap-3">
        {dealStages.map((stage) => {
          const stageDeals = dealsForStage(deals, stage);
          const amount = stageDeals.reduce((sum, deal) => sum + toFiniteNumber(deal.expected_mrr), 0);
          const hiddenCount = Math.max(0, stageDeals.length - 4);
          const listHref = stageListHref(stage, query);

          return (
            <section key={stage} className="rounded-lg border border-slate-200 bg-white" data-testid="deal-stage-column">
              <div className="border-b border-slate-100 p-3">
                <Badge tone={toneForValue(stage)}>{stage}</Badge>
                <p className="mt-2 text-xs text-slate-500">
                  {stageDeals.length}件 / {formatCurrency(amount)}
                </p>
              </div>
              <div className="flex min-h-40 flex-col gap-2 p-2">
                {stageDeals.slice(0, 4).map((deal) => (
                  <Link key={deal.id} href={`/deals/${deal.id}`} className="rounded-md border border-slate-100 bg-slate-50 p-2 text-xs hover:border-slate-300">
                    <p className="line-clamp-2 font-semibold text-slate-800">{String(deal.name)}</p>
                    <p className="mt-1 text-slate-500">{formatCurrency(deal.expected_mrr)}</p>
                  </Link>
                ))}
                {hiddenCount > 0 ? (
                  <Link href={listHref} className="rounded-md border border-dashed border-slate-200 px-2 py-2 text-center text-xs font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700">
                    さらに{hiddenCount}件を一覧で確認
                  </Link>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

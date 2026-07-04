import Link from "next/link";
import { Badge, toneForValue } from "@/components/ui/badge";
import { dealStages } from "@/lib/crm/options";
import { formatCurrency } from "@/lib/crm/format";
import type { CrmRecord } from "@/lib/crm/types";

export function StageBoard({ deals }: { deals: CrmRecord[] }) {
  return (
    <div className="mb-5 overflow-x-auto pb-2">
      <div className="grid min-w-[1100px] grid-cols-10 gap-3">
        {dealStages.map((stage) => {
          const stageDeals = deals.filter((deal) => deal.stage === stage);
          const amount = stageDeals.reduce((sum, deal) => sum + Number(deal.expected_mrr ?? 0), 0);

          return (
            <section key={stage} className="rounded-lg border border-slate-200 bg-white">
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
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

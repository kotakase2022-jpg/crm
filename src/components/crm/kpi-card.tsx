import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
            {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-400" aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}

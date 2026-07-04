import { FunnelChart, StageAmountChart } from "@/components/crm/dashboard-charts";
import { KpiCard } from "@/components/crm/kpi-card";
import { PageHeader } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { buildCsDashboard, buildFunnel, buildSalesDashboard } from "@/lib/crm/analytics";
import { getSnapshot } from "@/lib/crm/data";
import { formatCurrency } from "@/lib/crm/format";

export const dynamic = "force-dynamic";

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default async function ReportsPage() {
  const snapshot = await getSnapshot();
  const sales = buildSalesDashboard(snapshot);
  const cs = buildCsDashboard(snapshot);
  const funnel = buildFunnel(snapshot);

  return (
    <>
      <PageHeader title="レポート" description="営業KPI、CS KPI、ファネル、失注理由をまとめて確認します。" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="デモ設定数" value={sales.kpis.demoScheduled} />
        <KpiCard label="デモ実施数" value={sales.kpis.demoDone} />
        <KpiCard label="平均商談日数" value={`${sales.kpis.averageDealDays}日`} />
        <KpiCard label="ARR増加額" value={formatCurrency(sales.kpis.arrIncrease)} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-950">商談ステージ別件数・金額</h3>
          </CardHeader>
          <CardContent>
            <StageAmountChart data={sales.stageCounts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-950">ファネルレポート</h3>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnel} />
          </CardContent>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-950">CS KPI</h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniMetric label="帳票作成数" value={cs.kpis.documentsCreated} />
              <MiniMetric label="更新予定社数" value={cs.kpis.renewalSoon} />
              <MiniMetric label="解約予定社数" value={cs.kpis.churnScheduled} />
              <MiniMetric label="未対応問い合わせ" value={cs.kpis.unresolvedTickets} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-950">失注理由別件数</h3>
          </CardHeader>
          <CardContent className="grid gap-2">
            {Object.entries(sales.lostReasonCounts).map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{reason || "未設定"}</span>
                <span className="font-semibold text-slate-950">{count}件</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

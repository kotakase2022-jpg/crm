import Link from "next/link";
import { AlertTriangle, Bot, CalendarClock } from "lucide-react";
import { FunnelChart, RiskPieChart, StageAmountChart } from "@/components/crm/dashboard-charts";
import { KpiCard } from "@/components/crm/kpi-card";
import { PageHeader } from "@/components/crm/page-header";
import { Badge, toneForValue } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { runAutomationAction } from "@/lib/crm/actions";
import { buildAlerts } from "@/lib/crm/alerts";
import { buildCsDashboard, buildFunnel, buildSalesDashboard } from "@/lib/crm/analytics";
import { getRelationOptions, getSnapshot } from "@/lib/crm/data";
import { daysUntil, formatCurrency, formatDate, formatValue, toNumber } from "@/lib/crm/format";

export const dynamic = "force-dynamic";

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const [snapshot, relations] = await Promise.all([getSnapshot(), getRelationOptions()]);
  const sales = buildSalesDashboard(snapshot);
  const cs = buildCsDashboard(snapshot);
  const funnel = buildFunnel(snapshot);
  const alerts = buildAlerts(snapshot);
  const today = new Date().toISOString().slice(0, 10);
  const todaysTasks = snapshot.tasks
    .filter((task) => task.status !== "完了" && (task.due_date === today || (daysUntil(task.due_date) ?? 1) < 0))
    .slice(0, 8);
  const riskyCompanies = snapshot.healthScores
    .filter((score) => toNumber(score.total_score) < 60)
    .sort((a, b) => toNumber(a.total_score) - toNumber(b.total_score))
    .slice(0, 8);

  return (
    <>
      <PageHeader title="ダッシュボード" description="営業ファネル、今日のタスク、CSリスクを最初に確認します。">
        <form action={runAutomationAction}>
          <Button variant="secondary">
            <Bot className="h-4 w-4" aria-hidden />
            自動タスク生成
          </Button>
        </form>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="新規リード数" value={sales.kpis.newLeads} />
        <KpiCard label="受注数 / 受注率" value={`${sales.kpis.won}件 / ${sales.kpis.winRate}%`} />
        <KpiCard label="MRR増加額" value={formatCurrency(sales.kpis.mrrIncrease)} />
        <KpiCard label="要注意顧客" value={`${cs.kpis.lowHealthCompanies}社`} hint="ヘルススコア60未満" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-950">商談ステージ別金額</h3>
          </CardHeader>
          <CardContent>
            <StageAmountChart data={sales.stageCounts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-950">営業ファネル</h3>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnel} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-slate-500" aria-hidden />
              <h3 className="font-semibold text-slate-950">今日やるべきタスク</h3>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            {todaysTasks.length === 0 ? <p className="text-sm text-slate-500">本日または期限切れの未完了タスクはありません。</p> : null}
            {todaysTasks.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="rounded-md border border-slate-100 bg-slate-50 p-3 hover:border-slate-300">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">{String(task.title)}</p>
                  <Badge tone={toneForValue(task.priority)}>{formatValue("priority", task.priority)}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">期限: {formatDate(task.due_date)}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-slate-500" aria-hidden />
              <h3 className="font-semibold text-slate-950">アラート</h3>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            {alerts.slice(0, 8).map((alert) => (
              <div key={alert.key} className="rounded-md border border-slate-100 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-950">{alert.title}</p>
                  <Badge tone={alert.severity === "danger" ? "red" : alert.severity === "warning" ? "yellow" : "blue"}>{alert.severity}</Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{alert.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-950">CS要注意顧客</h3>
          </CardHeader>
          <CardContent className="grid gap-2">
            {riskyCompanies.map((score) => (
              <Link key={score.id} href={`/companies/${score.company_id}`} className="rounded-md border border-slate-100 bg-slate-50 p-3 hover:border-slate-300">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">{formatValue("company_id", score.company_id, relations)}</p>
                  <Badge tone={toneForValue(score.churn_risk)}>{String(score.churn_risk)}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">ヘルススコア: {String(score.total_score)}点</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-950">CSダッシュボード</h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniMetric label="有料契約社数" value={`${cs.kpis.paidCompanies}社`} />
              <MiniMetric label="アクティブ社数" value={`${cs.kpis.activeCompanies}社`} />
              <MiniMetric label="問い合わせ未対応" value={`${cs.kpis.unresolvedTickets}件`} />
              <MiniMetric label="アップセル候補" value={`${cs.kpis.upsellCandidates}社`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-950">解約リスク分布</h3>
          </CardHeader>
          <CardContent>
            <RiskPieChart data={cs.riskCounts} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

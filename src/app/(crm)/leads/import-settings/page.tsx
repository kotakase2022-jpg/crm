import { RefreshCw, Settings2 } from "lucide-react";
import Link from "next/link";
import { ConfirmSubmitButton, SaveSubmitButton } from "@/components/crm/form-buttons";
import { PageHeader } from "@/components/crm/page-header";
import { Badge, toneForValue } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { runLeadImportSettingAction, saveLeadImportSettingAction } from "@/lib/crm/actions";
import { defaultLeadImportStatus, getLeadImportView } from "@/lib/crm/lead-imports";
import { leadStatuses } from "@/lib/crm/options";
import { formatDateTime, formatValue } from "@/lib/crm/format";

export const dynamic = "force-dynamic";

export default async function LeadImportSettingsPage() {
  const { settings, runs, canManage, mode } = await getLeadImportView();
  const setting = settings[0] ?? null;
  const runAction = setting && canManage ? runLeadImportSettingAction.bind(null, String(setting.id)) : null;

  return (
    <>
      <PageHeader
        title="スプレッドシート取込設定"
        description="広告・外部フォームで集めたリードを、公開CSVまたはGoogleスプレッドシートURLから12時間ごとに取り込みます。"
      >
        <Link href="/leads" className={buttonClassName("secondary")}>
          リード一覧へ
        </Link>
      </PageHeader>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-slate-500" aria-hidden />
              <h3 className="text-base font-semibold text-slate-950">取込元</h3>
            </div>
          </CardHeader>
          <CardContent>
            <form action={saveLeadImportSettingAction} className="grid gap-4">
              <input type="hidden" name="id" value={String(setting?.id ?? "")} />
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  設定名
                </label>
                <Input id="name" name="name" defaultValue={String(setting?.name ?? "広告スプレッドシート")} disabled={!canManage} />
              </div>

              <div>
                <label htmlFor="spreadsheet_url" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  スプレッドシートURL
                  <span className="ml-1 text-rose-600">必須</span>
                </label>
                <Input
                  id="spreadsheet_url"
                  name="spreadsheet_url"
                  type="url"
                  required
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  defaultValue={String(setting?.spreadsheet_url ?? "")}
                  disabled={!canManage}
                />
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Googleスプレッドシートはリンクを知っている全員が閲覧できる状態、またはCSV公開URLを指定してください。
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="default_status" className="mb-1.5 block text-sm font-semibold text-slate-700">
                    取込リードの初期ステータス
                  </label>
                  <Select
                    id="default_status"
                    name="default_status"
                    defaultValue={String(setting?.default_status ?? defaultLeadImportStatus)}
                    disabled={!canManage}
                  >
                    {leadStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </Select>
                </div>

                <label className="mt-7 flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={setting ? setting.enabled !== false : true}
                    disabled={!canManage}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  12時間ごとの自動取込を有効化
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                {canManage ? (
                  <SaveSubmitButton idleLabel="設定を保存" pendingLabel="保存中..." />
                ) : (
                  <p className="text-sm text-slate-500">この設定を変更する権限がありません。</p>
                )}
              </div>
            </form>
            {runAction ? (
              <form action={runAction} className="mt-3 flex justify-end">
                <ConfirmSubmitButton
                  variant="secondary"
                  confirmMessage="この設定で今すぐスプレッドシートからリードを取り込みます。よろしいですか？"
                  pendingLabel="取込中..."
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  今すぐ取込
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold text-slate-950">状態</h3>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>データ保存先</span>
                <Badge tone={mode === "supabase" ? "green" : "yellow"}>{mode === "supabase" ? "Supabase" : "デモモード"}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>自動取込</span>
                <Badge tone={setting?.enabled === false ? "default" : "blue"}>{setting?.enabled === false ? "無効" : "有効"}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>最終取込</span>
                <span className="text-right">{formatDateTime(setting?.last_imported_at)}</span>
              </div>
              {setting?.last_run_status ? (
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="mb-1">
                    <Badge tone={toneForValue(setting.last_run_status)}>{String(setting.last_run_status)}</Badge>
                  </div>
                  <p className="leading-5">{String(setting.last_run_message ?? "")}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-base font-semibold text-slate-950">直近の取込履歴</h3>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <p className="text-sm text-slate-500">まだ取込履歴はありません。</p>
              ) : (
                <div className="space-y-3">
                  {runs.map((run) => (
                    <div key={run.id} className="rounded-md border border-slate-200 p-3 text-sm">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <Badge tone={toneForValue(run.status)}>{String(run.status)}</Badge>
                        <span className="text-xs text-slate-500">{formatDateTime(run.started_at)}</span>
                      </div>
                      <p className="text-slate-700">
                        取込 {formatValue("imported_count", run.imported_count)}件 / スキップ {formatValue("skipped_count", run.skipped_count)}件
                      </p>
                      {run.error_message ? <p className="mt-1 text-xs text-rose-600">{String(run.error_message)}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

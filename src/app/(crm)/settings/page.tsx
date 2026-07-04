import { PageHeader } from "@/components/crm/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { roleLabels, roles } from "@/lib/crm/options";

export const dynamic = "force-dynamic";

const permissions = [
  ["admin", "全操作可能"],
  ["sales_manager", "全リード・商談・営業レポート閲覧編集"],
  ["sales", "自分のリード・商談を中心に閲覧編集"],
  ["cs_manager", "全顧客・契約・利用状況・チケット閲覧編集"],
  ["cs", "担当顧客を中心に閲覧編集"],
  ["support", "チケット中心に閲覧編集"],
  ["finance", "契約・請求情報中心に閲覧編集"],
  ["viewer", "閲覧のみ"],
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="設定" description="組織、権限、Supabase/Vercel連携の初期設定を確認します。" />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-950">権限ロール</h3>
          </CardHeader>
          <CardContent className="grid gap-2">
            {permissions.map(([role, description]) => (
              <div key={role} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{roleLabels[role as (typeof roles)[number]]}</p>
                  <p className="text-xs leading-5 text-slate-500">{description}</p>
                </div>
                <Badge tone="slate">{role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-950">環境変数</h3>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm text-slate-700">
              <code className="rounded-md bg-slate-100 px-3 py-2">NEXT_PUBLIC_SUPABASE_URL</code>
              <code className="rounded-md bg-slate-100 px-3 py-2">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
              <code className="rounded-md bg-slate-100 px-3 py-2">NEXT_SERVER_ACTIONS_ENCRYPTION_KEY</code>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              RLSはorganization_id単位で分離します。UI上のロール表示に加えて、最終的なデータ分離はSupabase RLSで担保します。
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

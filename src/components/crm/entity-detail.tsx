import Link from "next/link";
import { CheckCircle2, GitBranchPlus, History, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Badge, toneForValue } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  completeTaskAction,
  convertLeadAction,
  createActivityAction,
  deleteEntityAction,
  reopenTaskAction,
} from "@/lib/crm/actions";
import { activityTypes } from "@/lib/crm/options";
import { formatValue } from "@/lib/crm/format";
import type { CrmRecord, EntityConfig, EntitySlug, RelationOptions } from "@/lib/crm/types";
import type { RelatedSection } from "@/lib/crm/data";
import { fieldLabel } from "./entity-table";

function sectionFields(section: RelatedSection) {
  if (section.entity === "contacts") return ["name", "role", "email", "phone"];
  if (section.entity === "deals") return ["name", "stage", "expected_mrr", "expected_contract_date"];
  if (section.entity === "tasks") return ["title", "status", "priority", "due_date"];
  if (section.entity === "trials") return ["company_id", "start_date", "end_date", "activation_level"];
  if (section.entity === "contracts") return ["plan", "mrr", "status", "renewal_on"];
  if (section.entity === "tickets") return ["title", "type", "priority", "status"];
  if (section.title === "利用状況") return ["period_start", "period_end", "login_count", "documents_created", "active_users_count"];
  if (section.title === "ヘルススコア") return ["measured_on", "total_score", "health_status", "churn_risk", "upsell_candidate"];
  if (section.title === "請求履歴") return ["billing_month", "amount", "status", "due_on"];
  if (section.title === "ステージ履歴") return ["from_stage", "to_stage", "changed_at"];
  return ["type", "subject", "occurred_at", "has_next_action"];
}

function RelatedTable({ section, relations }: { section: RelatedSection; relations: RelationOptions }) {
  const fields = sectionFields(section);

  if (section.rows.length === 0) {
    return <p className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500">関連データはまだありません。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            {fields.map((field) => (
              <th key={field} className="w-40 px-3 py-2 font-semibold">
                {field}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.slice(0, 8).map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0">
              {fields.map((field, index) => {
                const content = formatValue(field, row[field], relations);
                return (
                  <td key={field} className="truncate px-3 py-2 text-slate-700">
                    {index === 0 && section.entity ? (
                      <Link href={`/${section.entity}/${row.id}`} className="font-semibold text-slate-950 hover:text-blue-700">
                        {content}
                      </Link>
                    ) : ["status", "priority", "stage", "health_status", "churn_risk"].includes(field) ? (
                      <Badge tone={toneForValue(row[field])}>{content}</Badge>
                    ) : (
                      content
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivityQuickForm({ entity, id }: { entity: EntitySlug; id: string }) {
  if (!["leads", "companies", "contacts", "deals"].includes(entity)) return null;

  const action = createActivityAction.bind(null, entity, id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" aria-hidden />
          <h3 className="font-semibold text-slate-950">活動履歴を追加</h3>
        </div>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="type">
              種別
            </label>
            <Select id="type" name="type" defaultValue="メモ">
              {activityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="occurred_at">
              実施日時
            </label>
            <Input id="occurred_at" name="occurred_at" type="datetime-local" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="subject">
              件名<span className="ml-1 text-rose-600">必須</span>
            </label>
            <Input id="subject" name="subject" required placeholder="デモ後フォロー、請求確認など" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="content">
              内容
            </label>
            <Textarea id="content" name="content" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="has_next_action" className="h-4 w-4 rounded border-slate-300" />
            次回アクションあり
          </label>
          <Input name="next_action_date" type="date" aria-label="次回アクション日" />
          <div className="md:col-span-2">
            <Button variant="secondary">活動を追加</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function EntityDetail({
  config,
  record,
  relations,
  relatedSections,
}: {
  config: EntityConfig;
  record: CrmRecord;
  relations: RelationOptions;
  relatedSections: RelatedSection[];
}) {
  const deleteAction = deleteEntityAction.bind(null, config.slug, String(record.id));
  const convertAction = convertLeadAction.bind(null, String(record.id));
  const completeAction = completeTaskAction.bind(null, String(record.id));
  const reopenAction = reopenTaskAction.bind(null, String(record.id));

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone={toneForValue(record[config.statusField ?? ""])}>{formatValue(config.statusField ?? "status", record[config.statusField ?? ""])}</Badge>
                <span className="text-xs text-slate-500">ID: {record.id}</span>
              </div>
              <h2 className="text-2xl font-bold tracking-normal text-slate-950">{String(record[config.primaryField] ?? record.id)}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.slug === "leads" && !record.converted_deal_id ? (
                <form action={convertAction}>
                  <Button variant="secondary">
                    <GitBranchPlus className="h-4 w-4" aria-hidden />
                    会社・担当者・商談へ変換
                  </Button>
                </form>
              ) : null}
              {config.slug === "tasks" && record.status !== "完了" ? (
                <form action={completeAction}>
                  <Button variant="secondary">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    完了
                  </Button>
                </form>
              ) : null}
              {config.slug === "tasks" && record.status === "完了" ? (
                <form action={reopenAction}>
                  <Button variant="secondary">
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    未完了に戻す
                  </Button>
                </form>
              ) : null}
              <Link href={`/${config.slug}/${record.id}/edit`} className={buttonClassName("secondary")}>
                <Pencil className="h-4 w-4" aria-hidden />
                編集
              </Link>
              <form action={deleteAction}>
                <Button variant="danger">
                  <Trash2 className="h-4 w-4" aria-hidden />
                  削除
                </Button>
              </form>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {config.detailFields.map((field) => (
              <div key={field} className="rounded-md bg-slate-50 px-3 py-2">
                <dt className="text-xs font-semibold text-slate-500">{fieldLabel(config, field)}</dt>
                <dd className="mt-1 break-words text-sm font-medium text-slate-900">{formatValue(field, record[field], relations)}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <ActivityQuickForm entity={config.slug} id={String(record.id)} />

      <div className="grid gap-5">
        {relatedSections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-950">{section.title}</h3>
                <Badge tone="slate">{section.rows.length}件</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <RelatedTable section={section} relations={relations} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

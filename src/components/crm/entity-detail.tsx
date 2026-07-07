import Link from "next/link";
import { CheckCircle2, GitBranchPlus, History, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Badge, toneForValue } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmSubmitButton } from "@/components/crm/form-buttons";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  completeTaskAction,
  convertLeadAction,
  createActivityAction,
  deleteEntityAction,
  reopenTaskAction,
} from "@/lib/crm/actions";
import { activityTypes } from "@/lib/crm/options";
import { formatValue, recordTitle } from "@/lib/crm/format";
import { relationHrefForField, relationIdValue } from "@/lib/crm/related";
import { isCompletedTaskStatus } from "@/lib/crm/automation";
import type { CrmRecord, EntityConfig, EntitySlug, RelationOptions } from "@/lib/crm/types";
import type { RelatedSection } from "@/lib/crm/data";
import { getEntityConfig } from "@/lib/crm/entities";
import { canWriteTable } from "@/lib/crm/access";
import { fieldLabel } from "./entity-table";

function sectionFields(section: RelatedSection) {
  if (section.entity === "contacts") return ["name", "role", "email", "phone"];
  if (section.entity === "deals") return ["name", "stage", "expected_mrr", "expected_contract_date"];
  if (section.entity === "tasks") return ["title", "status", "priority", "due_date"];
  if (section.entity === "trials") return ["company_id", "start_date", "end_date", "activation_level"];
  if (section.entity === "contracts") return ["plan", "mrr", "status", "renewal_on"];
  if (section.entity === "tickets") return ["title", "type", "priority", "status"];
  if (section.title === "利用状況") return ["subscription_id", "trial_id", "period_start", "period_end", "login_count", "documents_created", "active_users_count"];
  if (section.title === "ヘルススコア") return ["measured_on", "total_score", "health_status", "churn_risk", "upsell_candidate"];
  if (section.title === "請求履歴") return ["subscription_id", "billing_month", "amount", "status", "due_on"];
  if (section.title === "ステージ履歴") return ["from_stage", "to_stage", "changed_at"];
  return ["type", "subject", "occurred_at", "has_next_action"];
}

const relatedFieldLabels: Record<string, string> = {
  type: "種別",
  subject: "件名",
  content: "内容",
  occurred_at: "実施日時",
  has_next_action: "次回アクション",
  next_action_date: "次回アクション日",
  period_start: "期間開始",
  period_end: "期間終了",
  login_count: "ログイン回数",
  documents_created: "帳票作成数",
  active_users_count: "利用ユーザー数",
  subscription_id: "契約",
  trial_id: "トライアル",
  measured_on: "測定日",
  total_score: "ヘルススコア",
  health_status: "状態",
  churn_risk: "解約リスク",
  upsell_candidate: "アップセル候補",
  billing_month: "請求月",
  amount: "金額",
  status: "ステータス",
  due_on: "支払期限",
  from_stage: "変更前",
  to_stage: "変更後",
  changed_at: "変更日時",
};

function relatedFieldLabel(section: RelatedSection, field: string) {
  const config = section.entity ? getEntityConfig(section.entity) : null;
  if (config) return fieldLabel(config, field);
  return relatedFieldLabels[field] ?? field;
}

function stringValue(record: CrmRecord, field: string) {
  const value = record[field];
  return typeof value === "string" && value ? value : null;
}

function relatedCreateHref(parentEntity: EntitySlug, record: CrmRecord, childEntity: EntitySlug) {
  const params = new URLSearchParams();
  const parentId = String(record.id);

  if (parentEntity === "companies") {
    params.set("company_id", parentId);
  }

  if (parentEntity === "contacts") {
    params.set("contact_id", parentId);
    const companyId = stringValue(record, "company_id");
    if (companyId) params.set("company_id", companyId);
  }

  if (parentEntity === "leads" && ["deals", "tasks"].includes(childEntity)) {
    params.set("lead_id", parentId);
  }

  if (parentEntity === "deals" && ["tasks", "trials"].includes(childEntity)) {
    params.set("deal_id", parentId);
    const companyId = stringValue(record, "company_id");
    const contactId = stringValue(record, "contact_id");
    if (companyId) params.set("company_id", companyId);
    if (childEntity === "tasks" && contactId) params.set("contact_id", contactId);
  }

  if (parentEntity === "tickets" && childEntity === "tasks") {
    params.set("support_ticket_id", parentId);
    const companyId = stringValue(record, "company_id");
    const contactId = stringValue(record, "contact_id");
    if (companyId) params.set("company_id", companyId);
    if (contactId) params.set("contact_id", contactId);
  }

  return params.size > 0 ? `/${childEntity}/new?${params.toString()}` : `/${childEntity}/new`;
}

function relatedCreateLabel(entity: EntitySlug) {
  return `${getEntityConfig(entity)?.singular ?? "関連データ"}を追加`;
}

const parentRelationFieldByEntity: Partial<Record<EntitySlug, string>> = {
  companies: "company_id",
  contacts: "contact_id",
  deals: "deal_id",
  leads: "lead_id",
  tickets: "support_ticket_id",
};

function relatedListHref(parentEntity: EntitySlug, record: CrmRecord, childEntity: EntitySlug) {
  const params = new URLSearchParams();
  const relationField = parentRelationFieldByEntity[parentEntity];
  const id = relationIdValue(record.id);
  if (relationField && id) {
    params.set("relation_field", relationField);
    params.set("relation_id", id);
  }
  return params.size > 0 ? `/${childEntity}?${params.toString()}` : `/${childEntity}`;
}

function canCreateRelatedEntity(role: string, entity: EntitySlug) {
  const config = getEntityConfig(entity);
  return config ? canWriteTable(role, config.table) : false;
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
                {relatedFieldLabel(section, field)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.slice(0, 8).map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0">
              {fields.map((field, index) => {
                const content = formatValue(field, row[field], relations);
                const href = relationHrefForField(field, row[field], relations);
                return (
                  <td key={field} className="truncate px-3 py-2 text-slate-700">
                    {index === 0 && section.entity ? (
                      <Link href={`/${section.entity}/${row.id}`} className="font-semibold text-slate-950 hover:text-blue-700">
                        {content}
                      </Link>
                    ) : href ? (
                      <Link href={href} className="font-semibold text-blue-700 hover:text-blue-800 hover:underline">
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

function ActivityQuickForm({ entity, id, canCreate }: { entity: EntitySlug; id: string; canCreate: boolean }) {
  if (!canCreate || !["leads", "companies", "contacts", "deals"].includes(entity)) return null;

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
  role,
}: {
  config: EntityConfig;
  record: CrmRecord;
  relations: RelationOptions;
  relatedSections: RelatedSection[];
  role: string;
}) {
  const deleteAction = deleteEntityAction.bind(null, config.slug, String(record.id));
  const convertAction = convertLeadAction.bind(null, String(record.id));
  const completeAction = completeTaskAction.bind(null, String(record.id));
  const reopenAction = reopenTaskAction.bind(null, String(record.id));
  const canWriteCurrent = canWriteTable(role, config.table);
  const canCreateActivities = canWriteTable(role, "activities");
  const isCompletedTask = config.slug === "tasks" && isCompletedTaskStatus(record.status);

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
              <h2 className="text-2xl font-bold tracking-normal text-slate-950">{recordTitle(record)}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {canWriteCurrent && config.slug === "leads" && !record.converted_deal_id ? (
                <form action={convertAction}>
                  <Button variant="secondary">
                    <GitBranchPlus className="h-4 w-4" aria-hidden />
                    会社・担当者・商談へ変換
                  </Button>
                </form>
              ) : null}
              {canWriteCurrent && config.slug === "tasks" && !isCompletedTask ? (
                <form action={completeAction}>
                  <Button variant="secondary">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    完了
                  </Button>
                </form>
              ) : null}
              {canWriteCurrent && isCompletedTask ? (
                <form action={reopenAction}>
                  <Button variant="secondary">
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    未完了に戻す
                  </Button>
                </form>
              ) : null}
              {canWriteCurrent ? (
                <>
                  <Link href={`/${config.slug}/${record.id}/edit`} className={buttonClassName("secondary")}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    編集
                  </Link>
                  <form action={deleteAction}>
                    <ConfirmSubmitButton confirmMessage={`この${config.singular}を削除しますか？一覧から非表示になります。`}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                      削除
                    </ConfirmSubmitButton>
                  </form>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {config.detailFields.map((field) => {
              const content = formatValue(field, record[field], relations);
              const href = relationHrefForField(field, record[field], relations);

              return (
                <div key={field} className="rounded-md bg-slate-50 px-3 py-2">
                  <dt className="text-xs font-semibold text-slate-500">{fieldLabel(config, field)}</dt>
                  <dd className="mt-1 break-words text-sm font-medium text-slate-900">
                    {href ? (
                      <Link href={href} className="text-blue-700 hover:text-blue-800 hover:underline">
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </CardContent>
      </Card>

      <ActivityQuickForm entity={config.slug} id={String(record.id)} canCreate={canCreateActivities} />

      <div className="grid gap-5">
        {relatedSections.map((section) => {
          const relatedEntity = section.entity;
          const createHref = relatedEntity && canCreateRelatedEntity(role, relatedEntity) ? relatedCreateHref(config.slug, record, relatedEntity) : null;
          const hiddenRowsCount = Math.max(0, section.rows.length - 8);
          const listHref = relatedEntity && hiddenRowsCount > 0 ? relatedListHref(config.slug, record, relatedEntity) : null;

          return (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <h3 className="font-semibold text-slate-950">{section.title}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {relatedEntity && createHref ? (
                      <Link href={createHref} className={buttonClassName("secondary", "h-9 px-3 text-xs")}>
                        <Plus className="h-4 w-4" aria-hidden />
                        {relatedCreateLabel(relatedEntity)}
                      </Link>
                    ) : null}
                    {listHref ? (
                      <Link href={listHref} className={buttonClassName("ghost", "h-9 px-3 text-xs")}>
                        さらに{hiddenRowsCount}件を一覧で確認
                      </Link>
                    ) : null}
                    <Badge tone="slate">{section.rows.length}件</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <RelatedTable section={section} relations={relations} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

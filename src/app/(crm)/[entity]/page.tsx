import { Settings2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { EntityFilterBar, EntityTable } from "@/components/crm/entity-table";
import { PageHeader } from "@/components/crm/page-header";
import { StageBoard } from "@/components/crm/stage-board";
import { canWriteTable } from "@/lib/crm/access";
import { getCrmContext, getRelationOptions, listRecords } from "@/lib/crm/data";
import { getEntityConfig } from "@/lib/crm/entities";
import { normalizeRelationQuery } from "@/lib/crm/search";
import type { QueryState } from "@/lib/crm/types";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function direction(value: string | string[] | undefined) {
  const current = first(value);
  if (current === "asc" || current === "desc") return current;
  return undefined;
}

export default async function EntityListPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { entity } = await params;
  const config = getEntityConfig(entity);
  if (!config) notFound();

  const rawQuery = await searchParams;
  const query: QueryState = normalizeRelationQuery(config, {
    q: first(rawQuery.q),
    filter: first(rawQuery.filter),
    sort: first(rawQuery.sort),
    direction: direction(rawQuery.direction),
    view: first(rawQuery.view),
    relationField: first(rawQuery.relation_field),
    relationId: first(rawQuery.relation_id),
  });
  const [context, rows, allRows, relations] = await Promise.all([getCrmContext(), listRecords(config, query), listRecords(config), getRelationOptions()]);
  const canCreate = canWriteTable(context.role, config.table);

  return (
    <>
      <PageHeader
        title={`${config.plural}一覧`}
        description={config.description}
        actionHref={canCreate ? `/${config.slug}/new` : undefined}
        actionLabel={canCreate ? `${config.singular}作成` : undefined}
      >
        {config.slug === "leads" && canCreate ? (
          <Link href="/leads/import-settings" className={buttonClassName("secondary")}>
            <Settings2 className="h-4 w-4" aria-hidden />
            スプレッドシート取込設定
          </Link>
        ) : null}
      </PageHeader>
      {config.slug === "deals" ? <StageBoard deals={rows} query={query} /> : null}
      <EntityFilterBar config={config} rows={allRows} query={query} />
      <EntityTable config={config} rows={rows} relations={relations} query={query} />
    </>
  );
}

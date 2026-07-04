import { notFound } from "next/navigation";
import { EntityFilterBar, EntityTable } from "@/components/crm/entity-table";
import { PageHeader } from "@/components/crm/page-header";
import { StageBoard } from "@/components/crm/stage-board";
import { canWriteTable } from "@/lib/crm/access";
import { getCrmContext, getRelationOptions, listRecords } from "@/lib/crm/data";
import { getEntityConfig } from "@/lib/crm/entities";
import type { QueryState } from "@/lib/crm/types";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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
  const query: QueryState = {
    q: first(rawQuery.q),
    filter: first(rawQuery.filter),
    sort: first(rawQuery.sort),
    direction: first(rawQuery.direction) === "asc" ? "asc" : "desc",
    view: first(rawQuery.view),
  };
  const [context, rows, allRows, relations] = await Promise.all([getCrmContext(), listRecords(config, query), listRecords(config), getRelationOptions()]);
  const canCreate = canWriteTable(context.role, config.table);

  return (
    <>
      <PageHeader
        title={`${config.plural}一覧`}
        description={config.description}
        actionHref={canCreate ? `/${config.slug}/new` : undefined}
        actionLabel={canCreate ? `${config.singular}作成` : undefined}
      />
      {config.slug === "deals" ? <StageBoard deals={allRows} /> : null}
      <EntityFilterBar config={config} rows={allRows} query={query} />
      <EntityTable config={config} rows={rows} relations={relations} />
    </>
  );
}

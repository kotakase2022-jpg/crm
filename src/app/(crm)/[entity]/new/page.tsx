import { notFound } from "next/navigation";
import { EntityForm } from "@/components/crm/entity-form";
import { PageHeader } from "@/components/crm/page-header";
import { createEntityAction } from "@/lib/crm/actions";
import { getRelationOptions } from "@/lib/crm/data";
import { getEntityConfig } from "@/lib/crm/entities";
import type { CrmRecord, EntityConfig } from "@/lib/crm/types";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function firstParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.find(Boolean) ?? "";
  return value ?? "";
}

function prefillRecordFromSearchParams(config: EntityConfig, searchParams: Awaited<SearchParams>) {
  const record: CrmRecord = { id: "new" };
  let hasPrefill = false;

  for (const field of config.fields) {
    const rawValue = searchParams[field.name];
    if (rawValue === undefined) continue;

    if (field.type === "multiselect") {
      const values = Array.isArray(rawValue) ? rawValue.filter(Boolean) : [rawValue].filter(Boolean);
      if (values.length === 0) continue;
      record[field.name] = values;
      hasPrefill = true;
      continue;
    }

    const value = firstParamValue(rawValue);
    if (!value) continue;
    record[field.name] = value;
    hasPrefill = true;
  }

  return hasPrefill ? record : null;
}

export default async function EntityNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ entity: string }>;
  searchParams: SearchParams;
}) {
  const { entity } = await params;
  const resolvedSearchParams = await searchParams;
  const config = getEntityConfig(entity);
  if (!config) notFound();

  const relations = await getRelationOptions();
  const action = createEntityAction.bind(null, config.slug);
  const prefillRecord = prefillRecordFromSearchParams(config, resolvedSearchParams);

  return (
    <>
      <PageHeader title={`${config.singular}作成`} description="必須項目を入力して保存してください。" />
      <EntityForm config={config} record={prefillRecord} relations={relations} action={action} />
    </>
  );
}

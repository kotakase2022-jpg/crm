import { notFound } from "next/navigation";
import { EntityForm } from "@/components/crm/entity-form";
import { PageHeader } from "@/components/crm/page-header";
import { createEntityAction } from "@/lib/crm/actions";
import { getRelationOptions } from "@/lib/crm/data";
import { getEntityConfig } from "@/lib/crm/entities";

export default async function EntityNewPage({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const config = getEntityConfig(entity);
  if (!config) notFound();

  const relations = await getRelationOptions();
  const action = createEntityAction.bind(null, config.slug);

  return (
    <>
      <PageHeader title={`${config.singular}作成`} description="必須項目を入力して保存してください。" />
      <EntityForm config={config} relations={relations} action={action} />
    </>
  );
}

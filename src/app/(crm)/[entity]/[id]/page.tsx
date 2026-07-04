import { notFound } from "next/navigation";
import { EntityDetail } from "@/components/crm/entity-detail";
import { PageHeader } from "@/components/crm/page-header";
import { getCrmContext, getRecord, getRelatedSections, getRelationOptions } from "@/lib/crm/data";
import { getEntityConfig } from "@/lib/crm/entities";

export default async function EntityDetailPage({ params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params;
  const config = getEntityConfig(entity);
  if (!config) notFound();

  const [context, record, relations, relatedSections] = await Promise.all([
    getCrmContext(),
    getRecord(config, id),
    getRelationOptions(),
    getRelatedSections(config.slug, id),
  ]);

  if (!record) notFound();

  return (
    <>
      <PageHeader title={`${config.singular}詳細`} description={config.description} />
      <EntityDetail config={config} record={record} relations={relations} relatedSections={relatedSections} role={context.role} />
    </>
  );
}

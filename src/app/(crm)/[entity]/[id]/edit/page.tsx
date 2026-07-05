import { notFound } from "next/navigation";
import { EntityForm } from "@/components/crm/entity-form";
import { PageHeader } from "@/components/crm/page-header";
import { PermissionNotice } from "@/components/crm/permission-notice";
import { updateEntityAction } from "@/lib/crm/actions";
import { canWriteTable } from "@/lib/crm/access";
import { getCrmContext, getRecord, getRelationOptions } from "@/lib/crm/data";
import { getEntityConfig } from "@/lib/crm/entities";

export default async function EntityEditPage({ params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params;
  const config = getEntityConfig(entity);
  if (!config) notFound();

  const [context, record, relations] = await Promise.all([getCrmContext(), getRecord(config, id), getRelationOptions()]);
  if (!record) notFound();

  const action = updateEntityAction.bind(null, config.slug, id);
  const canEdit = canWriteTable(context.role, config.table);

  return (
    <>
      <PageHeader title={`${config.singular}編集`} description="変更内容を確認して保存してください。" />
      {canEdit ? <EntityForm config={config} record={record} relations={relations} action={action} /> : <PermissionNotice action="編集" />}
    </>
  );
}

import type { CrmRecord, EntitySlug, RelationKey, RelationOptions } from "./types";

const activityRelationFields = ["lead_id", "company_id", "contact_id", "deal_id"] as const;
const activityParentEntities = ["leads", "companies", "contacts", "deals"] as const;
const relationConsistencyFields = ["lead_id", "company_id", "contact_id", "deal_id", "support_ticket_id", "subscription_id", "trial_id"] as const;
const relationTargetsByField: Partial<Record<string, { entity: EntitySlug; relation: RelationKey }>> = {
  company_id: { entity: "companies", relation: "companies" },
  contact_id: { entity: "contacts", relation: "contacts" },
  lead_id: { entity: "leads", relation: "leads" },
  deal_id: { entity: "deals", relation: "deals" },
  support_ticket_id: { entity: "tickets", relation: "tickets" },
  trial_id: { entity: "trials", relation: "trials" },
  subscription_id: { entity: "contracts", relation: "contracts" },
};

export type ActivityParentEntity = (typeof activityParentEntities)[number];

export function isActivityParentEntity(entity: EntitySlug | string): entity is ActivityParentEntity {
  return activityParentEntities.includes(entity as ActivityParentEntity);
}

export function relationIdValue(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function stringField(record: Record<string, unknown> | null | undefined, field: string) {
  return relationIdValue(record?.[field]);
}

export function relationIdMatches(value: unknown, expected: unknown) {
  const actualId = relationIdValue(value);
  const expectedId = relationIdValue(expected);
  return Boolean(actualId && expectedId && actualId === expectedId);
}

export function relatedRows(rows: CrmRecord[], field: string, id: unknown) {
  return rows.filter((row) => relationIdMatches(row[field], id));
}

export function activityRelationForEntity(entity: ActivityParentEntity, record: CrmRecord | null | undefined) {
  if (!record) return {};

  const id = String(record.id ?? "");
  if (!id) return {};

  if (entity === "companies") {
    return { company_id: id };
  }

  if (entity === "contacts") {
    return {
      contact_id: id,
      company_id: stringField(record, "company_id"),
    };
  }

  if (entity === "deals") {
    return {
      deal_id: id,
      company_id: stringField(record, "company_id"),
      contact_id: stringField(record, "contact_id"),
      lead_id: stringField(record, "lead_id"),
    };
  }

  if (entity === "leads") {
    return { lead_id: id };
  }

  return {};
}

export function relatedActivitiesForTask(task: CrmRecord | null | undefined, activities: CrmRecord[]) {
  if (!task) return [];

  return activities.filter((activity) =>
    activityRelationFields.some((field) => {
      const taskValue = task[field];
      return relationIdMatches(activity[field], taskValue);
    }),
  );
}

export function relationHrefForField(field: string, value: unknown, relations: RelationOptions) {
  const target = relationTargetsByField[field];
  const id = stringField({ value }, "value");
  if (!target || !id) return null;

  const exists = relations[target.relation]?.some((option) => option.value === id);
  return exists ? `/${target.entity}/${id}` : null;
}

export function hasRelationConsistencyValue(values: Record<string, unknown>) {
  return relationConsistencyFields.some((field) => stringField(values, field));
}

export function touchesRelationConsistencyField(values: Record<string, unknown>) {
  return relationConsistencyFields.some((field) => Object.prototype.hasOwnProperty.call(values, field));
}

export function mergeRelationConsistencyValues(current: CrmRecord | null | undefined, values: Record<string, unknown>) {
  return touchesRelationConsistencyField(values) ? { ...(current ?? {}), ...values } : values;
}

function shouldCompleteRelationField(
  field: string,
  sourceField: string,
  values: Record<string, unknown>,
  explicitValues: Record<string, unknown>,
  allowedFields: Set<string> | null,
) {
  if (allowedFields && !allowedFields.has(field)) return false;
  if (stringField(explicitValues, field)) return false;
  return Object.prototype.hasOwnProperty.call(explicitValues, sourceField) || !stringField(values, field);
}

function completeRelationField(
  values: Record<string, unknown>,
  explicitValues: Record<string, unknown>,
  allowedFields: Set<string> | null,
  completedFields: Set<string>,
  targetField: string,
  sourceField: string,
  sourceValue: string | null,
) {
  if (completedFields.has(targetField)) return;

  if (sourceValue && shouldCompleteRelationField(targetField, sourceField, values, explicitValues, allowedFields)) {
    values[targetField] = sourceValue;
    completedFields.add(targetField);
  }
}

export function completeRelationValues(
  values: Record<string, unknown>,
  related: {
    contact?: CrmRecord | null;
    deal?: CrmRecord | null;
    ticket?: CrmRecord | null;
    subscription?: CrmRecord | null;
    trial?: CrmRecord | null;
  },
  options: {
    allowedFields?: readonly string[];
    explicitValues?: Record<string, unknown>;
  } = {},
) {
  const completed = { ...values };
  const explicitValues = options.explicitValues ?? values;
  const allowedFields = options.allowedFields ? new Set(options.allowedFields) : null;
  const completedFields = new Set<string>();

  completeRelationField(completed, explicitValues, allowedFields, completedFields, "company_id", "deal_id", stringField(related.deal, "company_id"));
  completeRelationField(completed, explicitValues, allowedFields, completedFields, "contact_id", "deal_id", stringField(related.deal, "contact_id"));
  completeRelationField(completed, explicitValues, allowedFields, completedFields, "lead_id", "deal_id", stringField(related.deal, "lead_id"));
  completeRelationField(completed, explicitValues, allowedFields, completedFields, "company_id", "support_ticket_id", stringField(related.ticket, "company_id"));
  completeRelationField(completed, explicitValues, allowedFields, completedFields, "contact_id", "support_ticket_id", stringField(related.ticket, "contact_id"));
  completeRelationField(completed, explicitValues, allowedFields, completedFields, "company_id", "contact_id", stringField(related.contact, "company_id"));
  completeRelationField(completed, explicitValues, allowedFields, completedFields, "company_id", "subscription_id", stringField(related.subscription, "company_id"));
  completeRelationField(completed, explicitValues, allowedFields, completedFields, "company_id", "trial_id", stringField(related.trial, "company_id"));

  return completed;
}

export function relationConsistencyErrors(
  values: Record<string, unknown>,
  related: {
    lead?: CrmRecord | null;
    company?: CrmRecord | null;
    contact?: CrmRecord | null;
    deal?: CrmRecord | null;
    ticket?: CrmRecord | null;
    subscription?: CrmRecord | null;
    trial?: CrmRecord | null;
  },
) {
  const errors: string[] = [];
  const leadId = stringField(values, "lead_id");
  const companyId = stringField(values, "company_id");
  const contactId = stringField(values, "contact_id");
  const dealId = stringField(values, "deal_id");
  const ticketId = stringField(values, "support_ticket_id");
  const subscriptionId = stringField(values, "subscription_id");
  const trialId = stringField(values, "trial_id");

  if (leadId && !related.lead) {
    errors.push("選択したリードが見つかりません。最新の一覧から選び直してください。");
  }

  if (companyId && !related.company) {
    errors.push("選択した会社が見つかりません。最新の一覧から選び直してください。");
  }

  if (contactId && !related.contact) {
    errors.push("選択した担当者が見つかりません。最新の一覧から選び直してください。");
  }

  if (dealId && !related.deal) {
    errors.push("選択した商談が見つかりません。最新の一覧から選び直してください。");
  }

  if (ticketId && !related.ticket) {
    errors.push("選択したチケットが見つかりません。最新の一覧から選び直してください。");
  }

  if (subscriptionId && !related.subscription) {
    errors.push("選択した契約が見つかりません。最新の一覧から選び直してください。");
  }

  if (trialId && !related.trial) {
    errors.push("選択したトライアルが見つかりません。最新の一覧から選び直してください。");
  }

  const contactCompanyId = stringField(related.contact, "company_id");
  const dealLeadId = stringField(related.deal, "lead_id");
  const dealCompanyId = stringField(related.deal, "company_id");
  const dealContactId = stringField(related.deal, "contact_id");
  const ticketCompanyId = stringField(related.ticket, "company_id");
  const ticketContactId = stringField(related.ticket, "contact_id");
  const subscriptionCompanyId = stringField(related.subscription, "company_id");
  const trialCompanyId = stringField(related.trial, "company_id");

  if (companyId && contactId && contactCompanyId && contactCompanyId !== companyId) {
    errors.push("担当者は選択した会社に紐づくものを選択してください。");
  }

  if (companyId && dealId && dealCompanyId && dealCompanyId !== companyId) {
    errors.push("商談は選択した会社に紐づくものを選択してください。");
  }

  if (leadId && dealId && dealLeadId && dealLeadId !== leadId) {
    errors.push("リードは選択した商談に紐づくものを選択してください。");
  }

  if (contactId && dealId && dealContactId && dealContactId !== contactId) {
    errors.push("担当者は選択した商談に紐づくものを選択してください。");
  }

  if (companyId && ticketId && ticketCompanyId && ticketCompanyId !== companyId) {
    errors.push("チケットは選択した会社に紐づくものを選択してください。");
  }

  if (contactId && ticketId && ticketContactId && ticketContactId !== contactId) {
    errors.push("担当者は選択したチケットに紐づくものを選択してください。");
  }

  if (companyId && subscriptionId && subscriptionCompanyId && subscriptionCompanyId !== companyId) {
    errors.push("契約は選択した会社に紐づくものを選択してください。");
  }

  if (companyId && trialId && trialCompanyId && trialCompanyId !== companyId) {
    errors.push("トライアルは選択した会社に紐づくものを選択してください。");
  }

  return errors;
}

export type EntitySlug =
  | "leads"
  | "companies"
  | "contacts"
  | "deals"
  | "tasks"
  | "trials"
  | "contracts"
  | "tickets";

export type TableName =
  | "leads"
  | "companies"
  | "contacts"
  | "deals"
  | "activities"
  | "tasks"
  | "trials"
  | "subscriptions"
  | "product_usage"
  | "support_tickets"
  | "health_scores"
  | "billing_records"
  | "deal_stage_history";

export type CrmRecord = {
  id: string;
  organization_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
  [key: string]: unknown;
};

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "date"
  | "datetime-local"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox";

export type RelationKey = "companies" | "contacts" | "leads" | "deals" | "tickets";

export type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly string[];
  relation?: RelationKey;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  helper?: string;
  grid?: "full" | "half";
};

export type EntityConfig = {
  slug: EntitySlug;
  table: TableName;
  singular: string;
  plural: string;
  description: string;
  icon: string;
  primaryField: string;
  statusField?: string;
  searchFields: string[];
  filterField?: string;
  sortFields: string[];
  listFields: string[];
  detailFields: string[];
  fields: FieldConfig[];
  defaultValues?: Record<string, unknown>;
};

export type QueryState = {
  q?: string;
  filter?: string;
  sort?: string;
  direction?: "asc" | "desc";
  view?: string;
};

export type RelationOption = {
  value: string;
  label: string;
};

export type RelationOptions = Partial<Record<RelationKey, RelationOption[]>>;

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DashboardSnapshot = {
  leads: CrmRecord[];
  companies: CrmRecord[];
  contacts: CrmRecord[];
  deals: CrmRecord[];
  tasks: CrmRecord[];
  trials: CrmRecord[];
  contracts: CrmRecord[];
  tickets: CrmRecord[];
  usage: CrmRecord[];
  healthScores: CrmRecord[];
  activities: CrmRecord[];
};

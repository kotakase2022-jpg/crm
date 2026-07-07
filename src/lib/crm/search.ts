import { daysUntil, formatValue, isSameLocalDate, toDate } from "./format";
import { priorities } from "./options";
import { isCompletedTaskStatus } from "./automation";
import { relationIdMatches, relationIdValue } from "./related";
import type { CrmRecord, EntityConfig, QueryState, RelationOptions } from "./types";

const priorityRank = new Map(priorities.map((priority, index) => [priority, index]));
const ascendingDefaultSortFields = new Set(["due_date", "next_action_date", "expected_contract_date", "end_date", "renewal_on", "opened_at"]);
const descendingDefaultSortFields = new Set(["priority", "expected_mrr", "mrr", "probability", "activation_level", "login_count"]);
const numericSortFields = new Set(["expected_mrr", "mrr", "arr", "probability", "activation_level", "login_count"]);

function searchableFields(config: EntityConfig) {
  return Array.from(new Set([...config.searchFields, ...config.listFields]));
}

function valueIncludes(value: unknown, loweredQuery: string, field: string, relations: RelationOptions) {
  const raw = Array.isArray(value) ? value.join(" ") : String(value ?? "");
  if (raw.toLowerCase().includes(loweredQuery)) return true;

  if (value === null || value === undefined || value === "") return false;
  const formatted = formatValue(field, value, relations);
  return formatted !== "-" && formatted.toLowerCase().includes(loweredQuery);
}

export function matchesSearch(row: CrmRecord, config: EntityConfig, q?: string, relations: RelationOptions = {}) {
  const lowered = q?.trim().toLowerCase();
  if (!lowered) return true;

  return searchableFields(config).some((field) => valueIncludes(row[field], lowered, field, relations));
}

export function matchesFilter(row: CrmRecord, config: EntityConfig, filter?: string, view?: string) {
  const selectedFilter = filter?.trim();
  if (selectedFilter && config.filterField && String(row[config.filterField] ?? "").trim() !== selectedFilter) return false;

  if (config.slug === "tasks") {
    if (view === "today") return !isCompletedTaskStatus(row.status) && isSameLocalDate(row.due_date);
    if (view === "overdue") {
      const due = daysUntil(row.due_date);
      return !isCompletedTaskStatus(row.status) && due !== null && due < 0;
    }
  }

  return true;
}

function relationFilterFields(config: EntityConfig) {
  return new Set(config.fields.filter((field) => field.relation).map((field) => field.name));
}

function isAllowedRelationFilterField(config: EntityConfig, field: string) {
  return relationFilterFields(config).has(field);
}

export function normalizeRelationQuery(config: EntityConfig, query: QueryState): QueryState {
  const field = query.relationField?.trim();
  const id = relationIdValue(query.relationId);

  if (!field || !id || !isAllowedRelationFilterField(config, field)) {
    return {
      ...query,
      relationField: undefined,
      relationId: undefined,
    };
  }

  return {
    ...query,
    relationField: field,
    relationId: id,
  };
}

export function matchesRelationFilter(row: CrmRecord, query: QueryState, config?: EntityConfig) {
  const field = query.relationField?.trim();
  const id = relationIdValue(query.relationId);
  if (!field || !id) return true;
  if (config && !isAllowedRelationFilterField(config, field)) return true;
  if (!config && !field.endsWith("_id")) return true;
  return relationIdMatches(row[field], id);
}

export function defaultSortDirection(config: EntityConfig, sort?: string): "asc" | "desc" {
  const field = sort && config.sortFields.includes(sort) ? sort : config.sortFields[0] ?? "updated_at";

  if (ascendingDefaultSortFields.has(field)) return "asc";
  if (descendingDefaultSortFields.has(field)) return "desc";
  return "desc";
}

export function normalizedSort(config: EntityConfig, sort?: string) {
  return sort && config.sortFields.includes(sort) ? sort : config.sortFields[0] ?? "updated_at";
}

export function nextSortDirection(config: EntityConfig, query: QueryState, field: string): "asc" | "desc" {
  const currentSort = normalizedSort(config, query.sort);
  const currentDirection = query.direction ?? defaultSortDirection(config, currentSort);

  if (currentSort !== field) {
    return defaultSortDirection(config, field);
  }

  return currentDirection === "asc" ? "desc" : "asc";
}

export function listSortHref(config: EntityConfig, query: QueryState, field: string) {
  const params = new URLSearchParams();

  if (query.q) params.set("q", query.q);
  if (query.filter) params.set("filter", query.filter);
  if (query.view) params.set("view", query.view);
  if (query.relationField && query.relationId) {
    params.set("relation_field", query.relationField);
    params.set("relation_id", query.relationId);
  }

  params.set("sort", field);
  params.set("direction", nextSortDirection(config, query, field));

  return `/${config.slug}?${params.toString()}`;
}

export function listClearHref(config: EntityConfig, query: QueryState) {
  const params = new URLSearchParams();

  if (query.view) params.set("view", query.view);
  if (query.relationField && query.relationId) {
    params.set("relation_field", query.relationField);
    params.set("relation_id", query.relationId);
  }

  const queryString = params.toString();
  return queryString ? `/${config.slug}?${queryString}` : `/${config.slug}`;
}

export function listViewHref(config: EntityConfig, query: QueryState, view?: string) {
  const params = new URLSearchParams();

  if (query.q) params.set("q", query.q);
  if (view) params.set("view", view);
  if (query.relationField && query.relationId) {
    params.set("relation_field", query.relationField);
    params.set("relation_id", query.relationId);
  }

  const queryString = params.toString();
  return queryString ? `/${config.slug}?${queryString}` : `/${config.slug}`;
}

export function listCreateHref(config: EntityConfig, query: QueryState) {
  const params = new URLSearchParams();
  const field = query.relationField?.trim();
  const id = relationIdValue(query.relationId);

  if (field && id && isAllowedRelationFilterField(config, field)) {
    params.set(field, id);
  }

  const queryString = params.toString();
  return queryString ? `/${config.slug}/new?${queryString}` : `/${config.slug}/new`;
}

function isEmptySortValue(value: unknown) {
  return value === null || value === undefined || value === "" || (typeof value === "string" && value.trim() === "");
}

function numericSortValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isDateSortField(field: string) {
  return field.endsWith("_date") || field.endsWith("_on") || field.endsWith("_at") || field === "opened_at" || field === "resolved_at";
}

function compareValues(field: string, a: unknown, b: unknown, direction: "asc" | "desc") {
  const directionValue = direction === "asc" ? 1 : -1;
  const aIsEmpty = isEmptySortValue(a);
  const bIsEmpty = isEmptySortValue(b);

  if (aIsEmpty || bIsEmpty) {
    if (aIsEmpty && bIsEmpty) return 0;
    return aIsEmpty ? 1 : -1;
  }

  const aValue = a ?? "";
  const bValue = b ?? "";

  if (isDateSortField(field)) {
    const aDate = toDate(aValue);
    const bDate = toDate(bValue);
    if (aDate || bDate) {
      if (!aDate || !bDate) return aDate ? -1 : 1;
      return (aDate.getTime() - bDate.getTime()) * directionValue;
    }
  }

  if (field === "priority") {
    const aRank = priorityRank.get(String(aValue).trim() as (typeof priorities)[number]);
    const bRank = priorityRank.get(String(bValue).trim() as (typeof priorities)[number]);
    if (aRank !== undefined || bRank !== undefined) {
      if (aRank === undefined || bRank === undefined) return aRank === undefined ? 1 : -1;
      return (aRank - bRank) * directionValue;
    }
  }

  if (numericSortFields.has(field)) {
    const aNumber = numericSortValue(aValue);
    const bNumber = numericSortValue(bValue);
    if (aNumber !== null || bNumber !== null) {
      if (aNumber === null || bNumber === null) return aNumber === null ? 1 : -1;
      return (aNumber - bNumber) * directionValue;
    }
  }

  if (typeof aValue === "number" && typeof bValue === "number") {
    return (aValue - bValue) * directionValue;
  }

  return String(aValue).localeCompare(String(bValue), "ja") * directionValue;
}

export function filterSortRows(rows: CrmRecord[], config: EntityConfig, query: QueryState, relations: RelationOptions = {}) {
  const sort = normalizedSort(config, query.sort);
  const direction = query.direction ?? defaultSortDirection(config, sort);

  return rows
    .filter((row) => matchesSearch(row, config, query.q, relations))
    .filter((row) => matchesFilter(row, config, query.filter, query.view))
    .filter((row) => matchesRelationFilter(row, query, config))
    .sort((a, b) => compareValues(sort, a[sort], b[sort], direction));
}

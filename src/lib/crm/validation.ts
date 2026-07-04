import { z } from "zod";
import type { EntityConfig, FieldConfig } from "./types";

export class CrmValidationError extends Error {
  fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super(Object.values(fieldErrors).join("\n"));
    this.name = "CrmValidationError";
    this.fieldErrors = fieldErrors;
  }
}

function isEmpty(value: unknown) {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

function coerceFieldValue(field: FieldConfig, rawValue: unknown) {
  if (field.type === "multiselect") {
    if (Array.isArray(rawValue)) return rawValue.map(String).map((value) => value.trim()).filter(Boolean);
    if (typeof rawValue === "string" && rawValue.trim()) return [rawValue.trim()];
    return [];
  }

  if (field.type === "checkbox") {
    return rawValue === true || rawValue === "true" || rawValue === "on";
  }

  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

  if (value === "" || value === null || value === undefined) return null;

  if (field.type === "number") {
    return typeof value === "number" ? value : Number(value);
  }

  if (field.type === "datetime-local") {
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
  }

  return String(value);
}

function valueFromFormData(formData: FormData, field: FieldConfig) {
  if (field.type === "multiselect") return formData.getAll(field.name);
  if (field.type === "checkbox") return formData.get(field.name) ?? false;
  return formData.get(field.name);
}

export function parseEntityValues(config: EntityConfig, rawValues: Record<string, unknown>) {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of config.fields) {
    const value = coerceFieldValue(field, rawValues[field.name]);

    if (field.required && isEmpty(value)) {
      errors[field.name] = `${field.name} is required`;
      continue;
    }

    if (field.type === "number" && !isEmpty(value)) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        errors[field.name] = `${field.name} must be a valid number`;
        continue;
      }

      if (field.min !== undefined && value < field.min) errors[field.name] = `${field.name} must be at least ${field.min}`;
      if (field.max !== undefined && value > field.max) errors[field.name] = `${field.name} must be at most ${field.max}`;
    }

    if (field.type === "email" && !isEmpty(value)) {
      const email = z.string().email().safeParse(value);
      if (!email.success) errors[field.name] = `${field.name} must be a valid email`;
    }

    if (field.type === "datetime-local" && !isEmpty(value)) {
      const parsed = new Date(String(value));
      if (Number.isNaN(parsed.getTime())) errors[field.name] = `${field.name} must be a valid datetime`;
    }

    if (field.options && !isEmpty(value)) {
      const selected = Array.isArray(value) ? value : [value];
      const invalid = selected.find((item) => !field.options?.includes(String(item)));
      if (invalid) errors[field.name] = `${field.name} has an unsupported option`;
    }

    values[field.name] = value;
  }

  if (Object.keys(errors).length > 0) {
    throw new CrmValidationError(errors);
  }

  return values;
}

export function parseEntityFormValues(config: EntityConfig, formData: FormData) {
  const rawValues = Object.fromEntries(config.fields.map((field) => [field.name, valueFromFormData(formData, field)]));
  return parseEntityValues(config, rawValues);
}

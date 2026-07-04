import Link from "next/link";
import { Save } from "lucide-react";
import { Button, buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { dateInputValue, dateTimeInputValue } from "@/lib/crm/format";
import type { CrmRecord, EntityConfig, FieldConfig, RelationOptions } from "@/lib/crm/types";

function valueForField(field: FieldConfig, record: CrmRecord | null, config: EntityConfig) {
  const value = record?.[field.name] ?? config.defaultValues?.[field.name] ?? "";
  if (field.type === "date") return dateInputValue(value);
  if (field.type === "datetime-local") return dateTimeInputValue(value);
  if (Array.isArray(value)) return value;
  return value === null || value === undefined ? "" : String(value);
}

function relationOptions(field: FieldConfig, relations: RelationOptions) {
  return field.relation ? relations[field.relation] ?? [] : [];
}

function FieldInput({
  field,
  record,
  config,
  relations,
}: {
  field: FieldConfig;
  record: CrmRecord | null;
  config: EntityConfig;
  relations: RelationOptions;
}) {
  const value = valueForField(field, record, config);
  const baseProps = {
    id: field.name,
    name: field.name,
    required: field.required,
    "aria-describedby": field.helper ? `${field.name}-helper` : undefined,
  };

  if (field.type === "textarea") {
    return <Textarea {...baseProps} defaultValue={String(value)} placeholder={field.placeholder} />;
  }

  if (field.type === "select") {
    const options = field.relation ? relationOptions(field, relations).map((option) => option.label) : field.options ?? [];
    const values = field.relation ? relationOptions(field, relations).map((option) => option.value) : field.options ?? [];

    return (
      <Select {...baseProps} defaultValue={String(value)}>
        <option value="">未設定</option>
        {options.map((option, index) => (
          <option key={`${option}-${index}`} value={String(values[index] ?? option)}>
            {option}
          </option>
        ))}
      </Select>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-2 xl:grid-cols-3">
        {(field.options ?? []).map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name={field.name}
              value={option}
              defaultChecked={selected.includes(option)}
              className="h-4 w-4 rounded border-slate-300 text-slate-950"
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
        <input type="checkbox" name={field.name} defaultChecked={value === "true"} className="h-4 w-4 rounded border-slate-300" />
        有効
      </label>
    );
  }

  return (
    <Input
      {...baseProps}
      type={field.type}
      defaultValue={String(value)}
      placeholder={field.placeholder}
      min={field.min}
      max={field.max}
      step={field.step}
    />
  );
}

export function EntityForm({
  config,
  record = null,
  relations,
  action,
}: {
  config: EntityConfig;
  record?: CrmRecord | null;
  relations: RelationOptions;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <Card>
      <CardContent>
        <form action={action} className="grid gap-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {config.fields.map((field) => (
              <div key={field.name} className={field.grid === "full" ? "lg:col-span-2" : ""}>
                <label htmlFor={field.name} className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {field.label}
                  {field.required ? <span className="ml-1 text-rose-600">必須</span> : <span className="ml-1 text-slate-400">任意</span>}
                </label>
                <FieldInput field={field} record={record} config={config} relations={relations} />
                {field.helper ? (
                  <p id={`${field.name}-helper`} className="mt-1 text-xs text-slate-500">
                    {field.helper}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Link href={`/${config.slug}`} className={buttonClassName("secondary")}>
              キャンセル
            </Link>
            <Button>
              <Save className="h-4 w-4" aria-hidden />
              保存
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

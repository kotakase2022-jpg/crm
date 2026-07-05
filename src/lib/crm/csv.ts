import { parseEntityValues } from "./validation";
import type { EntityConfig } from "./types";

export type CsvRow = Record<string, string>;

export class CsvParseError extends Error {
  errors: string[];

  constructor(errors: string[]) {
    super(errors.join("\n"));
    this.name = "CsvParseError";
    this.errors = errors;
  }
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (quoted) {
    throw new CsvParseError(["CSV has an unterminated quoted value"]);
  }

  cells.push(current.trim());
  return cells;
}

function splitCsvRecords(text: string) {
  const records: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += char;
      current += next;
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      current += char;
      continue;
    }

    if (char === "\n" && !quoted) {
      if (current.trim().length > 0) records.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (quoted) {
    throw new CsvParseError(["CSV has an unterminated quoted value"]);
  }

  if (current.trim().length > 0) records.push(current);
  return records;
}

export function parseCsv(text: string, options: { requiredHeaders?: string[] } = {}) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  if (!normalized) {
    throw new CsvParseError(["CSV is empty"]);
  }

  const lines = splitCsvRecords(normalized);
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const errors: string[] = [];

  if (headers.length === 0 || headers.some((header) => !header)) {
    errors.push("CSV header row is invalid");
  }

  for (const required of options.requiredHeaders ?? []) {
    if (!headers.includes(required)) errors.push(`CSV is missing required header: ${required}`);
  }

  const rows = lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line);
    if (cells.length !== headers.length) {
      errors.push(`CSV row ${rowIndex + 2} has ${cells.length} cells but expected ${headers.length}`);
    }

    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

  if (errors.length > 0) {
    throw new CsvParseError(errors);
  }

  return { headers, rows };
}

export function parseEntityCsv(config: EntityConfig, text: string) {
  const requiredHeaders = config.fields.filter((field) => field.required).map((field) => field.name);
  const parsed = parseCsv(text, { requiredHeaders });

  return parsed.rows.map((row) => parseEntityValues(config, row));
}

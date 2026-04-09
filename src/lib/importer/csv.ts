import { parseLocationsCsv } from "../locations.ts";

import { normalizeUrl } from "./generic.ts";
import type { CsvLocationRow, CsvWriteOptions, CsvWriteResult, ImportedLocationDraft } from "./types.ts";

export const csvHeaders = [
  "title",
  "type",
  "description",
  "latitude",
  "longitude",
  "link",
  "photo",
] as const;

export function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function toCsvRow(row: CsvLocationRow): string {
  return [
    row.title,
    row.type,
    row.description,
    row.latitude?.toString() ?? "",
    row.longitude?.toString() ?? "",
    row.link,
    row.photo,
  ]
    .map((value) => escapeCsvValue(value))
    .join(",");
}

export function createCsvText(rows: CsvLocationRow[]): string {
  return [csvHeaders.join(","), ...rows.map((row) => toCsvRow(row))].join("\n");
}

export function mergeImportedRows(rows: ImportedLocationDraft[], options: CsvWriteOptions): CsvWriteResult {
  const existingCsvText = options.existingCsvText?.trim();
  const parsedExisting = existingCsvText ? parseLocationsCsv(existingCsvText) : undefined;
  const existingRows = parsedExisting?.locations ?? [];
  const existingPendingRows = parsedExisting?.pendingLocations ?? [];
  const existingLinks = new Set(
    [...existingRows, ...existingPendingRows]
      .map((row) => row.link)
      .filter((value): value is string => typeof value === "string" && value !== "")
      .map((value) => normalizeUrl(value)),
  );
  const written: ImportedLocationDraft[] = [];
  const skipped: Array<{ row: ImportedLocationDraft; reason: string }> = [];

  for (const row of rows) {
    if (options.dedupe && existingLinks.has(normalizeUrl(row.link))) {
      skipped.push({ row, reason: "Duplicate link already exists in CSV." });
      continue;
    }

    if (options.dedupe) {
      existingLinks.add(normalizeUrl(row.link));
    }

    written.push(row);
  }

  const allRows = [
      ...existingRows.map((row) => ({
        ...row,
        link: row.link ?? "",
        photo: row.photo ?? "",
      })),
      ...existingPendingRows.map((row) => ({
        title: row.title,
        type: row.type,
        description: row.description,
        latitude: undefined,
        longitude: undefined,
        link: row.link ?? "",
        photo: row.photo ?? "",
      })),
      ...written,
  ];

  return {
    csvText: createCsvText(allRows),
    written,
    skipped,
  };
}

export function formatDryRun(rows: ImportedLocationDraft[]): string {
  return rows
    .map((row) => {
      const lines = [
        `[${row.status}] ${row.link}`,
        `  title: ${row.title}`,
        `  type: ${row.type}`,
        `  coordinates: ${row.latitude !== undefined && row.longitude !== undefined ? `${row.latitude}, ${row.longitude}` : "missing"}`,
      ];

      if (row.description) {
        lines.push(`  description: ${row.description}`);
      }

      if (row.photo) {
        lines.push(`  photo: ${row.photo}`);
      }

      for (const note of row.notes) {
        lines.push(`  note: ${note}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

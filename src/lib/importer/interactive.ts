import type { ImportedLocationDraft } from "./types.ts";

export type ImportRowAction = "add" | "skip" | "edit" | "manual-coordinates" | "add-pending" | "manual-entry";

export type EditableImportedLocationDraft = ImportedLocationDraft;

export function formatInteractiveSummary(row: ImportedLocationDraft): string {
  const lines = [
    `title: ${row.title || "(empty)"}`,
    `type: ${row.type || "(empty)"}`,
    `description: ${row.description || "(empty)"}`,
    `latitude: ${row.latitude ?? "(empty)"}`,
    `longitude: ${row.longitude ?? "(empty)"}`,
    `link: ${row.link || "(empty)"}`,
    `photo: ${row.photo || "(empty)"}`,
    `status: ${row.status === "complete" ? "complete" : "needs review"}`,
  ];

  if (row.notes.length > 0) {
    lines.push("notes:");

    for (const note of row.notes) {
      lines.push(`- ${note}`);
    }
  }

  return lines.join("\n");
}

export function validateEditedRow(row: EditableImportedLocationDraft): string[] {
  const errors: string[] = [];

  if (row.title.trim() === "") {
    errors.push("Title is required.");
  }

  if (row.type.trim() === "") {
    errors.push("Type is required.");
  }

  const hasLatitude = row.latitude !== undefined;
  const hasLongitude = row.longitude !== undefined;

  if (hasLatitude !== hasLongitude) {
    errors.push("Latitude and longitude must both be filled or both be empty.");
  }

  return errors;
}

export function finalizeEditedRow(row: EditableImportedLocationDraft): EditableImportedLocationDraft {
  const complete = row.latitude !== undefined && row.longitude !== undefined;

  return {
    ...row,
    title: row.title.trim(),
    type: row.type.trim(),
    description: row.description.trim(),
    link: row.link.trim(),
    photo: row.photo.trim(),
    status: complete ? "complete" : "pending",
  };
}

export function applyFieldEdit(
  row: EditableImportedLocationDraft,
  field: keyof Pick<EditableImportedLocationDraft, "title" | "type" | "description" | "latitude" | "longitude" | "link" | "photo">,
  value: string,
): EditableImportedLocationDraft {
  if (field === "latitude" || field === "longitude") {
    const trimmed = value.trim();

    return {
      ...row,
      [field]: trimmed === "" ? undefined : Number(trimmed),
    };
  }

  return {
    ...row,
    [field]: value,
  };
}

export function createManualRow(seedUrl = ""): EditableImportedLocationDraft {
  return {
    title: "",
    type: "sight",
    description: "",
    latitude: undefined,
    longitude: undefined,
    link: seedUrl,
    photo: "",
    status: "pending",
    notes: ["Created manually during interactive import."],
  };
}

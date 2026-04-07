export type LocationPin = {
  title: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  link?: string;
};

export type PendingLocation = {
  title: string;
  type: string;
  description: string;
  link?: string;
  issue: "missing-coordinates" | "invalid-coordinates";
};

export type ParseLocationsResult = {
  locations: LocationPin[];
  pendingLocations: PendingLocation[];
  warnings: string[];
};

const requiredHeaders = [
  "title",
  "type",
  "description",
  "latitude",
  "longitude",
  "link",
] as const;

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function normalizeLines(csvText: string): string[] {
  return csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function parseLocationsCsv(csvText: string): ParseLocationsResult {
  const lines = normalizeLines(csvText);

  if (lines.length === 0) {
    throw new Error("CSV file is empty.");
  }

  const headers = splitCsvLine(lines[0]);
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`CSV is missing required headers: ${missingHeaders.join(", ")}`);
  }

  const warnings: string[] = [];
  const locations: LocationPin[] = [];
  const pendingLocations: PendingLocation[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const values = splitCsvLine(lines[index]);

    if (values.every((value) => value === "")) {
      continue;
    }

    const row = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex] ?? ""]));
    const title = row.title.trim();
    const type = row.type.trim();
    const description = row.description.trim();
    const link = row.link.trim() === "" ? undefined : row.link.trim();
    const latitudeRaw = row.latitude.trim();
    const longitudeRaw = row.longitude.trim();
    const latitude = Number(latitudeRaw);
    const longitude = Number(longitudeRaw);

    if (title === "" || type === "") {
      warnings.push(`Skipped row ${lineNumber} because it is missing a title or type.`);
      continue;
    }

    if (latitudeRaw === "" || longitudeRaw === "") {
      pendingLocations.push({
        title,
        type,
        description,
        link,
        issue: "missing-coordinates",
      });
      continue;
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      pendingLocations.push({
        title,
        type,
        description,
        link,
        issue: "invalid-coordinates",
      });
      continue;
    }

    locations.push({
      title,
      type,
      description,
      latitude,
      longitude,
      link,
    });
  }

  return { locations, pendingLocations, warnings };
}

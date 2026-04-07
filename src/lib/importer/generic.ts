import { load } from "cheerio";

import type { ScrapePageResult } from "./types.ts";

const locationTypeKeywords: Array<{ type: string; keywords: string[] }> = [
  { type: "airport", keywords: ["airport", "lufthavn", "flyplass"] },
  { type: "accommodation", keywords: ["hotel", "hytte", "cabin", "apartment", "leilighet", "accommodation", "stay"] },
  { type: "restaurant", keywords: ["restaurant", "dining", "bistro"] },
  { type: "cafe", keywords: ["cafe", "coffee", "kaffe"] },
  { type: "bar", keywords: ["bar", "cocktail", "pub"] },
  { type: "museum", keywords: ["museum", "gallery", "utstilling"] },
  { type: "beach", keywords: ["beach", "strand"] },
  { type: "station", keywords: ["station", "stasjon", "train station"] },
  { type: "ferry", keywords: ["ferry", "ferge"] },
  { type: "parking", keywords: ["parking", "parkering"] },
  { type: "nature", keywords: ["park", "nature", "friluftsliv", "trail"] },
  { type: "sight", keywords: ["attraction", "sight", "viewpoint", "utsikt"] },
];

const schemaTypeMap: Record<string, string> = {
  lodgingbusiness: "accommodation",
  hotel: "accommodation",
  apartmentcomplex: "accommodation",
  vacationrental: "accommodation",
  restaurant: "restaurant",
  cafeorcoffeeshop: "cafe",
  barorpub: "bar",
  museum: "museum",
  airport: "airport",
  trainstation: "station",
  touristattraction: "sight",
  park: "nature",
};

const addressLabelPattern = /(?:Adresse|Address|Location|Beliggenhet)\s*:?\s*([^\n]{6,120})/gi;

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function normalizeWhitespace(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return decodeHtmlEntities(value).replace(/\s+/g, " ").trim();
}

export function normalizeUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";

  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }

  return url.toString();
}

export function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => normalizeWhitespace(value)).filter((value) => value !== "")));
}

export function isValidCoordinatePair(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    (Math.abs(latitude) >= 1 || Math.abs(longitude) >= 1)
  );
}

export function parseCoordinateString(value: string | undefined): { latitude: number; longitude: number } | undefined {
  const parts = normalizeWhitespace(value).split(",");

  if (parts.length !== 2) {
    return undefined;
  }

  const latitude = Number(parts[0]);
  const longitude = Number(parts[1]);

  if (!isValidCoordinatePair(latitude, longitude)) {
    return undefined;
  }

  return { latitude, longitude };
}

function readMetaContent($: ReturnType<typeof load>, attribute: "name" | "property", value: string): string {
  return normalizeWhitespace($(`meta[${attribute}="${value}"]`).attr("content"));
}

export function extractJsonScriptById(html: string, scriptId: string): Record<string, unknown> | undefined {
  const $ = load(html);
  const raw = $(`script#${scriptId}`).html();

  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function extractInlineJsonObject(html: string, marker = "json = JSON.parse(JSON.stringify("): Record<string, unknown> | undefined {
  const start = html.indexOf(marker);

  if (start === -1) {
    return undefined;
  }

  const objectStart = html.indexOf("{", start + marker.length);

  if (objectStart === -1) {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = objectStart; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        const raw = html.slice(objectStart, index + 1);

        try {
          const parsed = JSON.parse(raw) as unknown;

          if (parsed && typeof parsed === "object") {
            return parsed as Record<string, unknown>;
          }
        } catch {
          return undefined;
        }
      }
    }
  }

  return undefined;
}

export function inferType(input: {
  schemaTypes?: string[];
  title?: string;
  description?: string;
  url?: string;
}): string {
  const schemaType = input.schemaTypes
    ?.map((value) => value.trim().toLowerCase().replace(/^https?:\/\/schema\.org\//, ""))
    .find((value) => schemaTypeMap[value]);

  if (schemaType) {
    return schemaTypeMap[schemaType];
  }

  const haystack = [input.title, input.description, input.url].map((value) => normalizeWhitespace(value).toLowerCase()).join(" ");

  for (const entry of locationTypeKeywords) {
    if (entry.keywords.some((keyword) => haystack.includes(keyword))) {
      return entry.type;
    }
  }

  return "sight";
}

export function extractJsonLdData(html: string): Array<Record<string, unknown>> {
  const $ = load(html);
  const nodes = $("script[type='application/ld+json']").toArray();
  const results: Array<Record<string, unknown>> = [];

  for (const node of nodes) {
    const raw = $(node).html();

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (item && typeof item === "object") {
          results.push(item as Record<string, unknown>);
        }
      }
    } catch {
      continue;
    }
  }

  return results;
}

function coordinateFromValue(value: unknown): { latitude: number; longitude: number } | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const latitude = Number((value as { latitude?: unknown }).latitude);
  const longitude = Number((value as { longitude?: unknown }).longitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude };
  }

  return undefined;
}

function collectJsonLdSchemaTypes(jsonLd: Array<Record<string, unknown>>): string[] {
  const values: string[] = [];

  for (const item of jsonLd) {
    const typeValue = item["@type"];

    if (typeof typeValue === "string") {
      values.push(typeValue);
      continue;
    }

    if (Array.isArray(typeValue)) {
      values.push(...typeValue.filter((entry): entry is string => typeof entry === "string"));
    }
  }

  return values;
}

export function extractCoordinatesFromHtml(html: string): { latitude: number; longitude: number; source: string } | undefined {
  const $ = load(html);
  const jsonLd = extractJsonLdData(html);

  for (const item of jsonLd) {
    const geo = coordinateFromValue(item.geo);

    if (geo) {
      return { ...geo, source: "json-ld" };
    }

    const place = coordinateFromValue(item);

    if (place) {
      return { ...place, source: "json-ld" };
    }
  }

  const latitudeMeta = Number(readMetaContent($, "property", "place:location:latitude") || readMetaContent($, "name", "geo.position").split(";")[0]);
  const longitudeMeta = Number(readMetaContent($, "property", "place:location:longitude") || readMetaContent($, "name", "geo.position").split(";")[1]);

  if (isValidCoordinatePair(latitudeMeta, longitudeMeta)) {
    return { latitude: latitudeMeta, longitude: longitudeMeta, source: "meta" };
  }

  return undefined;
}

export function extractAddressCandidates(html: string): string[] {
  const $ = load(html);
  const jsonLd = extractJsonLdData(html);
  const candidates: string[] = [];

  for (const item of jsonLd) {
    const address = item.address;

    if (typeof address === "string") {
      candidates.push(address);
      continue;
    }

    if (address && typeof address === "object") {
      const parts = [
        (address as { streetAddress?: string }).streetAddress,
        (address as { postalCode?: string }).postalCode,
        (address as { addressLocality?: string }).addressLocality,
        (address as { addressRegion?: string }).addressRegion,
        (address as { addressCountry?: string }).addressCountry,
      ];
      candidates.push(parts.filter(Boolean).join(", "));
    }
  }

  const text = normalizeWhitespace($.root().text());

  for (const match of text.matchAll(addressLabelPattern)) {
    candidates.push(match[1]);
  }

  const placeSnippets = [
    normalizeWhitespace($("[itemprop='address']").text()),
    normalizeWhitespace($("[data-testid*='location']").text()),
    normalizeWhitespace($("meta[property='og:locale']").attr("content")),
  ];

  return uniqueStrings([...candidates, ...placeSnippets]);
}

export function scrapePageFromHtml(input: { url: string; finalUrl?: string; html: string; statusCode?: number }): ScrapePageResult {
  const $ = load(input.html);
  const finalUrl = input.finalUrl ?? input.url;
  const jsonLd = extractJsonLdData(input.html);
  const schemaTypes = collectJsonLdSchemaTypes(jsonLd);
  const title =
    readMetaContent($, "property", "og:title") ||
    normalizeWhitespace($("title").first().text()) ||
    readMetaContent($, "name", "twitter:title");
  const description =
    readMetaContent($, "name", "description") ||
    readMetaContent($, "property", "og:description") ||
    normalizeWhitespace($("p").first().text());
  const coordinates = extractCoordinatesFromHtml(input.html);
  const addressCandidates = extractAddressCandidates(input.html);
  const notes: string[] = [];

  if (input.statusCode && input.statusCode >= 400) {
    notes.push(`HTTP ${input.statusCode}`);
  }

  if (input.statusCode === 202) {
    notes.push("Page returned an intermediate response that may limit scraping.");
  }

  if (!title) {
    notes.push("Title could not be extracted.");
  }

  if (!coordinates) {
    notes.push("No embedded coordinates found.");
  }

  return {
    url: input.url,
    finalUrl,
    statusCode: input.statusCode,
    title,
    description,
    type: inferType({ schemaTypes, title, description, url: finalUrl }),
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    addressCandidates,
    notes,
  };
}

export function summaryDescription(value: string | undefined): string {
  return normalizeWhitespace(value).slice(0, 220);
}

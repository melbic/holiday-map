import type { FetchPageOptions, GeocodeResult, ImportDependencies } from "./types.ts";

const geocodeCache = new Map<string, GeocodeResult | undefined>();

export async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPage(
  url: string,
  options?: FetchPageOptions,
): Promise<{ finalUrl: string; statusCode?: number; html: string }> {
  const response = await fetch(url, {
    headers: {
      "user-agent": options?.userAgent ?? "holiday-map-link-importer/0.1 (+https://example.com)",
      accept: "text/html,application/xhtml+xml",
      ...options?.headers,
    },
    redirect: "follow",
  });

  return {
    finalUrl: response.url || url,
    statusCode: response.status,
    html: await response.text(),
  };
}

export async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "user-agent": "holiday-map-link-importer/0.1 (+https://example.com)",
      accept: "application/json",
      referer: "https://www.inatur.no/",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | undefined> {
  const normalizedQuery = query.trim();

  if (normalizedQuery === "") {
    return undefined;
  }

  if (geocodeCache.has(normalizedQuery)) {
    return geocodeCache.get(normalizedQuery);
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      "user-agent": "holiday-map-link-importer/0.1 (+https://example.com)",
      accept: "application/json",
    },
  });

  if (!response.ok) {
    geocodeCache.set(normalizedQuery, undefined);
    return undefined;
  }

  const result = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
  const first = result[0];

  if (!first?.lat || !first?.lon) {
    geocodeCache.set(normalizedQuery, undefined);
    return undefined;
  }

  const geocode = {
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    label: first.display_name,
  };

  geocodeCache.set(normalizedQuery, geocode);
  return geocode;
}

export function createImportDependencies(): ImportDependencies {
  return {
    fetchPage,
    fetchJson,
    geocodeAddress,
    delay,
  };
}

import { normalizeUrl, scrapePageFromHtml, summaryDescription, uniqueStrings } from "./generic.ts";
import { loadStrategies } from "./strategies/load-strategies.ts";
import type { ImportDependencies, ImportedLocationDraft, ImportStrategy, StrategyResult } from "./types.ts";

function mergeStrategyResult(scraped: ReturnType<typeof scrapePageFromHtml>, strategyResult?: StrategyResult) {
  return {
    title: strategyResult?.title ?? scraped.title,
    description: strategyResult?.description ?? scraped.description,
    type: strategyResult?.type ?? scraped.type,
    latitude: strategyResult?.latitude ?? scraped.latitude,
    longitude: strategyResult?.longitude ?? scraped.longitude,
    photo: strategyResult?.photo ?? scraped.photo,
    addressCandidates: uniqueStrings([...(strategyResult?.addressCandidates ?? []), ...scraped.addressCandidates]),
    notes: [...scraped.notes, ...(strategyResult?.notes ?? [])],
  };
}

async function geocodeMissingCoordinates(
  latitude: number | undefined,
  longitude: number | undefined,
  addressCandidates: string[],
  notes: string[],
  dependencies: ImportDependencies,
): Promise<{ latitude?: number; longitude?: number; notes: string[] }> {
  let nextLatitude = latitude;
  let nextLongitude = longitude;

  if ((nextLatitude === undefined || nextLongitude === undefined) && addressCandidates.length > 0) {
    for (const candidate of addressCandidates) {
      const geocode = await dependencies.geocodeAddress(candidate);

      if (geocode) {
        nextLatitude = geocode.latitude;
        nextLongitude = geocode.longitude;
        notes.push(`Coordinates geocoded from ${geocode.label ?? candidate}.`);
        break;
      }

      if (dependencies.delay) {
        await dependencies.delay(1100);
      }
    }
  }

  if (nextLatitude === undefined || nextLongitude === undefined) {
    notes.push("Coordinates still missing after scraping and geocoding.");
  }

  return {
    latitude: nextLatitude,
    longitude: nextLongitude,
    notes,
  };
}

async function resolveStrategy(url: URL): Promise<ImportStrategy | undefined> {
  const strategies = await loadStrategies();
  return strategies.find((strategy) => strategy.matches(url));
}

export async function importUrl(
  url: string,
  dependencies: ImportDependencies,
): Promise<ImportedLocationDraft> {
  const normalizedUrl = normalizeUrl(url);
  const parsedUrl = new URL(normalizedUrl);
  const strategy = await resolveStrategy(parsedUrl);
  const fetchOptions = strategy?.getFetchOptions ? await strategy.getFetchOptions(parsedUrl) : undefined;
  const page = await dependencies.fetchPage(normalizedUrl, fetchOptions);
  const scraped = scrapePageFromHtml({
    url: normalizedUrl,
    finalUrl: page.finalUrl,
    html: page.html,
    statusCode: page.statusCode,
  });

  let strategyResult: StrategyResult | undefined;

  if (strategy) {
    try {
      strategyResult = await strategy.extract({
        url: parsedUrl,
        page,
        scraped,
        dependencies,
      });
    } catch {
      strategyResult = {
        notes: [`Strategy ${strategy.id} failed; falling back to generic extraction.`],
      };
    }
  }

  const merged = mergeStrategyResult(scraped, strategyResult);
  const geocoded = await geocodeMissingCoordinates(
    merged.latitude,
    merged.longitude,
    merged.addressCandidates,
    [...merged.notes],
    dependencies,
  );

  return {
    title: merged.title || page.finalUrl || normalizedUrl,
    type: merged.type || "sight",
    description: summaryDescription(merged.description),
    latitude: geocoded.latitude,
    longitude: geocoded.longitude,
    link: normalizeUrl(scraped.finalUrl || normalizedUrl),
    photo: merged.photo ?? "",
    status: geocoded.latitude !== undefined && geocoded.longitude !== undefined ? "complete" : "pending",
    notes: geocoded.notes,
  };
}

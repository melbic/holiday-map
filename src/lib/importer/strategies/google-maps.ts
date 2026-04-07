import { inferType, isValidCoordinatePair, normalizeWhitespace } from "../generic.ts";
import type { ImportStrategy } from "../types.ts";

function parsePlaceTitle(pathname: string): string | undefined {
  const match = pathname.match(/\/maps\/place\/([^/]+)/i);

  if (!match?.[1]) {
    return undefined;
  }

  return normalizeWhitespace(decodeURIComponent(match[1].replaceAll("+", " ")));
}

function parseCoordinatesFromUrl(url: URL): { latitude: number; longitude: number } | undefined {
  const preciseMatch = url.pathname.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);

  if (preciseMatch) {
    const latitude = Number(preciseMatch[1]);
    const longitude = Number(preciseMatch[2]);

    if (isValidCoordinatePair(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  const viewportMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

  if (viewportMatch) {
    const latitude = Number(viewportMatch[1]);
    const longitude = Number(viewportMatch[2]);

    if (isValidCoordinatePair(latitude, longitude)) {
      return { latitude, longitude };
    }
  }

  return undefined;
}

const strategy: ImportStrategy = {
  id: "google-maps",
  priority: 40,
  matches(url) {
    return url.hostname === "maps.app.goo.gl" || ((url.hostname === "www.google.com" || url.hostname === "google.com") && url.pathname.startsWith("/maps/"));
  },
  async extract({ page }) {
    const finalUrl = new URL(page.finalUrl);
    const title = parsePlaceTitle(finalUrl.pathname);
    const coordinates = parseCoordinatesFromUrl(finalUrl);

    return {
      title,
      type: title ? inferType({ title, url: finalUrl.toString() }) : undefined,
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      notes: coordinates ? ["Coordinates loaded from Google Maps URL."] : ["Google Maps URL did not expose coordinates."],
    };
  },
};

export default strategy;

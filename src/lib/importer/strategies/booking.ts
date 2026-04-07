import { load } from "cheerio";

import { parseCoordinateString } from "../generic.ts";
import type { ImportStrategy } from "../types.ts";

function isBookingChallengePage(html: string, statusCode?: number): boolean {
  if (statusCode === 202) {
    return true;
  }

  return html.includes("AwsWafIntegration") || html.includes("/__challenge_");
}

const strategy: ImportStrategy = {
  id: "booking",
  priority: 30,
  matches(url) {
    return url.hostname === "www.booking.com";
  },
  getFetchOptions() {
    return {
      userAgent: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    };
  },
  async extract({ page }) {
    const notes: string[] = [];

    if (isBookingChallengePage(page.html, page.statusCode)) {
      notes.push("Booking challenge page detected; metadata may be limited.");
    }

    const $ = load(page.html);
    const atlasCoordinate =
      parseCoordinateString($("[data-atlas-latlng]").first().attr("data-atlas-latlng")) ??
      parseCoordinateString($("a[href*='#map_opened'][data-atlas-latlng]").first().attr("data-atlas-latlng"));

    return {
      latitude: atlasCoordinate?.latitude,
      longitude: atlasCoordinate?.longitude,
      notes: atlasCoordinate ? [...notes, "Coordinates loaded from Booking page data."] : notes,
    };
  },
};

export default strategy;

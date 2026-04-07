import { extractJsonScriptById, isValidCoordinatePair } from "../generic.ts";
import type { ImportStrategy } from "../types.ts";

type FinnNextData = {
  props?: {
    pageProps?: {
      swrFallback?: {
        objectDataKey?: {
          location?: {
            latitude?: number;
            longitude?: number;
          };
        };
      };
    };
  };
};

const strategy: ImportStrategy = {
  id: "finn",
  priority: 20,
  matches(url) {
    return url.hostname === "www.finn.no";
  },
  async extract({ page }) {
    const nextData = extractJsonScriptById(page.html, "__NEXT_DATA__") as FinnNextData | undefined;
    const latitude = Number(nextData?.props?.pageProps?.swrFallback?.objectDataKey?.location?.latitude);
    const longitude = Number(nextData?.props?.pageProps?.swrFallback?.objectDataKey?.location?.longitude);

    if (!isValidCoordinatePair(latitude, longitude)) {
      return undefined;
    }

    return {
      latitude,
      longitude,
      notes: ["Coordinates loaded from FINN page data."],
    };
  },
};

export default strategy;

import { extractInlineJsonObject, isValidCoordinatePair, normalizeWhitespace } from "../generic.ts";
import type { ImportStrategy } from "../types.ts";

type InaturInlineData = {
  id?: string;
  hyttedetaljer?: {
    address?: {
      adresselinje1?: string;
      postnummer?: string;
      poststed?: string;
    };
  };
};

type ArcGisQueryResponse = {
  spatialReference?: {
    wkid?: number;
    latestWkid?: number;
  };
  features?: Array<{
    geometry?: {
      x?: number;
      y?: number;
    };
  }>;
};

function getInaturInlineData(html: string): InaturInlineData | undefined {
  const inlineJson = extractInlineJsonObject(html);

  if (!inlineJson) {
    return undefined;
  }

  return inlineJson as InaturInlineData;
}

function buildInaturAddressCandidate(data: InaturInlineData): string | undefined {
  const address = data.hyttedetaljer?.address;

  if (!address) {
    return undefined;
  }

  const parts = [address.adresselinje1, address.postnummer, address.poststed]
    .map((value) => normalizeWhitespace(value))
    .filter((value) => value !== "");

  if (parts.length === 0) {
    return undefined;
  }

  return parts.join(", ");
}

function convertUtm33ToWgs84(easting: number, northing: number): { latitude: number; longitude: number } {
  const scaleFactor = 0.9996;
  const falseEasting = 500000;
  const semiMajorAxis = 6378137;
  const eccentricitySquared = 0.006694380023;
  const eccentricityPrimeSquared = eccentricitySquared / (1 - eccentricitySquared);
  const e1 = (1 - Math.sqrt(1 - eccentricitySquared)) / (1 + Math.sqrt(1 - eccentricitySquared));
  const x = easting - falseEasting;
  const y = northing;
  const longOrigin = 15;
  const m = y / scaleFactor;
  const mu =
    m /
    (semiMajorAxis *
      (1 -
        eccentricitySquared / 4 -
        (3 * eccentricitySquared * eccentricitySquared) / 64 -
        (5 * eccentricitySquared * eccentricitySquared * eccentricitySquared) / 256));

  const phi1Rad =
    mu +
    ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
    ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
    ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1Rad);
  const cosPhi1 = Math.cos(phi1Rad);
  const tanPhi1 = Math.tan(phi1Rad);
  const n1 = semiMajorAxis / Math.sqrt(1 - eccentricitySquared * sinPhi1 * sinPhi1);
  const t1 = tanPhi1 * tanPhi1;
  const c1 = eccentricityPrimeSquared * cosPhi1 * cosPhi1;
  const r1 =
    (semiMajorAxis * (1 - eccentricitySquared)) /
    Math.pow(1 - eccentricitySquared * sinPhi1 * sinPhi1, 1.5);
  const d = x / (n1 * scaleFactor);

  const latitude =
    phi1Rad -
    ((n1 * tanPhi1) / r1) *
      (d * d / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * eccentricityPrimeSquared) * Math.pow(d, 4)) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * eccentricityPrimeSquared - 3 * c1 * c1) *
          Math.pow(d, 6)) /
          720);

  const longitude =
    ((d -
      ((1 + 2 * t1 + c1) * Math.pow(d, 3)) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * eccentricityPrimeSquared + 24 * t1 * t1) * Math.pow(d, 5)) /
        120) /
      cosPhi1) *
      (180 / Math.PI) +
    longOrigin;

  return {
    latitude: latitude * (180 / Math.PI),
    longitude,
  };
}

const strategy: ImportStrategy = {
  id: "inatur",
  priority: 10,
  matches(url) {
    return url.hostname === "www.inatur.no";
  },
  async extract({ page, dependencies }) {
    const inlineData = getInaturInlineData(page.html);

    if (!inlineData?.id) {
      return undefined;
    }

    const queryUrl = new URL(
      "https://inatur.geodataonline.no/arcgis/rest/services/inatur/Open-Inatur/MapServer/0/query",
    );
    queryUrl.searchParams.set("where", `tilbudsid = '${inlineData.id}'`);
    queryUrl.searchParams.set("outFields", "*");
    queryUrl.searchParams.set("returnGeometry", "true");
    queryUrl.searchParams.set("f", "json");

    const addressCandidate = buildInaturAddressCandidate(inlineData);

    try {
      const response = await dependencies.fetchJson<ArcGisQueryResponse>(queryUrl.toString());
      const geometry = response.features?.[0]?.geometry;
      const wkid = response.spatialReference?.latestWkid ?? response.spatialReference?.wkid;

      if (wkid === 25833 && Number.isFinite(geometry?.x) && Number.isFinite(geometry?.y)) {
        const converted = convertUtm33ToWgs84(Number(geometry?.x), Number(geometry?.y));

        if (isValidCoordinatePair(converted.latitude, converted.longitude)) {
          return {
            latitude: converted.latitude,
            longitude: converted.longitude,
            addressCandidates: addressCandidate ? [addressCandidate] : undefined,
            notes: ["Coordinates loaded from Inatur map service."],
          };
        }
      }

      if (isValidCoordinatePair(Number(geometry?.y), Number(geometry?.x))) {
        return {
          latitude: Number(geometry?.y),
          longitude: Number(geometry?.x),
          addressCandidates: addressCandidate ? [addressCandidate] : undefined,
          notes: ["Coordinates loaded from Inatur map service."],
        };
      }

      return {
        addressCandidates: addressCandidate ? [addressCandidate] : undefined,
        notes: ["Inatur map service did not return coordinates."],
      };
    } catch {
      return {
        addressCandidates: addressCandidate ? [addressCandidate] : undefined,
        notes: ["Inatur map service lookup failed."],
      };
    }
  },
};

export default strategy;

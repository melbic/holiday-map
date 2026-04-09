import { describe, expect, it, vi } from "vitest";

import { importUrl } from "../index";

describe("importer strategies", () => {
  it("uses the Inatur map service before geocoding", async () => {
    const geocodeAddress = vi.fn();
    const fetchJson = vi.fn().mockResolvedValue({
      spatialReference: { wkid: 25833, latestWkid: 25833 },
      features: [{ geometry: { x: 683090.6, y: 7646076.9 } }],
    });

    const row = await importUrl("https://www.inatur.no/hytte/example", {
      fetchPage: async () => ({
        finalUrl: "https://www.inatur.no/hytte/example",
        statusCode: 200,
        html: `
          <html>
            <head>
              <title>Gjestehytte i Dividal med laksefiske</title>
              <meta property="og:image" content="https://images.example.com/inatur.jpg" />
              <script>
                json = JSON.parse(JSON.stringify({"id":"62472aa2869f5c06c9506875","hyttedetaljer":{"address":{"adresselinje1":"Dividalsveien 1903","postnummer":"9334","poststed":"Overbygd"}}}));
              </script>
            </head>
          </html>
        `,
      }),
      fetchJson,
      geocodeAddress,
    });

    expect(fetchJson).toHaveBeenCalledWith(
      expect.stringContaining(
        "https://inatur.geodataonline.no/arcgis/rest/services/inatur/Open-Inatur/MapServer/0/query",
      ),
    );
    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(row.latitude).toBeCloseTo(68.8648, 3);
    expect(row.longitude).toBeCloseTo(19.5536, 3);
    expect(row.photo).toBe("https://images.example.com/inatur.jpg");
    expect(row.notes).toContain("Coordinates loaded from Inatur map service.");
  });

  it("uses FINN coordinates from __NEXT_DATA__ before geocoding", async () => {
    const geocodeAddress = vi.fn();
    const fetchJson = vi.fn();

    const row = await importUrl("https://www.finn.no/reise/feriehus-hytteutleie/ad.html?finnkode=186297216", {
      fetchPage: async () => ({
        finalUrl: "https://www.finn.no/reise/feriehus-hytteutleie/ad.html?finnkode=186297216",
        statusCode: 200,
        html: `
          <html>
            <head>
              <title>Moderne hytte i Lodingen Vestbygd</title>
              <meta property="og:image" content="https://images.example.com/finn.jpg" />
              <script id="__NEXT_DATA__" type="application/json">
                {"props":{"pageProps":{"swrFallback":{"objectDataKey":{"location":{"latitude":68.3714904237352,"longitude":15.7220628955536}}}}}}
              </script>
            </head>
          </html>
        `,
      }),
      fetchJson,
      geocodeAddress,
    });

    expect(fetchJson).not.toHaveBeenCalled();
    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(row.latitude).toBeCloseTo(68.37149, 5);
    expect(row.longitude).toBeCloseTo(15.72206, 5);
    expect(row.photo).toBe("https://images.example.com/finn.jpg");
    expect(row.notes).toContain("Coordinates loaded from FINN page data.");
  });

  it("uses Booking coordinates from data-atlas-latlng before geocoding", async () => {
    const geocodeAddress = vi.fn();
    const fetchJson = vi.fn();

    const row = await importUrl("https://www.booking.com/hotel/no/example.en-gb.html", {
      fetchPage: async (_url, options) => {
        expect(options?.userAgent).toContain("facebookexternalhit");

        return {
          finalUrl: "https://www.booking.com/hotel/no/example.en-gb.html",
          statusCode: 200,
          html: `
            <html>
              <head>
                <meta property="og:title" content="Attme Have, Brostadbotn, Norway" />
                <meta property="og:description" content="Boasting a garden, Attme Have is situated in Brostadbotn." />
                <meta property="og:image" content="https://images.example.com/booking.jpg" />
              </head>
              <body>
                <a data-atlas-latlng="69.0691869671005,17.652965983992" href="#map_opened-map_trigger_header"></a>
                <script type="application/ld+json">
                  {"@type":"Hotel","address":{"streetAddress":"Brostadveien 343","addressLocality":"Brostadbotn","addressCountry":"Norway"}}
                </script>
              </body>
            </html>
          `,
        };
      },
      fetchJson,
      geocodeAddress,
    });

    expect(fetchJson).not.toHaveBeenCalled();
    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(row.latitude).toBeCloseTo(69.06918, 4);
    expect(row.longitude).toBeCloseTo(17.65296, 4);
    expect(row.title).toBe("Attme Have, Brostadbotn, Norway");
    expect(row.photo).toBe("https://images.example.com/booking.jpg");
    expect(row.notes).toContain("Coordinates loaded from Booking page data.");
  });

  it("falls back gracefully when Booking serves a challenge page", async () => {
    const geocodeAddress = vi.fn();
    const fetchJson = vi.fn();

    const row = await importUrl("https://www.booking.com/hotel/no/example.en-gb.html", {
      fetchPage: async () => ({
        finalUrl: "https://www.booking.com/hotel/no/example.en-gb.html",
        statusCode: 202,
        html: `
          <html>
            <head><title></title></head>
            <body>
              <script>AwsWafIntegration.getToken()</script>
            </body>
          </html>
        `,
      }),
      fetchJson,
      geocodeAddress,
    });

    expect(row.status).toBe("pending");
    expect(row.notes).toContain("Booking challenge page detected; metadata may be limited.");
  });

  it("uses Google Maps final URL data before geocoding", async () => {
    const geocodeAddress = vi.fn();
    const fetchJson = vi.fn();

    const row = await importUrl("https://maps.app.goo.gl/13XC3V4FeEbZSvet6", {
      fetchPage: async () => ({
        finalUrl:
          "https://www.google.com/maps/place/Troms%C3%B8+Airport/@69.6840974,18.9124202,18.08z/data=!4m6!3m5!1s0x45c4c422788e3f0f:0x5040733cf2f3e30e!8m2!3d69.6834173!4d18.9168388!16zL20vMDlkcDNj?entry=tts",
        statusCode: 200,
        html: "<html><head><title>Google Maps</title><meta property=\"og:image\" content=\"https://images.example.com/maps.jpg\" /></head><body></body></html>",
      }),
      fetchJson,
      geocodeAddress,
    });

    expect(fetchJson).not.toHaveBeenCalled();
    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(row.title).toBe("Tromsø Airport");
    expect(row.type).toBe("airport");
    expect(row.latitude).toBeCloseTo(69.6834173, 6);
    expect(row.longitude).toBeCloseTo(18.9168388, 6);
    expect(row.photo).toBe("https://images.example.com/maps.jpg");
    expect(row.notes).toContain("Coordinates loaded from Google Maps URL.");
  });
});

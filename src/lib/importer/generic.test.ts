import { describe, expect, it } from "vitest";

import {
  extractAddressCandidates,
  extractCoordinatesFromHtml,
  inferType,
  scrapePageFromHtml,
} from "./generic";

describe("importer generic helpers", () => {
  it("infers accommodation from listing content", () => {
    expect(
      inferType({
        title: "Gjestehytte i Dividal med laksefiske",
        description: "Perfekt utgangspunkt for jakt, fiske og friluftsliv.",
      }),
    ).toBe("accommodation");
  });

  it("extracts coordinates from JSON-LD before geocoding", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {"@type":"LodgingBusiness","name":"Cabin","geo":{"latitude":68.7,"longitude":17.4}}
          </script>
        </head>
      </html>
    `;

    expect(extractCoordinatesFromHtml(html)).toEqual({
      latitude: 68.7,
      longitude: 17.4,
      source: "json-ld",
    });
  });

  it("does not treat arbitrary small integers as coordinates", () => {
    const html = `
      <html>
        <body>
          <p>Senger til 4 personer og 1 soverom.</p>
        </body>
      </html>
    `;

    expect(extractCoordinatesFromHtml(html)).toBeUndefined();
  });

  it("extracts address candidates from listing text", () => {
    const html = `
      <html>
        <body>
          <p>Adresse Dividalsveien 1903 9334 Overbygd</p>
        </body>
      </html>
    `;

    expect(extractAddressCandidates(html)).toContain("Dividalsveien 1903 9334 Overbygd");
  });

  it("scrapes title, description, and notes from a protected page", () => {
    const html = `
      <html>
        <head>
          <title>Booking preview</title>
          <meta name="description" content="Short preview" />
        </head>
        <body></body>
      </html>
    `;

    expect(scrapePageFromHtml({ url: "https://example.com", html, statusCode: 202 })).toMatchObject({
      title: "Booking preview",
      description: "Short preview",
      type: "sight",
      notes: expect.arrayContaining([
        "Page returned an intermediate response that may limit scraping.",
        "No embedded coordinates found.",
      ]),
    });
  });
});

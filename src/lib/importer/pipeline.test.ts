import { describe, expect, it, vi } from "vitest";

import { escapeCsvValue, importUrl, mergeImportedRows } from "./index";

describe("importer pipeline", () => {
  it("uses geocoding when coordinates were not embedded", async () => {
    const geocodeAddress = vi.fn().mockResolvedValue({
      latitude: 69.015,
      longitude: 18.992,
      label: "Dividalsveien 1903, 9334 Overbygd",
    });
    const fetchJson = vi.fn().mockResolvedValue({ features: [] });

    const row = await importUrl("https://example.com/cabin", {
      fetchPage: async () => ({
        finalUrl: "https://example.com/cabin",
        statusCode: 200,
        html: `
          <html>
            <head>
              <title>Gjestehytte i Dividal med laksefiske</title>
              <meta name="description" content="Perfekt utgangspunkt for jakt, fiske og friluftsliv." />
            </head>
            <body>
              <p>Adresse Dividalsveien 1903 9334 Overbygd</p>
            </body>
          </html>
        `,
      }),
      fetchJson,
      geocodeAddress,
    });

    expect(fetchJson).not.toHaveBeenCalled();
    expect(geocodeAddress).toHaveBeenCalledOnce();
    expect(row.status).toBe("complete");
    expect(row.latitude).toBe(69.015);
    expect(row.type).toBe("accommodation");
  });

  it("skips geocoding when direct coordinates are available", async () => {
    const geocodeAddress = vi.fn();
    const fetchJson = vi.fn();

    const row = await importUrl("https://example.com/cabin", {
      fetchPage: async () => ({
        finalUrl: "https://example.com/cabin",
        statusCode: 200,
        html: `
          <html>
            <head>
              <title>Cabin</title>
              <script type="application/ld+json">
                {"@type":"LodgingBusiness","name":"Cabin","geo":{"latitude":68.7,"longitude":17.4}}
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
    expect(row.latitude).toBe(68.7);
    expect(row.longitude).toBe(17.4);
  });

  it("merges imported rows while deduping by link", () => {
    const merged = mergeImportedRows(
      [
        {
          title: "New Cabin",
          type: "accommodation",
          description: "Fresh import",
          latitude: 1,
          longitude: 2,
          link: "https://example.com/new",
          status: "complete",
          notes: [],
        },
        {
          title: "Duplicate Cabin",
          type: "accommodation",
          description: "Duplicate import",
          latitude: 3,
          longitude: 4,
          link: "https://example.com/already-there",
          status: "complete",
          notes: [],
        },
      ],
      {
        append: true,
        dedupe: true,
        existingCsvText: [
          "title,type,description,latitude,longitude,link",
          "Existing,accommodation,Already present,10,11,https://example.com/already-there",
        ].join("\n"),
      },
    );

    expect(merged.written).toHaveLength(1);
    expect(merged.skipped).toEqual([
      {
        row: expect.objectContaining({ link: "https://example.com/already-there" }),
        reason: "Duplicate link already exists in CSV.",
      },
    ]);
    expect(merged.csvText).toContain("https://example.com/new");
  });

  it("preserves pending rows when appending to an existing CSV", () => {
    const merged = mergeImportedRows(
      [
        {
          title: "Imported Cabin",
          type: "accommodation",
          description: "Fresh import",
          latitude: 1,
          longitude: 2,
          link: "https://example.com/imported",
          status: "complete",
          notes: [],
        },
      ],
      {
        append: true,
        dedupe: true,
        existingCsvText: [
          "title,type,description,latitude,longitude,link",
          "Pending,accommodation,Needs coordinates,,,https://example.com/pending",
        ].join("\n"),
      },
    );

    expect(merged.csvText).toContain("Pending,accommodation,Needs coordinates,,,https://example.com/pending");
    expect(merged.csvText).toContain("https://example.com/imported");
  });

  it("escapes CSV values with commas and quotes", () => {
    expect(escapeCsvValue('A "quoted", value')).toBe('"A ""quoted"", value"');
  });
});

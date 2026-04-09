import { describe, expect, it } from "vitest";

import { parseLocationsCsv } from "./locations";

describe("parseLocationsCsv", () => {
  it("parses valid rows", () => {
    const csv = [
      "title,type,description,latitude,longitude,link,photo",
      "Airport,airport,Main arrival point,47.45,8.56,https://example.com,https://example.com/photo.jpg",
    ].join("\n");

    const result = parseLocationsCsv(csv);

    expect(result.locations).toHaveLength(1);
    expect(result.pendingLocations).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.locations[0]).toMatchObject({
      title: "Airport",
      type: "airport",
      description: "Main arrival point",
      latitude: 47.45,
      longitude: 8.56,
      link: "https://example.com",
      photo: "https://example.com/photo.jpg",
    });
  });

  it("allows missing link and photo", () => {
    const csv = [
      "title,type,description,latitude,longitude,link,photo",
      "Stay,accommodation,Apartment,46.2,6.1,,",
    ].join("\n");

    const result = parseLocationsCsv(csv);

    expect(result.locations[0]?.link).toBeUndefined();
    expect(result.locations[0]?.photo).toBeUndefined();
  });

  it("moves rows with invalid coordinates into needs review", () => {
    const csv = [
      "title,type,description,latitude,longitude,link,photo",
      "Stay,accommodation,Apartment,nope,6.1,https://example.com,https://example.com/photo.jpg",
    ].join("\n");

    const result = parseLocationsCsv(csv);

    expect(result.locations).toHaveLength(0);
    expect(result.pendingLocations).toEqual([
      {
        title: "Stay",
        type: "accommodation",
        description: "Apartment",
        link: "https://example.com",
        photo: "https://example.com/photo.jpg",
        issue: "invalid-coordinates",
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("moves rows with missing coordinates into needs review", () => {
    const csv = [
      "title,type,description,latitude,longitude,link,photo",
      "Stay,accommodation,Apartment,,,https://example.com,https://example.com/photo.jpg",
    ].join("\n");

    const result = parseLocationsCsv(csv);

    expect(result.locations).toEqual([]);
    expect(result.pendingLocations).toEqual([
      {
        title: "Stay",
        type: "accommodation",
        description: "Apartment",
        link: "https://example.com",
        photo: "https://example.com/photo.jpg",
        issue: "missing-coordinates",
      },
    ]);
  });

  it("still skips rows missing a title or type", () => {
    const csv = [
      "title,type,description,latitude,longitude,link,photo",
      ",accommodation,Apartment,46.2,6.1,https://example.com,https://example.com/photo.jpg",
    ].join("\n");

    const result = parseLocationsCsv(csv);

    expect(result.locations).toEqual([]);
    expect(result.pendingLocations).toEqual([]);
    expect(result.warnings).toContain(
      "Skipped row 2 because it is missing a title or type.",
    );
  });

  it("throws when required headers are missing", () => {
    const csv = [
      "title,type,description,latitude,longitude,link",
      "Stay,accommodation,Apartment,46.2,6.1,https://example.com",
    ].join("\n");

    expect(() => parseLocationsCsv(csv)).toThrow(
      "CSV is missing required headers: photo",
    );
  });
});

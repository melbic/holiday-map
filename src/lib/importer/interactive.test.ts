import { describe, expect, it } from "vitest";

import {
  applyFieldEdit,
  createManualRow,
  finalizeEditedRow,
  formatInteractiveSummary,
  validateEditedRow,
} from "./interactive.ts";

describe("importer interactive helpers", () => {
  it("creates a manual row seeded with the failed URL", () => {
    expect(createManualRow("https://example.com")).toMatchObject({
      title: "",
      type: "sight",
      description: "",
      link: "https://example.com",
      photo: "",
      status: "pending",
    });
  });

  it("applies field edits and allows blank coordinates", () => {
    let row = createManualRow("https://example.com");
    row = applyFieldEdit(row, "title", "Cabin");
    row = applyFieldEdit(row, "latitude", "68.7");
    row = applyFieldEdit(row, "longitude", "17.4");

    expect(row.title).toBe("Cabin");
    expect(row.latitude).toBe(68.7);
    expect(row.longitude).toBe(17.4);
  });

  it("finalizes status based on coordinate presence", () => {
    const complete = finalizeEditedRow({
      ...createManualRow("https://example.com"),
      title: "Airport",
      type: "airport",
      latitude: 69.6,
      longitude: 18.9,
    });
    const pending = finalizeEditedRow({
      ...createManualRow("https://example.com"),
      title: "Pending spot",
      type: "sight",
    });

    expect(complete.status).toBe("complete");
    expect(pending.status).toBe("pending");
  });

  it("validates required fields and paired coordinates", () => {
    expect(
      validateEditedRow({
        ...createManualRow("https://example.com"),
        title: "",
        type: "",
        latitude: 69,
      }),
    ).toEqual([
      "Title is required.",
      "Type is required.",
      "Latitude and longitude must both be filled or both be empty.",
    ]);
  });

  it("formats a readable summary for review", () => {
    const summary = formatInteractiveSummary({
      title: "Tromso Airport",
      type: "airport",
      description: "Airport entry",
      latitude: 69.6,
      longitude: 18.9,
      link: "https://example.com",
      photo: "https://example.com/photo.jpg",
      status: "complete",
      notes: ["Coordinates loaded from Google Maps URL."],
    });

    expect(summary).toContain("title: Tromso Airport");
    expect(summary).toContain("photo: https://example.com/photo.jpg");
    expect(summary).toContain("status: complete");
    expect(summary).toContain("- Coordinates loaded from Google Maps URL.");
  });
});

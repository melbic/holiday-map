import { describe, expect, it, vi } from "vitest";

vi.mock("./link-importer.ts", () => ({
  createImportDependencies: vi.fn(() => ({ mocked: true })),
  importUrl: vi.fn(async (url: string) => ({
    title: "Imported place",
    type: "accommodation",
    description: "Imported description",
    latitude: 69.1,
    longitude: 18.9,
    link: url,
    photo: "https://images.example.com/photo.jpg",
    status: "complete",
    notes: [],
  })),
}));

describe("POST /api/import-link", () => {
  it("returns imported JSON for a valid URL", async () => {
    const { POST } = await import("../pages/api/import-link");
    const request = new Request("http://example.com/api/import-link", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/place" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST({ request } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      title: "Imported place",
      link: "https://example.com/place",
      status: "complete",
    });
  });

  it("rejects invalid URLs", async () => {
    const { POST } = await import("../pages/api/import-link");
    const request = new Request("http://example.com/api/import-link", {
      method: "POST",
      body: JSON.stringify({ url: "notaurl" }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST({ request } as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "A valid http or https URL is required." });
  });
});

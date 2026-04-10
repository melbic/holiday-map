import { beforeEach, describe, expect, it, vi } from "vitest";

const createSharedMap = vi.fn();
const fetchSharedMap = vi.fn();
const updateSharedMap = vi.fn();

vi.mock("./shared-maps.ts", () => ({
  createSharedMap,
  fetchSharedMap,
  updateSharedMap,
}));

describe("share map API routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates a shared map and returns public and edit URLs", async () => {
    createSharedMap.mockResolvedValue({
      shareId: "share-123",
      editSecret: "secret-456",
      lastChangedAt: "2026-04-10T00:00:00.000Z",
    });

    const { POST } = await import("../pages/api/share-map");
    const request = new Request("https://example.com/api/share-map", {
      method: "POST",
      body: JSON.stringify({ name: "Trip", csvText: "title,type,description,latitude,longitude,link,photo\nA,airport,,1,2,," }),
      headers: { "content-type": "application/json" },
    });

    const response = await POST({ request, site: new URL("https://holiday-map.example") } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      shareId: "share-123",
      publicUrl: "https://holiday-map.example/map/share-123",
      editUrl: "https://holiday-map.example/map/share-123?edit=secret-456",
      lastChangedAt: "2026-04-10T00:00:00.000Z",
    });
  });

  it("loads a shared map by shareId", async () => {
    fetchSharedMap.mockResolvedValue({
      name: "Trip",
      shareId: "share-123",
      lastChangedAt: "2026-04-10T00:00:00.000Z",
      csvText: "title,type,description,latitude,longitude,link,photo\nA,airport,,1,2,,",
      canEdit: false,
    });

    const { GET } = await import("../pages/api/share-map/[shareId]");
    const response = await GET({ params: { shareId: "share-123" }, url: new URL("https://example.com/map/share-123") } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.shareId).toBe("share-123");
    expect(body.canEdit).toBe(false);
    expect(fetchSharedMap).toHaveBeenCalledWith("share-123", undefined);
  });

  it("passes the edit secret through when loading a shared map", async () => {
    fetchSharedMap.mockResolvedValue({
      name: "Trip",
      shareId: "share-123",
      lastChangedAt: "2026-04-10T00:00:00.000Z",
      csvText: "title,type,description,latitude,longitude,link,photo\nA,airport,,1,2,,",
      canEdit: true,
    });

    const { GET } = await import("../pages/api/share-map/[shareId]");
    const response = await GET({
      params: { shareId: "share-123" },
      url: new URL("https://example.com/map/share-123?edit=secret-456"),
    } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.canEdit).toBe(true);
    expect(fetchSharedMap).toHaveBeenCalledWith("share-123", "secret-456");
  });

  it("updates a shared map with a valid edit secret", async () => {
    updateSharedMap.mockResolvedValue({ lastChangedAt: "2026-04-11T00:00:00.000Z" });

    const { PUT } = await import("../pages/api/share-map/[shareId]");
    const request = new Request("https://example.com/api/share-map/share-123", {
      method: "PUT",
      body: JSON.stringify({
        name: "Updated Trip",
        csvText: "title,type,description,latitude,longitude,link,photo\nA,airport,,1,2,,",
        editSecret: "secret-456",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await PUT({ params: { shareId: "share-123" }, request } as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ lastChangedAt: "2026-04-11T00:00:00.000Z" });
  });

  it("returns 400 when updating with an invalid edit secret", async () => {
    updateSharedMap.mockRejectedValue(new Error("Invalid edit secret."));

    const { PUT } = await import("../pages/api/share-map/[shareId]");
    const request = new Request("https://example.com/api/share-map/share-123", {
      method: "PUT",
      body: JSON.stringify({
        name: "Updated Trip",
        csvText: "title,type,description,latitude,longitude,link,photo\nA,airport,,1,2,,",
        editSecret: "wrong-secret",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await PUT({ params: { shareId: "share-123" }, request } as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid edit secret." });
  });
});

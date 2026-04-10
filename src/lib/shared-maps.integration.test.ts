import { beforeEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

import { createSharedMap, fetchSharedMap, updateSharedMap } from "./shared-maps.ts";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeIfSupabase = supabaseUrl && serviceRoleKey ? describe : describe.skip;
const admin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : undefined;

describeIfSupabase("shared maps integration", () => {
  beforeEach(async () => {
    const { error: deleteLocationsError } = await admin!.from("locations").delete().not("id", "is", null);

    if (deleteLocationsError) {
      throw deleteLocationsError;
    }

    const { error: deleteMapsError } = await admin!.from("maps").delete().not("id", "is", null);

    if (deleteMapsError) {
      throw deleteMapsError;
    }
  });

  it("creates, fetches, and updates a shared map against the local database", async () => {
    const created = await createSharedMap({
      name: "Spring Trip",
      csvText: [
        "title,type,description,latitude,longitude,link,photo",
        "Airport,airport,Arrival,47.45,8.56,https://example.com/airport,https://images.example.com/airport.jpg",
        "Cabin,accommodation,Needs review,,,https://example.com/cabin,",
      ].join("\n"),
    });

    expect(created.shareId).toMatch(/[0-9a-f-]{36}/i);
    expect(created.editSecret).not.toHaveLength(0);

    const publicSharedMap = await fetchSharedMap(created.shareId);
    expect(publicSharedMap).toMatchObject({
      name: "Spring Trip",
      shareId: created.shareId,
      canEdit: false,
    });
    expect(publicSharedMap?.csvText).toContain("Airport,airport,Arrival,47.45,8.56,https://example.com/airport,https://images.example.com/airport.jpg");
    expect(publicSharedMap?.csvText).toContain("Cabin,accommodation,Needs review,,,https://example.com/cabin,");

    const editableSharedMap = await fetchSharedMap(created.shareId, created.editSecret);
    expect(editableSharedMap?.canEdit).toBe(true);

    const updated = await updateSharedMap(created.shareId, {
      name: "Updated Spring Trip",
      editSecret: created.editSecret,
      csvText: [
        "title,type,description,latitude,longitude,link,photo",
        "Updated Airport,airport,New arrival point,48.0,9.0,https://example.com/updated-airport,",
      ].join("\n"),
    });

    expect(updated.lastChangedAt).toBeTruthy();

    const refreshedSharedMap = await fetchSharedMap(created.shareId, created.editSecret);
    expect(refreshedSharedMap).toMatchObject({
      name: "Updated Spring Trip",
      shareId: created.shareId,
      canEdit: true,
    });
    expect(refreshedSharedMap?.csvText).toContain("Updated Airport,airport,New arrival point,48,9,https://example.com/updated-airport,");
    expect(refreshedSharedMap?.csvText).not.toContain("Cabin,accommodation,Needs review");
  });

  it("rejects updates with an invalid edit secret", async () => {
    const created = await createSharedMap({
      name: "Secret Trip",
      csvText: [
        "title,type,description,latitude,longitude,link,photo",
        "Airport,airport,Arrival,47.45,8.56,https://example.com/airport,",
      ].join("\n"),
    });

    await expect(
      updateSharedMap(created.shareId, {
        name: "Should Fail",
        editSecret: "wrong-secret",
        csvText: [
          "title,type,description,latitude,longitude,link,photo",
          "Airport,airport,Arrival,47.45,8.56,https://example.com/airport,",
        ].join("\n"),
      }),
    ).rejects.toThrow("Invalid edit secret.");
  });
});

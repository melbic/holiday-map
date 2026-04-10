import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

test.skip(!supabaseUrl || !secretKey, "requires local Supabase env");

test.beforeEach(async () => {
  const admin = createClient(supabaseUrl!, secretKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: deleteLocationsError } = await admin.from("locations").delete().not("id", "is", null);

  if (deleteLocationsError) {
    throw deleteLocationsError;
  }

  const { error: deleteMapsError } = await admin.from("maps").delete().not("id", "is", null);

  if (deleteMapsError) {
    throw deleteMapsError;
  }
});

test("creates and updates share links against local Supabase", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.goto("/");

  await page.locator("#csv-upload").setInputFiles({
    name: "locations.csv",
    mimeType: "text/csv",
    buffer: Buffer.from([
      "title,type,description,latitude,longitude,link,photo",
      "Airport,airport,Main arrival point,47.45,8.56,https://example.com/airport,https://images.example.com/airport.jpg",
    ].join("\n")),
  });

  await expect(page.locator("#share-map")).toBeEnabled();
  await page.locator("#share-map").click();
  await page.locator("#share-map-name").fill("Live Shared Trip");
  await page.locator("#share-map-submit").click();

  await expect(page.locator("#share-map-results")).toBeVisible();
  await expect(page.locator("#share-map-status")).toContainText("Created public and private share links.");
  await expect(page.locator("#share-public-url")).not.toHaveValue("");
  await expect(page.locator("#share-edit-url")).not.toHaveValue("");

  const publicUrl = await page.locator("#share-public-url").inputValue();
  const editUrl = await page.locator("#share-edit-url").inputValue();

  expect(publicUrl).toContain("/map/");
  expect(editUrl).toContain("?edit=");

  await page.goto(publicUrl);
  await expect(page.locator("#mapped-list")).toContainText("Airport");
  await expect(page.locator("#update-shared-map")).toBeHidden();
  await expect(page.locator("#clear-csv")).toBeHidden();

  await page.goto(editUrl);
  await expect(page.locator("#update-shared-map")).toBeVisible();

  await page.locator("#csv-upload").setInputFiles({
    name: "updated-locations.csv",
    mimeType: "text/csv",
    buffer: Buffer.from([
      "title,type,description,latitude,longitude,link,photo",
      "Updated Airport,airport,Updated arrival point,48.1,9.2,https://example.com/updated-airport,",
    ].join("\n")),
  });

  await expect(page.locator("#mapped-list")).toContainText("Updated Airport");
  await page.locator("#update-shared-map").click();
  await expect(page.locator("#storage-status")).toContainText("Updated shared map.");

  await page.goto(publicUrl);
  await expect(page.locator("#mapped-list")).toContainText("Updated Airport");
  await expect(page.locator(".location-title")).toHaveCount(1);
  await expect(page.locator(".location-title")).toHaveText("Updated Airport");
});

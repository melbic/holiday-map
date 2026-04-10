import { expect, test } from "@playwright/test";

const csvText = [
  "title,type,description,latitude,longitude,link,photo",
  "Airport,airport,Main arrival point,47.45,8.56,https://example.com/airport,https://images.example.com/airport.jpg",
].join("\n");

test("creates public and edit share links from a local CSV", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.route("**/api/share-map", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        shareId: "share-123",
        publicUrl: "https://holiday-map.example/map/share-123",
        editUrl: "https://holiday-map.example/map/share-123?edit=secret-456",
        lastChangedAt: "2026-04-10T00:00:00.000Z",
      }),
    });
  });

  await page.goto("/");

  await expect(page.locator("#share-map")).toBeDisabled();

  await page.locator("#csv-upload").setInputFiles({
    name: "locations.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csvText),
  });

  await expect(page.locator("#share-map")).toBeEnabled();
  await page.locator("#share-map").click();

  await expect(page.locator("#share-map-panel")).toBeVisible();
  await page.locator("#share-map-name").fill("Spring Trip");
  await page.locator("#share-map-submit").click();

  await expect(page.locator("#share-map-results")).toBeVisible();
  await expect(page.locator("#share-public-url")).toHaveValue("https://holiday-map.example/map/share-123");
  await expect(page.locator("#share-edit-url")).toHaveValue(
    "https://holiday-map.example/map/share-123?edit=secret-456",
  );
  await expect(page.locator("#share-map-status")).toContainText("Created public and private share links.");
});

import { expect, test } from "@playwright/test";

const csvText = [
  "title,type,description,latitude,longitude,link,photo",
  "Airport,airport,Main arrival point,47.45,8.56,https://example.com/airport,https://images.example.com/airport.jpg",
].join("\n");

test("creates public and edit share links from a local CSV", async ({ page, context, browserName }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test.skip(browserName !== "chromium", "Clipboard permission assertions are only enabled in Chromium.");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.route("**/api/share-map", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
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
  await expect(page.locator("#share-map-close")).toBeVisible();
  await expect(page.locator("#share-map-cancel")).toHaveCount(0);
  await expect(page.locator("#share-map-results")).toBeHidden();
  await page.locator("#share-map-name").fill("Spring Trip");

  const submitButton = page.locator("#share-map-submit");
  await submitButton.click();
  await expect(submitButton).toContainText("Creating share links...");

  await expect(page.locator("#share-map-results")).toBeVisible();
  await expect(page.locator("#share-map-submit")).toBeHidden();
  await expect(page.locator("#share-public-url")).toHaveValue("https://holiday-map.example/map/share-123");
  await expect(page.locator("#share-edit-url")).toHaveValue(
    "https://holiday-map.example/map/share-123?edit=secret-456",
  );
  await expect(page.locator("#share-map-name")).toHaveValue("Spring Trip");
  await expect(page.locator("#share-map-name")).toHaveJSProperty("readOnly", true);
  await expect(page.locator("#share-map-status")).toContainText("Share links created.");

  await page.locator("#share-map-copy-public").click();
  await expect(page.locator("#share-map-status")).toContainText("Copied the public link.");
  await expect(page.evaluate(() => navigator.clipboard.readText())).resolves.toBe(
    "https://holiday-map.example/map/share-123",
  );
});

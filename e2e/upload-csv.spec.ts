import { expect, test } from "@playwright/test";

const csvText = [
  "title,type,description,latitude,longitude,link",
  "Airport,airport,Main arrival point,47.45,8.56,https://example.com/airport",
  "Cabin,accommodation,Needs review,,,https://example.com/cabin",
].join("\n");

test("uploads a CSV and renders map sidebar data", async ({ page }) => {
  await page.goto("/holiday-map/");
  await page.waitForURL("**/holiday-map/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await expect(page.getByText("Upload a CSV to keep your private holiday data local to this browser.")).toBeVisible();
  await expect(page.locator("#pin-count")).toHaveText("0 pins");

  await page.locator("#csv-upload").setInputFiles({
    name: "locations.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csvText),
  });

  await expect(page.locator("#pin-count")).toHaveText("1 pin");
  await expect(page.locator("#mapped-list")).toContainText("Airport");
  await expect(page.locator("#review-panel")).toBeVisible();
  await expect(page.locator("#review-count")).toHaveText("1");
  await expect(page.locator("#review-list")).toContainText("Cabin");
  await expect(page.locator("#storage-status")).toContainText(
    "Loaded locations.csv and saved it in this browser.",
  );
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(1);

  await page.reload();

  await expect(page.locator("#pin-count")).toHaveText("1 pin");
  await expect(page.locator("#mapped-list")).toContainText("Airport");
  await expect(page.locator("#storage-status")).toContainText("Loaded CSV from local storage.");
});

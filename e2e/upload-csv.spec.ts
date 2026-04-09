import { expect, test } from "@playwright/test";

const csvText = [
  "title,type,description,latitude,longitude,link,photo",
  "Airport,airport,Main arrival point,47.45,8.56,https://example.com/airport,https://images.example.com/airport.jpg",
  "Cabin,accommodation,Needs review,,,https://example.com/cabin,https://images.example.com/cabin.jpg",
].join("\n");

test("uploads a CSV and renders map sidebar data", async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem("e2e-storage-cleared")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("e2e-storage-cleared", "true");
    }
  });

  await page.goto("/");
  await page.waitForURL("**/");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(page.locator("#download-csv")).toBeDisabled();

  await expect(page.getByText("Upload a CSV to keep your private holiday data local to this browser.")).toBeVisible();
  await expect(page.locator("#pin-count")).toHaveText("0 pins");

  await page.locator("#csv-upload").setInputFiles({
    name: "locations.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csvText),
  });

  await expect(page.locator("#pin-count")).toHaveText("1 pin");
  await expect(page.locator("#mapped-list")).toContainText("Airport");
  await expect(page.locator("#mapped-list .location-thumb-image")).toHaveAttribute(
    "src",
    "https://images.example.com/airport.jpg",
  );
  await expect(page.locator("#review-panel")).toBeVisible();
  await expect(page.locator("#review-count")).toHaveText("1");
  await expect(page.locator("#review-list")).toContainText("Cabin");
  await expect(page.locator("#review-list .location-thumb-image")).toHaveAttribute(
    "src",
    "https://images.example.com/cabin.jpg",
  );
  await expect(page.locator("#storage-status")).toContainText(
    "Loaded locations.csv and saved it in this browser.",
  );
  await expect(page.locator("#download-csv")).toBeEnabled();
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(1);

  const downloadPromise = page.waitForEvent("download");
  await page.locator("#download-csv").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^holiday-map-\d{4}-\d{2}-\d{2}\.csv$/);

  await page.locator("#mapped-list [data-location-index='0']").click();
  await expect(page.locator(".leaflet-popup-content .popup-photo")).toHaveAttribute(
    "src",
    "https://images.example.com/airport.jpg",
  );

  await page.reload();

  await expect(page.locator("#pin-count")).toHaveText("1 pin");
  await expect(page.locator("#mapped-list")).toContainText("Airport");
  await expect(page.locator("#storage-status")).toContainText("Loaded CSV from local storage.");
});

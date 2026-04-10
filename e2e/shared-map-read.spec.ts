import { expect, test } from "@playwright/test";

test("loads a shared map in public read-only mode", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.route("**/api/share-map/share-123", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        name: "Shared Trip",
        shareId: "share-123",
        lastChangedAt: "2026-04-10T00:00:00.000Z",
        csvText: [
          "title,type,description,latitude,longitude,link,photo",
          "Shared Airport,airport,Main arrival point,47.45,8.56,https://example.com/airport,https://images.example.com/airport.jpg",
        ].join("\n"),
        canEdit: false,
      }),
    });
  });

  await page.goto("/map/share-123");

  await expect(page.locator("#mapped-list")).toContainText("Shared Airport");
  await expect(page.locator("#download-csv")).toBeEnabled();
  await expect(page.locator("#share-map")).toBeHidden();
  await expect(page.locator("#clear-csv")).toBeHidden();
  await expect(page.locator("#link-import-form")).toBeHidden();
  await expect(page.locator("#storage-status")).toContainText("Loaded shared map.");
});

test("keeps shared map read-only when edit token is invalid", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.route("**/api/share-map/share-123?edit=wrong-secret", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        name: "Shared Trip",
        shareId: "share-123",
        lastChangedAt: "2026-04-10T00:00:00.000Z",
        csvText: [
          "title,type,description,latitude,longitude,link,photo",
          "Shared Airport,airport,Main arrival point,47.45,8.56,https://example.com/airport,https://images.example.com/airport.jpg",
        ].join("\n"),
        canEdit: false,
      }),
    });
  });

  await page.goto("/map/share-123?edit=wrong-secret");

  await expect(page.locator("#download-csv")).toBeEnabled();
  await expect(page.locator("#update-shared-map")).toBeHidden();
  await expect(page.locator("label[for='csv-upload']")).toBeHidden();
  await expect(page.locator("#clear-csv")).toBeHidden();
  await expect(page.locator(".import-panel")).toBeHidden();
  await expect(page.locator("#storage-status")).toContainText("Loaded shared map.");
});

test("loads a shared map in edit mode and updates it", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  let updateRequestBody = "";

  await page.route("**/api/share-map/share-123?edit=secret-456", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        name: "Editable Trip",
        shareId: "share-123",
        lastChangedAt: "2026-04-10T00:00:00.000Z",
        csvText: [
          "title,type,description,latitude,longitude,link,photo",
          "Shared Airport,airport,Main arrival point,47.45,8.56,https://example.com/airport,https://images.example.com/airport.jpg",
        ].join("\n"),
        canEdit: true,
      }),
    });
  });

  await page.route("**/api/share-map/share-123", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fallback();
      return;
    }

    updateRequestBody = route.request().postData() ?? "";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        lastChangedAt: "2026-04-11T12:34:56.000Z",
      }),
    });
  });

  await page.goto("/map/share-123?edit=secret-456");

  await expect(page.locator("#update-shared-map")).toBeVisible();
  await expect(page.locator("#update-shared-map")).toBeEnabled();
  await expect(page.locator("label[for='csv-upload']")).toBeVisible();
  await expect(page.locator("#clear-csv")).toBeVisible();
  await expect(page.locator(".import-panel")).toBeVisible();
  await expect(page.locator("#storage-status")).toContainText("Loaded shared map in edit mode.");

  await page.locator("#csv-upload").setInputFiles({
    name: "updated.csv",
    mimeType: "text/csv",
    buffer: Buffer.from([
      "title,type,description,latitude,longitude,link,photo",
      "Updated Airport,airport,Main arrival point,47.45,8.56,https://example.com/airport,https://images.example.com/airport.jpg",
    ].join("\n")),
  });

  await expect(page.locator("#mapped-list")).toContainText("Updated Airport");

  await page.locator("#update-shared-map").click();

  await expect(page.locator("#storage-status")).toContainText("Updated shared map.");

  expect(JSON.parse(updateRequestBody)).toEqual({
    name: "Editable Trip",
    csvText: [
      "title,type,description,latitude,longitude,link,photo",
      "Updated Airport,airport,Main arrival point,47.45,8.56,https://example.com/airport,https://images.example.com/airport.jpg",
    ].join("\n"),
    editSecret: "secret-456",
  });
});

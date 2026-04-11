import { expect, test } from "@playwright/test";

test.describe("mobile map UI", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("starts with collapsed list sheet and opens mobile detail sheet from the list", async ({ page }) => {
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

    const mobileListToggle = page.locator("#mobile-list-toggle");

    await expect(mobileListToggle).toContainText("1 pin");
    await expect(mobileListToggle).toBeVisible();
    await expect(mobileListToggle).toBeEnabled();
    await expect(page.locator(".list-panel")).not.toHaveClass(/is-mobile-expanded/);

    await mobileListToggle.click();
    await expect(page.locator(".list-panel")).toHaveClass(/is-mobile-expanded/);

    await page.locator("#mapped-list [data-location-index='0']").click();

    await expect(page.locator("#mobile-detail-panel")).toBeVisible();
    await expect(page.locator("#mobile-detail-title")).toHaveText("Airport");
    await expect(page.locator("#mobile-detail-link")).toHaveAttribute("href", "https://example.com/airport");
    await expect(page.locator(".list-panel")).not.toHaveClass(/is-mobile-expanded/);
  });

  test("opens mobile actions sheet", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto("/");

    await page.locator("#mobile-actions-toggle").click();

    await expect(page.locator("#mobile-actions-panel")).toBeVisible();
    await expect(page.locator("#mobile-add-link")).toBeVisible();
    await expect(page.locator("#mobile-download-csv")).toBeVisible();
    await expect(page.locator("#mobile-clear-csv")).toBeVisible();
  });

  test("keeps download available in read-only shared mobile view", async ({ page }) => {
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
            "Shared Airport,airport,Main arrival point,47.45,8.56,https://example.com/airport,",
          ].join("\n"),
          canEdit: false,
        }),
      });
    });

    await page.goto("/map/share-123");

    await expect(page.locator("#mobile-actions-toggle")).toBeVisible();
    await page.locator("#mobile-actions-toggle").click();

    await expect(page.locator("#mobile-download-csv")).toBeVisible();
    await expect(page.locator("#mobile-download-csv")).toBeEnabled();
    await expect(page.locator("#mobile-upload-csv")).toBeHidden();
    await expect(page.locator("#mobile-add-link")).toBeHidden();
    await expect(page.locator("#mobile-clear-csv")).toBeHidden();
  });
});

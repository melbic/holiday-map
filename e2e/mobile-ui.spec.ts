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

    await expect(page.locator("#mobile-list-toggle")).toContainText("1 pin");
    await expect(page.locator(".list-panel")).not.toHaveClass(/is-mobile-expanded/);

    await page.locator("#mobile-list-toggle").click({ force: true });
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
});

import { expect, test } from "@playwright/test";

test("auto-saves a fully scraped imported link", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.route("**/api/import-link", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        title: "Auto Imported Cabin",
        type: "accommodation",
        description: "A nice cabin by the water.",
        latitude: 69.1,
        longitude: 18.9,
        link: "https://example.com/cabin",
        photo: "https://images.example.com/cabin.jpg",
        status: "complete",
        notes: ["Imported automatically."],
      }),
    });
  });

  await page.goto("/");

  await page.locator("#link-import-url").fill("https://example.com/cabin");
  await page.locator("#link-import-form").getByRole("button", { name: "Import link" }).click();

  await expect(page.locator("#mapped-list")).toContainText("Auto Imported Cabin");
  await expect(page.locator("#pin-count")).toHaveText("1 pin");
  await expect(page.locator("#link-import-status")).toContainText("Imported Auto Imported Cabin.");
  await expect(page.locator("#link-review-panel")).toHaveAttribute("hidden", "");
});

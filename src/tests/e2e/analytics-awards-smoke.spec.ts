import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures", "e2e-fixture.json"), "utf-8"));

test.beforeEach(async ({ page }) => {
  await page.addInitScript((data) => {
    try {
      Object.defineProperty(window, "indexedDB", {
        get: () => undefined,
        configurable: true,
      });
    } catch {
      try {
        delete (window as any).indexedDB;
      } catch {
        (window as any).indexedDB = undefined;
      }
    }
    localStorage.setItem("gallop_game_state_fallback", JSON.stringify(data));
  }, fixture);
});

test.describe("Analytics page smoke tests", () => {
  test("analytics overview renders without crashing", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Gallop/i);
  });

  test("analytics page has tab navigation", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");
    const tabs = page.locator("[role='tab']");
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Awards page smoke tests", () => {
  test("awards tab renders without crashing", async ({ page }) => {
    await page.goto("/honors");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Gallop/i);
  });
});

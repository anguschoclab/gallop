import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { STORE_STATE_VERSION } from "../../game/store/stateVersion";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures", "e2e-fixture.json"), "utf-8"));
// Seeded saves must claim the current schema version — a stale version is
// treated as incompatible and wiped on rehydrate.
fixture.meta.storeVersion = STORE_STATE_VERSION;

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

/**
 * Visual regression baselines for core screens, seeded from the shared e2e
 * fixture so every render reflects real state. Regenerate deliberately with:
 *   bunx playwright test visual --update-snapshots
 */
const DESKTOP_ROUTES = [
  { name: "dashboard", path: "/" },
  { name: "stable", path: "/stable" },
  { name: "races", path: "/races" },
  { name: "market", path: "/market" },
  { name: "analytics", path: "/analytics" },
  { name: "calendar", path: "/calendar" },
];

const NARROW_ROUTES = [
  { name: "dashboard", path: "/" },
  { name: "stable", path: "/stable" },
];

test.describe("visual baselines — desktop", () => {
  for (const route of DESKTOP_ROUTES) {
    test(`${route.name} matches baseline`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot(`${route.name}-desktop.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

test.describe("visual baselines — narrow viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const route of NARROW_ROUTES) {
    test(`${route.name} matches baseline`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveScreenshot(`${route.name}-narrow.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.01,
      });
    });
  }
});

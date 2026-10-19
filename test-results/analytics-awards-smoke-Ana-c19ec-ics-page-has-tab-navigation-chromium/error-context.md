# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: analytics-awards-smoke.spec.ts >> Analytics page smoke tests >> analytics page has tab navigation
- Location: src/tests/e2e/analytics-awards-smoke.spec.ts:39:3

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - paragraph [ref=e5]: Loading...
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { readFileSync } from "fs";
  3  | import { join, dirname } from "path";
  4  | import { fileURLToPath } from "url";
  5  |
  6  | import { STORE_STATE_VERSION } from "@/platform/game/store/stateVersion";
  7  |
  8  | const __dirname = dirname(fileURLToPath(import.meta.url));
  9  | const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures", "e2e-fixture.json"), "utf-8"));
  10 | // Seeded saves must claim the current schema version — a stale version is
  11 | // treated as incompatible and wiped on rehydrate.
  12 | fixture.meta.storeVersion = STORE_STATE_VERSION;
  13 |
  14 | test.beforeEach(async ({ page }) => {
  15 |   await page.addInitScript((data) => {
  16 |     try {
  17 |       Object.defineProperty(window, "indexedDB", {
  18 |         get: () => undefined,
  19 |         configurable: true,
  20 |       });
  21 |     } catch {
  22 |       try {
  23 |         delete (window as any).indexedDB;
  24 |       } catch {
  25 |         (window as any).indexedDB = undefined;
  26 |       }
  27 |     }
  28 |     localStorage.setItem("gallop_game_state_fallback", JSON.stringify(data));
  29 |   }, fixture);
  30 | });
  31 |
  32 | test.describe("Analytics page smoke tests", () => {
  33 |   test("analytics overview renders without crashing", async ({ page }) => {
  34 |     await page.goto("/analytics");
  35 |     await page.waitForLoadState("networkidle");
  36 |     await expect(page).toHaveTitle(/Gallop/i);
  37 |   });
  38 |
  39 |   test("analytics page has tab navigation", async ({ page }) => {
  40 |     await page.goto("/analytics");
  41 |     await page.waitForLoadState("networkidle");
  42 |     const tabs = page.locator("[role='tab']");
  43 |     const count = await tabs.count();
> 44 |     expect(count).toBeGreaterThan(0);
     |                   ^ Error: expect(received).toBeGreaterThan(expected)
  45 |   });
  46 | });
  47 |
  48 | test.describe("Awards page smoke tests", () => {
  49 |   test("awards tab renders without crashing", async ({ page }) => {
  50 |     await page.goto("/honors");
  51 |     await page.waitForLoadState("networkidle");
  52 |     await expect(page).toHaveTitle(/Gallop/i);
  53 |   });
  54 | });
  55 |
```
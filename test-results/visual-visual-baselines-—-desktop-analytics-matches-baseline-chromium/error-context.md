# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> visual baselines — desktop >> analytics matches baseline
- Location: src/tests/e2e/visual.spec.ts:53:5

# Error details

```
Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/analytics-desktop-chromium-linux.png, writing actual.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - link "Skip to content" [ref=e3] [cursor=pointer]:
      - /url: "#main-content"
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - heading "Gallop" [level=1] [ref=e6]
        - paragraph [ref=e7]: Jan 2, 2026
      - generic [ref=e8]:
        - generic [ref=e9]:
          - button "Headquarters" [expanded] [ref=e10]
          - region "Headquarters" [ref=e14]:
            - link "Dashboard" [ref=e16] [cursor=pointer]:
              - /url: /
            - link "Inbox" [ref=e22] [cursor=pointer]:
              - /url: /inbox
            - link "Briefing" [ref=e28] [cursor=pointer]:
              - /url: /briefing
            - link "Gazette" [ref=e34] [cursor=pointer]:
              - /url: /gazette
            - link "Recap" [ref=e40] [cursor=pointer]:
              - /url: /recap
            - link "Analytics" [ref=e46] [cursor=pointer]:
              - /url: /analytics
            - link "Finances" [ref=e52] [cursor=pointer]:
              - /url: /financial-report
            - link "Bookmarks" [ref=e57] [cursor=pointer]:
              - /url: /bookmarks
        - button "My Stable" [ref=e62]
        - button "The World" [ref=e67]
        - button "Configuration" [ref=e72]
      - generic [ref=e76]:
        - generic [ref=e77]:
          - paragraph [ref=e78]: Cash
          - paragraph [ref=e79]: $100,000
          - paragraph [ref=e80]: 2888 horses
          - generic [ref=e81]:
            - button "Advance 1 day" [ref=e82]
            - button "Advance 1 week" [ref=e83]: 7d
            - button "Advance 1 month" [ref=e84]: 30d
            - button "AutoSim settings" [ref=e85]
          - generic [ref=e86]:
            - button "Skip to next auction" [ref=e87]: Next Auction
            - button "Skip to next race" [ref=e88]: Next Race
        - button "Start new game" [ref=e89]
    - main [ref=e90]:
      - generic [ref=e92]:
        - generic [ref=e93]:
          - heading "Analytics" [level=1] [ref=e94]
          - paragraph [ref=e95]: Stable performance metrics and trends
        - generic [ref=e96]:
          - tablist [ref=e97]:
            - tab "Overview" [selected] [ref=e98]
            - tab "Stable" [ref=e101]
            - tab "Racing" [ref=e107]
            - tab "Finance" [ref=e110]
            - tab "Breeding" [ref=e113]
            - tab "Rival Intel" [ref=e117]
          - tabpanel "Overview" [ref=e121]:
            - generic [ref=e122]:
              - generic [ref=e123]: Industry Metrics
              - paragraph [ref=e126]: Industry economic data will be available once NPC operations begin.
            - generic [ref=e127]:
              - generic [ref=e128]:
                - generic [ref=e129]:
                  - heading "Overview" [level=2] [ref=e130]
                  - paragraph [ref=e131]: Stable performance at a glance — drill into any tile for detail.
                - generic [ref=e132]: Day 1
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - generic [ref=e135]:
                    - generic [ref=e136]:
                      - heading "Cash on hand" [level=3] [ref=e138]
                      - generic [ref=e139]: $100,000
                    - generic [ref=e140]: 0.0%
                  - img [ref=e147]:
                    - generic [ref=e150]: D1
                    - generic [ref=e155]:
                      - generic [ref=e156]: $0
                      - generic [ref=e158]: $25K
                      - generic [ref=e160]: $50K
                      - generic [ref=e162]: $75K
                      - generic [ref=e164]: $100K
                  - generic [ref=e169]: Last 90 days
                - generic [ref=e170]:
                  - generic [ref=e172]:
                    - heading "Win rate" [level=3] [ref=e174]
                    - generic [ref=e175]: 0.0%
                  - list [ref=e180]:
                    - listitem [ref=e181]:
                      - generic [ref=e183]: W
                      - generic [ref=e184]: "0"
                    - listitem [ref=e185]:
                      - generic [ref=e187]: P
                      - generic [ref=e188]: "0"
                    - listitem [ref=e189]:
                      - generic [ref=e191]: S
                      - generic [ref=e192]: "0"
                    - listitem [ref=e193]:
                      - generic [ref=e195]: Unplaced
                      - generic [ref=e196]: "0"
                  - generic [ref=e197]: 0 runs
                - generic [ref=e198]:
                  - generic [ref=e200]:
                    - heading "ITM rate" [level=3] [ref=e202]
                    - generic [ref=e203]: 0%
                  - generic [ref=e209]: Top-3 finishes
                - generic [ref=e210]:
                  - generic [ref=e212]:
                    - heading "Active horses" [level=3] [ref=e214]
                    - generic [ref=e215]: "4"
                  - list [ref=e218]:
                    - listitem [ref=e219]:
                      - generic [ref=e220]:
                        - generic [ref=e221]: 60+
                        - generic [ref=e222]: "4"
                    - listitem [ref=e225]:
                      - generic [ref=e226]:
                        - generic [ref=e227]: 40–59
                        - generic [ref=e228]: "0"
                    - listitem [ref=e230]:
                      - generic [ref=e231]:
                        - generic [ref=e232]: 0–39
                        - generic [ref=e233]: "0"
                  - generic [ref=e235]: 4 owned
                - generic [ref=e236]:
                  - generic [ref=e238]:
                    - heading "Earnings vs spend" [level=3] [ref=e240]
                    - generic [ref=e241]: $0 in · $0 out
                  - img [ref=e246]:
                    - generic [ref=e250]:
                      - generic [ref=e251]: D-69
                      - generic [ref=e253]: D-55
                      - generic [ref=e255]: D-41
                      - generic [ref=e257]: D-27
                      - generic [ref=e259]: D-13
                      - generic [ref=e261]: D-6
                      - generic [ref=e263]: D1
                    - generic [ref=e265]: $4
                  - generic [ref=e269]: Last 12 weeks
                - generic [ref=e270]:
                  - generic [ref=e272]:
                    - heading "Top sire" [level=3] [ref=e274]
                    - generic [ref=e275]: —
                  - generic [ref=e276]: Trend pending
                  - generic [ref=e279]: No data yet
                - generic [ref=e280]:
                  - heading "Top expenses · 30d" [level=3] [ref=e284]
                  - generic [ref=e285]: No expenses recorded
                  - generic [ref=e288]: By subcategory
                - generic [ref=e289]:
                  - heading "Horse ROI · top 5" [level=3] [ref=e293]
                  - list [ref=e296]:
                    - listitem [ref=e297]:
                      - generic [ref=e298]:
                        - generic [ref=e299]: Bandit of Lucky
                        - generic [ref=e300]: $0
                    - listitem [ref=e302]:
                      - generic [ref=e303]:
                        - generic [ref=e304]: Northern Journey
                        - generic [ref=e305]: $0
                    - listitem [ref=e307]:
                      - generic [ref=e308]:
                        - generic [ref=e309]: The Northern Hero
                        - generic [ref=e310]: $0
                    - listitem [ref=e312]:
                      - generic [ref=e313]:
                        - generic [ref=e314]: Golden Rider
                        - generic [ref=e315]: $0
                  - generic [ref=e317]: Career earnings − tracked expenses
  - region "Notifications alt+T"
  - generic [aria-hidden] [ref=e318]: $4
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
  32 | /**
  33 |  * Visual regression baselines for core screens, seeded from the shared e2e
  34 |  * fixture so every render reflects real state. Regenerate deliberately with:
  35 |  *   bunx playwright test visual --update-snapshots
  36 |  */
  37 | const DESKTOP_ROUTES = [
  38 |   { name: "dashboard", path: "/" },
  39 |   { name: "stable", path: "/stable" },
  40 |   { name: "races", path: "/races" },
  41 |   { name: "market", path: "/market" },
  42 |   { name: "analytics", path: "/analytics" },
  43 |   { name: "calendar", path: "/calendar" },
  44 | ];
  45 |
  46 | const NARROW_ROUTES = [
  47 |   { name: "dashboard", path: "/" },
  48 |   { name: "stable", path: "/stable" },
  49 | ];
  50 |
  51 | test.describe("visual baselines — desktop", () => {
  52 |   for (const route of DESKTOP_ROUTES) {
  53 |     test(`${route.name} matches baseline`, async ({ page }) => {
  54 |       await page.goto(route.path);
  55 |       await page.waitForLoadState("networkidle");
> 56 |       await expect(page).toHaveScreenshot(`${route.name}-desktop.png`, {
     |       ^ Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/analytics-desktop-chromium-linux.png, writing actual.
  57 |         animations: "disabled",
  58 |         maxDiffPixelRatio: 0.01,
  59 |       });
  60 |     });
  61 |   }
  62 | });
  63 |
  64 | test.describe("visual baselines — narrow viewport", () => {
  65 |   test.use({ viewport: { width: 390, height: 844 } });
  66 |   for (const route of NARROW_ROUTES) {
  67 |     test(`${route.name} matches baseline`, async ({ page }) => {
  68 |       await page.goto(route.path);
  69 |       await page.waitForLoadState("networkidle");
  70 |       await expect(page).toHaveScreenshot(`${route.name}-narrow.png`, {
  71 |         animations: "disabled",
  72 |         maxDiffPixelRatio: 0.01,
  73 |       });
  74 |     });
  75 |   }
  76 | });
  77 |
```
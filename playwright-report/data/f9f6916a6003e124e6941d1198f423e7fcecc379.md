# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> visual baselines — narrow viewport >> stable matches baseline
- Location: src/tests/e2e/visual.spec.ts:67:5

# Error details

```
Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/stable-narrow-chromium-linux.png, writing actual.
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
            - link "Finances" [ref=e51] [cursor=pointer]:
              - /url: /financial-report
            - link "Bookmarks" [ref=e56] [cursor=pointer]:
              - /url: /bookmarks
        - generic [ref=e60]:
          - button "My Stable" [expanded] [ref=e61]
          - region [ref=e65]:
            - link "Stables" [ref=e67] [cursor=pointer]:
              - /url: /stable
            - link "Horses" [ref=e77] [cursor=pointer]:
              - /url: /horse-gallery
            - link "Breeding" [ref=e85] [cursor=pointer]:
              - /url: /breeding
            - link "Broodmares" [ref=e90] [cursor=pointer]:
              - /url: /broodmares
            - link "Syndicate Stakes" [ref=e95] [cursor=pointer]:
              - /url: /syndicate-stakes
            - link "Staff" [ref=e101] [cursor=pointer]:
              - /url: /staff
            - link "Jockeys" [ref=e109] [cursor=pointer]:
              - /url: /jockeys
            - link "Race Advisor" [ref=e115] [cursor=pointer]:
              - /url: /race-advisor
            - link "Stable Campaign" [ref=e121] [cursor=pointer]:
              - /url: /stableCampaign
            - link "Strategy Journal" [ref=e127] [cursor=pointer]:
              - /url: /strategyJournal
            - link "Daily Plans" [ref=e133] [cursor=pointer]:
              - /url: /dailyPlans
            - link "Facilities" [ref=e139] [cursor=pointer]:
              - /url: /facilities
            - link "Vet Report" [ref=e146] [cursor=pointer]:
              - /url: /vet
            - link "Stewards" [ref=e151] [cursor=pointer]:
              - /url: /stewards
            - link "Replays" [ref=e158] [cursor=pointer]:
              - /url: /replays
            - link "Honors" [ref=e163] [cursor=pointer]:
              - /url: /honors
            - link "Hall of Fame" [ref=e169] [cursor=pointer]:
              - /url: /hall-of-fame
            - link "Awards" [ref=e178] [cursor=pointer]:
              - /url: /awards
        - button "The World" [ref=e184]
        - button "Configuration" [ref=e189]
      - generic [ref=e193]:
        - generic [ref=e194]:
          - paragraph [ref=e195]: Cash
          - paragraph [ref=e196]: $100,000
          - paragraph [ref=e197]: 2888 horses
          - generic [ref=e198]:
            - button "Advance 1 day" [ref=e199]
            - button "Advance 1 week" [ref=e200]: 7d
            - button "Advance 1 month" [ref=e201]: 30d
            - button "AutoSim settings" [ref=e202]
          - generic [ref=e203]:
            - button "Skip to next auction" [ref=e204]: Next Auction
            - button "Skip to next race" [ref=e205]: Next Race
        - button "Start new game" [ref=e206]
    - main [ref=e207]:
      - generic [ref=e209]:
        - generic [ref=e210]:
          - generic [ref=e211]:
            - generic [ref=e212]: Stability Division
            - heading "Our Horses" [level=1] [ref=e218]
            - generic [ref=e219]:
              - generic [ref=e220]: "Active: 4"
              - generic [ref=e221]: "Retired: 0"
              - generic [ref=e222]: "Archived: 0"
          - generic [ref=e223]:
            - button "Auto-Register 4" [ref=e224]:
              - text: Auto-Register
              - generic [ref=e225]: "4"
            - link [ref=e226] [cursor=pointer]:
              - /url: /scheduler
              - button "Campaign Logs" [ref=e227]
            - link [ref=e228] [cursor=pointer]:
              - /url: /stallions
              - button "Sire Watch" [ref=e229]
        - generic [ref=e230]:
          - generic [ref=e231]:
            - tablist [ref=e232]:
              - tab "All Horses" [selected] [ref=e233]
              - tab "Rival Archives" [ref=e234]
            - generic [ref=e235]:
              - button [ref=e236]
              - button [ref=e237]
          - tabpanel "All Horses" [ref=e238]:
            - generic [ref=e239]:
              - generic [ref=e240]: Pace
              - generic [ref=e244]:
                - button "All" [ref=e245]
                - button "Front" [ref=e246]
                - button "Mid" [ref=e247]
                - button "Off" [ref=e248]
              - combobox [ref=e249]:
                - generic: Any Trip
              - combobox [ref=e252]:
                - generic: Any Surface
            - generic [ref=e255]:
              - generic [ref=e256]:
                - generic [ref=e257]:
                  - button "Active [04]" [pressed] [ref=e258]:
                    - text: Active
                    - generic [ref=e261]: "[04]"
                  - button "Retired [00]" [ref=e262]:
                    - text: Retired
                    - generic [ref=e265]: "[00]"
                  - button "Archived [00]" [ref=e266]:
                    - text: Archived
                    - generic [ref=e270]: "[00]"
                  - button "Global [04]" [ref=e271]:
                    - text: Global
                    - generic [ref=e277]: "[04]"
                - generic [ref=e278]:
                  - textbox "Search horses..." [ref=e283]
                  - button "Filter roster" [ref=e284]
              - table [ref=e286]:
                - rowgroup [ref=e287]:
                  - row [ref=e288]:
                    - columnheader [ref=e289]
                    - columnheader "#" [ref=e290]
                    - columnheader "Horse" [ref=e291]
                    - columnheader "Age" [ref=e292]
                    - columnheader "OVR" [ref=e293]
                    - columnheader "Condition" [ref=e294]
                    - columnheader "Peaking" [ref=e295]
                    - columnheader "Actions" [ref=e296]
                - rowgroup [ref=e297]:
                  - row [ref=e298]:
                    - cell [ref=e299]:
                      - checkbox "Select Northern Journey to compare" [ref=e300]
                    - cell "01" [ref=e301]
                    - cell [ref=e302]:
                      - link "Northern Journey" [ref=e303] [cursor=pointer]:
                        - /url: /stable/fac2cbae-a8a4-4f44-861d-e90682f98cc6
                    - cell "3Y" [ref=e307]
                    - cell "40" [ref=e308]
                    - cell "E:100%" [ref=e310]
                    - cell "PEAK" [ref=e315]
                    - cell [ref=e317]:
                      - generic [ref=e318]:
                        - button "Add bookmark" [ref=e319]
                        - link [ref=e322] [cursor=pointer]:
                          - /url: /stable/fac2cbae-a8a4-4f44-861d-e90682f98cc6#training
                          - button "Open training room for Northern Journey" [ref=e323]
                        - link [ref=e324] [cursor=pointer]:
                          - /url: /scheduler
                          - button "Open mission plan for Northern Journey" [ref=e325]
                        - link [ref=e326] [cursor=pointer]:
                          - /url: /stable/fac2cbae-a8a4-4f44-861d-e90682f98cc6
                          - button "View Record" [ref=e327]
                  - row [ref=e328]:
                    - cell [ref=e329]:
                      - checkbox "Select The Northern Hero to compare" [ref=e330]
                    - cell "02" [ref=e331]
                    - cell [ref=e332]:
                      - link "The Northern Hero" [ref=e333] [cursor=pointer]:
                        - /url: /stable/7f4627c9-1536-4e00-bf59-c2b384cf9168
                    - cell "4Y" [ref=e337]
                    - cell "40" [ref=e338]
                    - cell "E:100%" [ref=e340]
                    - cell "PEAK" [ref=e345]
                    - cell [ref=e347]:
                      - generic [ref=e348]:
                        - button "Add bookmark" [ref=e349]
                        - link [ref=e352] [cursor=pointer]:
                          - /url: /stable/7f4627c9-1536-4e00-bf59-c2b384cf9168#training
                          - button "Open training room for The Northern Hero" [ref=e353]
                        - link [ref=e354] [cursor=pointer]:
                          - /url: /scheduler
                          - button "Open mission plan for The Northern Hero" [ref=e355]
                        - link [ref=e356] [cursor=pointer]:
                          - /url: /stable/7f4627c9-1536-4e00-bf59-c2b384cf9168
                          - button "View Record" [ref=e357]
                  - row [ref=e358]:
                    - cell [ref=e359]:
                      - checkbox "Select Bandit of Lucky to compare" [ref=e360]
                    - cell "03" [ref=e361]
                    - cell [ref=e362]:
                      - link "Bandit of Lucky" [ref=e363] [cursor=pointer]:
                        - /url: /stable/55136b2b-e1d0-4654-a822-ce2b7194d293
                    - cell "4Y" [ref=e367]
                    - cell "39" [ref=e368]
                    - cell "E:100%" [ref=e370]
                    - cell "PEAK" [ref=e375]
                    - cell [ref=e377]:
                      - generic [ref=e378]:
                        - button "Add bookmark" [ref=e379]
                        - link [ref=e382] [cursor=pointer]:
                          - /url: /stable/55136b2b-e1d0-4654-a822-ce2b7194d293#training
                          - button "Open training room for Bandit of Lucky" [ref=e383]
                        - link [ref=e384] [cursor=pointer]:
                          - /url: /scheduler
                          - button "Open mission plan for Bandit of Lucky" [ref=e385]
                        - link [ref=e386] [cursor=pointer]:
                          - /url: /stable/55136b2b-e1d0-4654-a822-ce2b7194d293
                          - button "View Record" [ref=e387]
                  - row [ref=e388]:
                    - cell [ref=e389]:
                      - checkbox "Select Golden Rider to compare" [ref=e390]
                    - cell "04" [ref=e391]
                    - cell [ref=e392]:
                      - link "Golden Rider" [ref=e393] [cursor=pointer]:
                        - /url: /stable/f8733b18-3681-42d5-8ead-1a2e2956ea29
                    - cell "4Y" [ref=e397]
                    - cell "39" [ref=e398]
                    - cell "E:100%" [ref=e400]
                    - cell "PEAK" [ref=e405]
                    - cell [ref=e407]:
                      - generic [ref=e408]:
                        - button "Add bookmark" [ref=e409]
                        - link [ref=e412] [cursor=pointer]:
                          - /url: /stable/f8733b18-3681-42d5-8ead-1a2e2956ea29#training
                          - button "Open training room for Golden Rider" [ref=e413]
                        - link [ref=e414] [cursor=pointer]:
                          - /url: /scheduler
                          - button "Open mission plan for Golden Rider" [ref=e415]
                        - link [ref=e416] [cursor=pointer]:
                          - /url: /stable/f8733b18-3681-42d5-8ead-1a2e2956ea29
                          - button "View Record" [ref=e417]
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
  56 |       await expect(page).toHaveScreenshot(`${route.name}-desktop.png`, {
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
> 70 |       await expect(page).toHaveScreenshot(`${route.name}-narrow.png`, {
     |       ^ Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/stable-narrow-chromium-linux.png, writing actual.
  71 |         animations: "disabled",
  72 |         maxDiffPixelRatio: 0.01,
  73 |       });
  74 |     });
  75 |   }
  76 | });
  77 |
```
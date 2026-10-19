# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> visual baselines — desktop >> market matches baseline
- Location: src/tests/e2e/visual.spec.ts:53:5

# Error details

```
Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/market-desktop-chromium-linux.png, writing actual.
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
        - button "My Stable" [ref=e61]
        - generic [ref=e65]:
          - button "The World" [expanded] [ref=e66]
          - region [ref=e70]:
            - link "Racing" [ref=e72] [cursor=pointer]:
              - /url: /racing
            - link "Calendar" [ref=e77] [cursor=pointer]:
              - /url: /calendar
            - link "Records" [ref=e82] [cursor=pointer]:
              - /url: /records
            - link "Rankings History" [ref=e87] [cursor=pointer]:
              - /url: /rankings-history
            - link "Stable Rankings" [ref=e92] [cursor=pointer]:
              - /url: /stable-rankings
            - link "Almanac" [ref=e99] [cursor=pointer]:
              - /url: /almanac
            - link "Course Histories" [ref=e104] [cursor=pointer]:
              - /url: /track-history
            - link "Market" [ref=e109] [cursor=pointer]:
              - /url: /market
            - link "Portfolio" [ref=e117] [cursor=pointer]:
              - /url: /portfolio
            - link "Auctions" [ref=e123] [cursor=pointer]:
              - /url: /auction
            - link "Stables" [ref=e132] [cursor=pointer]:
              - /url: /npc-stables
            - link "Rival Careers" [ref=e137] [cursor=pointer]:
              - /url: /npc-stables/rival-careers
        - button "Configuration" [ref=e142]
      - generic [ref=e146]:
        - generic [ref=e147]:
          - paragraph [ref=e148]: Cash
          - paragraph [ref=e149]: $100,000
          - paragraph [ref=e150]: 2888 horses
          - generic [ref=e151]:
            - button "Advance 1 day" [ref=e152]
            - button "Advance 1 week" [ref=e153]: 7d
            - button "Advance 1 month" [ref=e154]: 30d
            - button "AutoSim settings" [ref=e155]
          - generic [ref=e156]:
            - button "Skip to next auction" [ref=e157]: Next Auction
            - button "Skip to next race" [ref=e158]: Next Race
        - button "Start new game" [ref=e159]
    - main [ref=e160]:
      - generic [ref=e162]:
        - generic [ref=e163]:
          - generic [ref=e164]:
            - generic [ref=e165]: Horse Market
            - heading "The Horse Market" [level=1] [ref=e170]
            - generic [ref=e171]: "Available Units: 5"
          - generic [ref=e173]:
            - generic [ref=e174]: Available Capital
            - generic [ref=e175]: $100,000
        - generic [ref=e176]:
          - tablist [ref=e178]:
            - tab "Direct Bloodstock" [ref=e179]
            - tab "Auction Houses" [selected] [ref=e182]
            - tab "Exchange" [ref=e189]
            - tab "Fractional Syndicates" [ref=e193]
            - tab "Alerts" [ref=e197]
            - tab "Strategy" [ref=e201]
          - tabpanel "Auction Houses" [ref=e206]:
            - generic [ref=e207]:
              - generic [ref=e208]:
                - button "Crownhill USA · Prestige 94" [pressed] [ref=e209]:
                  - generic [ref=e210]: Crownhill
                  - generic [ref=e211]: USA · Prestige 94
                - button "Tattersleigh Great Britain · Prestige 88" [ref=e212]:
                  - generic [ref=e213]: Tattersleigh
                  - generic [ref=e214]: Great Britain · Prestige 88
                - button "Avoncourt Ireland · Prestige 76" [ref=e215]:
                  - generic [ref=e216]: Avoncourt
                  - generic [ref=e217]: Ireland · Prestige 76
                - button "Marchetti France · Prestige 61" [ref=e218]:
                  - generic [ref=e219]: Marchetti
                  - generic [ref=e220]: France · Prestige 61
                - button "Southern Cross Australia · Prestige 54" [ref=e221]:
                  - generic [ref=e222]: Southern Cross
                  - generic [ref=e223]: Australia · Prestige 54
                - button "Drover Yard USA · Prestige 28" [ref=e224]:
                  - generic [ref=e225]: Drover Yard
                  - generic [ref=e226]: USA · Prestige 28
              - generic [ref=e227]:
                - generic [ref=e228]: Your standing
                - generic [ref=e229]: Unranked
                - generic [ref=e230]: Net proceeds -20% · buying and selling well lifts it
              - generic [ref=e232]:
                - heading "Crownhill Bloodstock" [level=2] [ref=e240]
                - paragraph [ref=e241]: The blue-chip pavilion. Seven-figure yearlings and a bench that never blinks.
                - generic [ref=e242]:
                  - generic [ref=e243]: Prestige 94
                  - generic [ref=e244]:
                    - text: Commission
                    - generic [ref=e245]: 6.0%
                  - generic [ref=e246]: Your capital $100,000
              - generic [ref=e248]:
                - generic [ref=e249]:
                  - generic [ref=e250]:
                    - generic [ref=e251]: Bloodstock Price Index — last 30 days
                    - generic [ref=e254]: —
                  - generic [ref=e256]:
                    - generic [ref=e257]:
                      - generic [ref=e258]: Trades
                      - generic [ref=e259]: "0"
                    - generic [ref=e260]:
                      - generic [ref=e261]: Turnover
                      - generic [ref=e262]: $0
                - generic [ref=e263]: No trades settled yet — the index starts once horses change hands.
              - generic [ref=e264]:
                - heading "World rankings — last 12 months" [level=3] [ref=e265]
                - paragraph [ref=e272]: No races run yet this season.
              - generic [ref=e273]:
                - heading "On offer at Crownhill" [level=3] [ref=e274]
                - generic [ref=e279]:
                  - generic [ref=e280]:
                    - generic [ref=e281]:
                      - link "Louisiana Star" [ref=e282] [cursor=pointer]:
                        - /url: /stable/5409c9c4-d498-4f58-9837-1f79466191d2
                      - generic [ref=e283]: 3yo filly · Est. value $0
                    - generic [ref=e284]:
                      - generic [ref=e285]: Hammer
                      - generic [ref=e286]: $500
                    - generic [ref=e287]:
                      - generic [ref=e288]: You pay
                      - generic [ref=e289]: $530
                    - button "Buy" [ref=e290]
                  - generic [ref=e291]:
                    - generic [ref=e292]:
                      - link "Pride of Oaklawn" [ref=e293] [cursor=pointer]:
                        - /url: /stable/ce171dd4-7011-4f25-88e1-aac4521209e5
                      - generic [ref=e294]: 6yo colt · Est. value $0
                    - generic [ref=e295]:
                      - generic [ref=e296]: Hammer
                      - generic [ref=e297]: $500
                    - generic [ref=e298]:
                      - generic [ref=e299]: You pay
                      - generic [ref=e300]: $530
                    - button "Buy" [ref=e301]
                  - generic [ref=e302]:
                    - generic [ref=e303]:
                      - link "Monmouth Star" [ref=e304] [cursor=pointer]:
                        - /url: /stable/ad2d7959-f570-4f18-9f48-ed9457d8e39d
                      - generic [ref=e305]: 5yo colt · Est. value $0
                    - generic [ref=e306]:
                      - generic [ref=e307]: Hammer
                      - generic [ref=e308]: $500
                    - generic [ref=e309]:
                      - generic [ref=e310]: You pay
                      - generic [ref=e311]: $530
                    - button "Buy" [ref=e312]
                  - generic [ref=e313]:
                    - generic [ref=e314]:
                      - link "Sha Tin of Happy V" [ref=e315] [cursor=pointer]:
                        - /url: /stable/bb8aa125-6e1a-4d4d-aef9-591a253ff3be
                      - generic [ref=e316]: 2yo filly · Est. value $0
                    - generic [ref=e317]:
                      - generic [ref=e318]: Hammer
                      - generic [ref=e319]: $500
                    - generic [ref=e320]:
                      - generic [ref=e321]: You pay
                      - generic [ref=e322]: $530
                    - button "Buy" [ref=e323]
                  - generic [ref=e324]:
                    - generic [ref=e325]:
                      - link "Tampa Bay Arlingto" [ref=e326] [cursor=pointer]:
                        - /url: /stable/aa0ebb26-f602-4292-a37e-b862266447ff
                      - generic [ref=e327]: 3yo colt · Est. value $0
                    - generic [ref=e328]:
                      - generic [ref=e329]: Hammer
                      - generic [ref=e330]: $500
                    - generic [ref=e331]:
                      - generic [ref=e332]: You pay
                      - generic [ref=e333]: $530
                    - button "Buy" [ref=e334]
                  - generic [ref=e335]:
                    - generic [ref=e336]:
                      - link "Pride of Kempton P" [ref=e337] [cursor=pointer]:
                        - /url: /stable/d948c822-1cb1-4ade-9d40-9f34af823004
                      - generic [ref=e338]: 4yo filly · Est. value $0
                    - generic [ref=e339]:
                      - generic [ref=e340]: Hammer
                      - generic [ref=e341]: $500
                    - generic [ref=e342]:
                      - generic [ref=e343]: You pay
                      - generic [ref=e344]: $530
                    - button "Buy" [ref=e345]
              - generic [ref=e346]:
                - heading "Sell through Crownhill" [level=3] [ref=e347]
                - generic [ref=e351]:
                  - generic [ref=e352]:
                    - generic [ref=e353]:
                      - link "Northern Journey" [ref=e354] [cursor=pointer]:
                        - /url: /stable/fac2cbae-a8a4-4f44-861d-e90682f98cc6
                      - generic [ref=e355]: 3.830916886217892yo filly · Market $7,150
                    - generic [ref=e356]:
                      - generic [ref=e357]: Commission
                      - generic [ref=e358]: "-$523"
                    - generic [ref=e359]:
                      - generic [ref=e360]: You net
                      - generic [ref=e361]: $6,560
                    - button "Sell" [ref=e362]
                  - generic [ref=e363]:
                    - generic [ref=e364]:
                      - link "Golden Rider" [ref=e365] [cursor=pointer]:
                        - /url: /stable/f8733b18-3681-42d5-8ead-1a2e2956ea29
                      - generic [ref=e366]: 4.064583738334477yo filly · Market $6,900
                    - generic [ref=e367]:
                      - generic [ref=e368]: Commission
                      - generic [ref=e369]: "-$505"
                    - generic [ref=e370]:
                      - generic [ref=e371]: You net
                      - generic [ref=e372]: $6,330
                    - button "Sell" [ref=e373]
                  - generic [ref=e374]:
                    - generic [ref=e375]:
                      - link "Bandit of Lucky" [ref=e376] [cursor=pointer]:
                        - /url: /stable/55136b2b-e1d0-4654-a822-ce2b7194d293
                      - generic [ref=e377]: 4.280046281404793yo filly · Market $5,950
                    - generic [ref=e378]:
                      - generic [ref=e379]: Commission
                      - generic [ref=e380]: "-$436"
                    - generic [ref=e381]:
                      - generic [ref=e382]: You net
                      - generic [ref=e383]: $5,458
                    - button "Sell" [ref=e384]
                  - generic [ref=e385]:
                    - generic [ref=e386]:
                      - link "The Northern Hero" [ref=e387] [cursor=pointer]:
                        - /url: /stable/7f4627c9-1536-4e00-bf59-c2b384cf9168
                      - generic [ref=e388]: 4.359804345294833yo colt · Market $5,650
                    - generic [ref=e389]:
                      - generic [ref=e390]: Commission
                      - generic [ref=e391]: "-$414"
                    - generic [ref=e392]:
                      - generic [ref=e393]: You net
                      - generic [ref=e394]: $5,183
                    - button "Sell" [ref=e395]
              - generic [ref=e396]:
                - heading "Trade history" [level=3] [ref=e397]
                - paragraph [ref=e402]: No trades settled yet.
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
> 56 |       await expect(page).toHaveScreenshot(`${route.name}-desktop.png`, {
     |       ^ Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/market-desktop-chromium-linux.png, writing actual.
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
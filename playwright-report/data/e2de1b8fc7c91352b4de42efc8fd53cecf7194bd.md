# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> visual baselines — desktop >> calendar matches baseline
- Location: src/tests/e2e/visual.spec.ts:53:5

# Error details

```
Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/calendar-desktop-chromium-linux.png, writing actual.
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
            - link "Calendar" [ref=e78] [cursor=pointer]:
              - /url: /calendar
            - link "Records" [ref=e83] [cursor=pointer]:
              - /url: /records
            - link "Rankings History" [ref=e88] [cursor=pointer]:
              - /url: /rankings-history
            - link "Stable Rankings" [ref=e93] [cursor=pointer]:
              - /url: /stable-rankings
            - link "Almanac" [ref=e100] [cursor=pointer]:
              - /url: /almanac
            - link "Course Histories" [ref=e105] [cursor=pointer]:
              - /url: /track-history
            - link "Market" [ref=e110] [cursor=pointer]:
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
          - heading "Racing" [level=1] [ref=e164]
          - paragraph [ref=e165]: Race schedule, calendar, browser, and campaign scheduler
        - generic [ref=e166]:
          - tablist [ref=e167]:
            - tab "Race Center" [ref=e168]
            - tab "All Races" [ref=e171]
            - tab "Calendar" [selected] [ref=e174]
            - tab "Browser" [ref=e177]
            - tab "Scheduler" [ref=e181]
            - tab "Nominations" [ref=e186]
          - tabpanel "Calendar" [ref=e190]:
            - generic [ref=e191]:
              - generic [ref=e192]:
                - heading "Regional Racing Calendars" [level=2] [ref=e193]
                - paragraph [ref=e194]: Browse graded stakes races by region
              - generic [ref=e195]:
                - link "Canada Grade 1, 2, and 3 stakes races across Canada 4 tracks Triple Crown & Tiara" [ref=e196] [cursor=pointer]:
                  - /url: /calendar/canada
                  - generic [ref=e197]:
                    - generic [ref=e198]: Canada
                    - generic [ref=e202]:
                      - paragraph [ref=e203]: Grade 1, 2, and 3 stakes races across Canada
                      - generic [ref=e204]:
                        - generic [ref=e205]: 4 tracks
                        - generic [ref=e206]: Triple Crown & Tiara
                - link "USA Triple Crown and major graded stakes across America 15 tracks Triple Crown & Tiara" [ref=e207] [cursor=pointer]:
                  - /url: /calendar/usa
                  - generic [ref=e208]:
                    - generic [ref=e209]: USA
                    - generic [ref=e213]:
                      - paragraph [ref=e214]: Triple Crown and major graded stakes across America
                      - generic [ref=e215]:
                        - generic [ref=e216]: 15 tracks
                        - generic [ref=e217]: Triple Crown & Tiara
                - link "UK Classic races and prestigious stakes from Newmarket to Ascot 17 tracks Classics" [ref=e218] [cursor=pointer]:
                  - /url: /calendar/uk
                  - generic [ref=e219]:
                    - generic [ref=e220]: UK
                    - generic [ref=e224]:
                      - paragraph [ref=e225]: Classic races and prestigious stakes from Newmarket to Ascot
                      - generic [ref=e226]:
                        - generic [ref=e227]: 17 tracks
                        - generic [ref=e228]: Classics
                - link "Ireland Classic and graded stakes from the Curragh to Leopardstown 8 tracks Triple Crown" [ref=e229] [cursor=pointer]:
                  - /url: /calendar/ireland
                  - generic [ref=e230]:
                    - generic [ref=e231]: Ireland
                    - generic [ref=e235]:
                      - paragraph [ref=e236]: Classic and graded stakes from the Curragh to Leopardstown
                      - generic [ref=e237]:
                        - generic [ref=e238]: 8 tracks
                        - generic [ref=e239]: Triple Crown
                - link "France Prestigious stakes including the Prix de l'Arc de Triomphe 6 tracks Triple Crown" [ref=e240] [cursor=pointer]:
                  - /url: /calendar/france
                  - generic [ref=e241]:
                    - generic [ref=e242]: France
                    - generic [ref=e246]:
                      - paragraph [ref=e247]: Prestigious stakes including the Prix de l'Arc de Triomphe
                      - generic [ref=e248]:
                        - generic [ref=e249]: 6 tracks
                        - generic [ref=e250]: Triple Crown
                - link "Germany Grade stakes across Germany's historic racecourses 9 tracks Triple Crown" [ref=e251] [cursor=pointer]:
                  - /url: /calendar/germany
                  - generic [ref=e252]:
                    - generic [ref=e253]: Germany
                    - generic [ref=e257]:
                      - paragraph [ref=e258]: Grade stakes across Germany's historic racecourses
                      - generic [ref=e259]:
                        - generic [ref=e260]: 9 tracks
                        - generic [ref=e261]: Triple Crown
                - link "Scandinavia Grade stakes from Sweden, Norway, and Denmark 4 tracks" [ref=e262] [cursor=pointer]:
                  - /url: /calendar/scandinavia
                  - generic [ref=e263]:
                    - generic [ref=e264]: Scandinavia
                    - generic [ref=e268]:
                      - paragraph [ref=e269]: Grade stakes from Sweden, Norway, and Denmark
                      - generic [ref=e270]: 4 tracks
                - link "UAE Winter racing at Meydan and Abu Dhabi 3 tracks" [ref=e272] [cursor=pointer]:
                  - /url: /calendar/uae
                  - generic [ref=e273]:
                    - generic [ref=e274]: UAE
                    - generic [ref=e278]:
                      - paragraph [ref=e279]: Winter racing at Meydan and Abu Dhabi
                      - generic [ref=e280]: 3 tracks
                - link "Japan Major JRA and NAR graded stakes across Japan 25 tracks Triple Crown & Tiara" [ref=e282] [cursor=pointer]:
                  - /url: /calendar/japan
                  - generic [ref=e283]:
                    - generic [ref=e284]: Japan
                    - generic [ref=e288]:
                      - paragraph [ref=e289]: Major JRA and NAR graded stakes across Japan
                      - generic [ref=e290]:
                        - generic [ref=e291]: 25 tracks
                        - generic [ref=e292]: Triple Crown & Tiara
                - link "Hong Kong Premier racing at Sha Tin and Happy Valley 2 tracks Triple Crown" [ref=e293] [cursor=pointer]:
                  - /url: /calendar/hong-kong
                  - generic [ref=e294]:
                    - generic [ref=e295]: Hong Kong
                    - generic [ref=e299]:
                      - paragraph [ref=e300]: Premier racing at Sha Tin and Happy Valley
                      - generic [ref=e301]:
                        - generic [ref=e302]: 2 tracks
                        - generic [ref=e303]: Triple Crown
                - link "Australia Major stakes including the Melbourne Cup carnival 7 tracks Triple Crown" [ref=e304] [cursor=pointer]:
                  - /url: /calendar/australia
                  - generic [ref=e305]:
                    - generic [ref=e306]: Australia
                    - generic [ref=e310]:
                      - paragraph [ref=e311]: Major stakes including the Melbourne Cup carnival
                      - generic [ref=e312]:
                        - generic [ref=e313]: 7 tracks
                        - generic [ref=e314]: Triple Crown
                - link "South America Graded stakes from Argentina, Brazil, and Chile 8 tracks Triple Crown & Tiara" [ref=e315] [cursor=pointer]:
                  - /url: /calendar/south-america
                  - generic [ref=e316]:
                    - generic [ref=e317]: South America
                    - generic [ref=e321]:
                      - paragraph [ref=e322]: Graded stakes from Argentina, Brazil, and Chile
                      - generic [ref=e323]:
                        - generic [ref=e324]: 8 tracks
                        - generic [ref=e325]: Triple Crown & Tiara
                - link "Italy Historic stakes at Capannelle and San Siro 2 tracks Triple Crown" [ref=e326] [cursor=pointer]:
                  - /url: /calendar/italy
                  - generic [ref=e327]:
                    - generic [ref=e328]: Italy
                    - generic [ref=e332]:
                      - paragraph [ref=e333]: Historic stakes at Capannelle and San Siro
                      - generic [ref=e334]:
                        - generic [ref=e335]: 2 tracks
                        - generic [ref=e336]: Triple Crown
                - link "Spain Graded stakes across Spain's racecourses 3 tracks" [ref=e337] [cursor=pointer]:
                  - /url: /calendar/spain
                  - generic [ref=e338]:
                    - generic [ref=e339]: Spain
                    - generic [ref=e343]:
                      - paragraph [ref=e344]: Graded stakes across Spain's racecourses
                      - generic [ref=e345]: 3 tracks
                - link "Saudi Arabia Winter racing at King Abdulaziz Racecourse in Riyadh 1 tracks" [ref=e347] [cursor=pointer]:
                  - /url: /calendar/saudi-arabia
                  - generic [ref=e348]:
                    - generic [ref=e349]: Saudi Arabia
                    - generic [ref=e353]:
                      - paragraph [ref=e354]: Winter racing at King Abdulaziz Racecourse in Riyadh
                      - generic [ref=e355]: 1 tracks
                - link "Austria Flat racing across Austria's historic racecourses 4 tracks" [ref=e357] [cursor=pointer]:
                  - /url: /calendar/austria
                  - generic [ref=e358]:
                    - generic [ref=e359]: Austria
                    - generic [ref=e363]:
                      - paragraph [ref=e364]: Flat racing across Austria's historic racecourses
                      - generic [ref=e365]: 4 tracks
                - link "Belgium Flat racing in Ostend and Mons 2 tracks" [ref=e367] [cursor=pointer]:
                  - /url: /calendar/belgium
                  - generic [ref=e368]:
                    - generic [ref=e369]: Belgium
                    - generic [ref=e373]:
                      - paragraph [ref=e374]: Flat racing in Ostend and Mons
                      - generic [ref=e375]: 2 tracks
                - link "Czech Republic Flat racing across the Czech Republic 3 tracks" [ref=e377] [cursor=pointer]:
                  - /url: /calendar/czech-republic
                  - generic [ref=e378]:
                    - generic [ref=e379]: Czech Republic
                    - generic [ref=e383]:
                      - paragraph [ref=e384]: Flat racing across the Czech Republic
                      - generic [ref=e385]: 3 tracks
                - link "Hungary Flat racing at Kincsem Park, Budapest 1 tracks Triple Crown" [ref=e387] [cursor=pointer]:
                  - /url: /calendar/hungary
                  - generic [ref=e388]:
                    - generic [ref=e389]: Hungary
                    - generic [ref=e393]:
                      - paragraph [ref=e394]: Flat racing at Kincsem Park, Budapest
                      - generic [ref=e395]:
                        - generic [ref=e396]: 1 tracks
                        - generic [ref=e397]: Triple Crown
                - link "Turkey Flat racing at Veliefendi, Istanbul 1 tracks" [ref=e398] [cursor=pointer]:
                  - /url: /calendar/turkey
                  - generic [ref=e399]:
                    - generic [ref=e400]: Turkey
                    - generic [ref=e404]:
                      - paragraph [ref=e405]: Flat racing at Veliefendi, Istanbul
                      - generic [ref=e406]: 1 tracks
                - link "Singapore Flat racing at Kranji 1 tracks" [ref=e408] [cursor=pointer]:
                  - /url: /calendar/singapore
                  - generic [ref=e409]:
                    - generic [ref=e410]: Singapore
                    - generic [ref=e414]:
                      - paragraph [ref=e415]: Flat racing at Kranji
                      - generic [ref=e416]: 1 tracks
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
     |       ^ Error: A snapshot doesn't exist at /app/src/tests/e2e/visual.spec.ts-snapshots/calendar-desktop-chromium-linux.png, writing actual.
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